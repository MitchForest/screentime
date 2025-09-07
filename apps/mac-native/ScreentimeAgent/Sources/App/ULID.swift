import Foundation

enum ULID {
    // Crockford base32
    private static let alphabet = Array("0123456789ABCDEFGHJKMNPQRSTVWXYZ")

    static func generate() -> String {
        var time = UInt64(Date().timeIntervalSince1970 * 1000)
        var random = (0..<10).map { _ in UInt8.random(in: 0...255) }
        var bytes = [UInt8](repeating: 0, count: 16)
        // 48-bit time (first 6 bytes)
        for i in (0..<6).reversed() {
            bytes[i] = UInt8(time & 0xff)
            time >>= 8
        }
        // 80-bit randomness (remaining 10 bytes)
        for i in 0..<10 { bytes[6 + i] = random[i] }
        return encodeBase32(bytes)
    }

    private static func encodeBase32(_ bytes: [UInt8]) -> String {
        var output = ""
        var buffer: UInt32 = 0
        var bitsLeft: Int = 0

        for b in bytes {
            buffer = (buffer << 8) | UInt32(b)
            bitsLeft += 8
            while bitsLeft >= 5 {
                let index = Int((buffer >> UInt32(bitsLeft - 5)) & 0x1F)
                output.append(alphabet[index])
                bitsLeft -= 5
            }
        }
        if bitsLeft > 0 {
            let index = Int((buffer << UInt32(5 - bitsLeft)) & 0x1F)
            output.append(alphabet[index])
        }
        // ULID should be 26 chars; pad if short
        while output.count < 26 { output.append("0") }
        return String(output.prefix(26))
    }
}

