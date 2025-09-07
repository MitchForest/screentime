import AppKit
import SwiftUI
import UniformTypeIdentifiers

@MainActor
final class CaptureManager: ObservableObject {
    @Published var isRunning: Bool = false

    private var timer: Timer?
    private var lastHash: String?
    private var sessionId: String = ULID.generate()

    @AppStorage("baseUrl") private var baseUrl: String = "http://localhost:8787"
    @AppStorage("apiKey") private var apiKey: String = ""
    @AppStorage("intervalSeconds") private var intervalSeconds: Double = 20

    func start() {
        if isRunning { return }
        isRunning = true
        sessionId = ULID.generate()
        schedule()
        Task { await sendSessionStart() }
    }

    func stop() {
        isRunning = false
        timer?.invalidate()
        timer = nil
        Task { await sendSessionEnd() }
    }

    private func schedule() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: intervalSeconds, repeats: true) { [weak self] _ in
            Task { await self?.captureAndUpload() }
        }
        // Trigger first immediately
        Task { await captureAndUpload() }
    }

    func sendTelemetrySnapshot() async {
        let app = NSWorkspace.shared.frontmostApplication?.localizedName
        let event = TelemetryEvent.contextUpdate(sessionId: sessionId, activeApp: app, url: nil, windowTitle: nil)
        _ = try? await Networking.shared.postJson(baseUrl: baseUrl, apiKey: apiKey, path: "/v1/events", body: event)
    }

    private func sendSessionStart() async {
        let now = ISO8601DateFormatter().string(from: Date())
        let event = TelemetryEvent.sessionStart(sessionId: sessionId, studentId: ULID.generate(), startedAt: now)
        _ = try? await Networking.shared.postJson(baseUrl: baseUrl, apiKey: apiKey, path: "/v1/events", body: event)
    }

    private func sendSessionEnd() async {
        let now = ISO8601DateFormatter().string(from: Date())
        let event = TelemetryEvent.sessionEnd(sessionId: sessionId, endedAt: now)
        _ = try? await Networking.shared.postJson(baseUrl: baseUrl, apiKey: apiKey, path: "/v1/events", body: event)
    }

    private func captureAndUpload() async {
        guard isRunning else { return }
        guard let cgImage = CGDisplayCreateImage(CGMainDisplayID()) else { return }
        // Downscale to max 1024 px long edge
        let target = downscale(image: cgImage, maxLongEdge: 1024)
        guard let data = jpegData(from: target, quality: 0.8) else { return }
        // Deduplicate via average hash
        let hash = ImageHash.averageHash(of: target)
        if let last = lastHash, ImageHash.hammingDistance(hash, last) <= 2 {
            // very similar, skip
            return
        }
        lastHash = hash

        do {
            // Sign upload
            struct SignReq: Codable { let contentType: String }
            struct SignRes: Codable {
                let putUrl: String
                let getUrl: String
                let headers: [String:String]
            }
            let sign: SignRes = try await Networking.shared.postJson(baseUrl: baseUrl, apiKey: apiKey, path: "/api/uploads/sign", body: SignReq(contentType: "image/jpeg"))
            // Upload
            try await Networking.shared.put(url: sign.putUrl, body: data, headers: sign.headers)
            // Trigger model via backend proxy
            let app = NSWorkspace.shared.frontmostApplication?.localizedName
            struct ProxyReq: Codable { let image_url: String; let telemetry: [String:String?]; let session: [String:String] }
            let session: [String:String] = [
                "session_id": sessionId,
                "student_id": "mac_user",
                "started_at": ISO8601DateFormatter().string(from: Date()),
                "device": "mac",
            ]
            let telemetry: [String:String?] = [
                "active_app": app,
            ]
            let _: [String:String] = try await Networking.shared.postJson(baseUrl: baseUrl, apiKey: apiKey, path: "/v1/responses/proxy", body: ProxyReq(image_url: sign.getUrl, telemetry: telemetry, session: session))
        } catch {
            // silently ignore for now; add UI later
        }
    }
}

// MARK: - Imaging utils

func downscale(image: CGImage, maxLongEdge: CGFloat) -> CGImage {
    let w = CGFloat(image.width)
    let h = CGFloat(image.height)
    let scale = min(1.0, maxLongEdge / max(w, h))
    let newW = Int(w * scale)
    let newH = Int(h * scale)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(data: nil, width: newW, height: newH, bitsPerComponent: 8, bytesPerRow: newW * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = .medium
    ctx.draw(image, in: CGRect(x: 0, y: 0, width: newW, height: newH))
    return ctx.makeImage()!
}

func jpegData(from image: CGImage, quality: CGFloat) -> Data? {
    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
    CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality as CIImageDestinationOption: quality] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { return nil }
    return data as Data
}
