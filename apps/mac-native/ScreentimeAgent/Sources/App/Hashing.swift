import CoreGraphics

enum ImageHash {
    // Simple average hash (aHash) over 8x8 grayscale
    static func averageHash(of image: CGImage) -> String {
        let width = 8, height = 8
        let colorSpace = CGColorSpaceCreateDeviceGray()
        let bytesPerRow = width
        var pixels = [UInt8](repeating: 0, count: width * height)
        let ctx = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8, bytesPerRow: bytesPerRow, space: colorSpace, bitmapInfo: CGImageAlphaInfo.none.rawValue)!
        ctx.interpolationQuality = .none
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        let avg = pixels.reduce(0, { $0 + Int($1) }) / (width * height)
        var bits: UInt64 = 0
        for (i,p) in pixels.enumerated() {
            if Int(p) >= avg { bits |= (1 << UInt64(63 - i)) }
        }
        return String(format: "%016llx", bits)
    }

    static func hammingDistance(_ a: String, _ b: String) -> Int {
        guard let va = UInt64(a, radix: 16), let vb = UInt64(b, radix: 16) else { return Int.max }
        return (va ^ vb).nonzeroBitCount
    }
}

