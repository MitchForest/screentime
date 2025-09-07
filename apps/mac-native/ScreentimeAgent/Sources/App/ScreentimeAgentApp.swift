import SwiftUI

@main
struct ScreentimeAgentApp: App {
    @StateObject private var capture = CaptureManager()

    var body: some Scene {
        MenuBarExtra("Screentime", systemImage: "eye") {
            VStack(alignment: .leading, spacing: 8) {
                if capture.isRunning {
                    Text("Status: Recording")
                        .foregroundStyle(.green)
                } else {
                    Text("Status: Idle")
                        .foregroundStyle(.secondary)
                }
                Divider()
                Button(capture.isRunning ? "Stop" : "Start") {
                    if capture.isRunning { capture.stop() } else { capture.start() }
                }.keyboardShortcut(.defaultAction)
                Button("Send Test Telemetry") {
                    Task { await capture.sendTelemetrySnapshot() }
                }
                Divider()
                SettingsLink()
                Divider()
                Button("Quit") { NSApp.terminate(nil) }
            }
            .padding(8)
            .frame(width: 220)
        }

        Settings {
            SettingsView()
                .environmentObject(capture)
        }
    }
}

struct SettingsView: View {
    @AppStorage("baseUrl") private var baseUrl: String = "http://localhost:8787"
    @AppStorage("apiKey") private var apiKey: String = ""
    @AppStorage("intervalSeconds") private var intervalSeconds: Double = 20

    var body: some View {
        Form {
            TextField("Backend Base URL", text: $baseUrl)
            TextField("Edge API Key (optional)", text: $apiKey)
            HStack {
                Text("Interval (sec)")
                Spacer()
                Slider(value: $intervalSeconds, in: 10...60, step: 5)
                Text("\(Int(intervalSeconds))")
            }
            Text("Frames will be downscaled and deduplicated by hash.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(width: 420)
    }
}

