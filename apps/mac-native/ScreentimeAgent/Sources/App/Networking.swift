import Foundation

actor Networking {
    static let shared = Networking()

    func postJson<T: Codable, R: Codable>(baseUrl: String, apiKey: String?, path: String, body: T) async throws -> R {
        guard let url = URL(string: baseUrl + path) else { throw URLError(.badURL) }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let key = apiKey, !key.isEmpty {
            req.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try JSONEncoder().encode(body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(R.self, from: data)
    }

    func put(url: String, body: Data, headers: [String:String]) async throws {
        guard let u = URL(string: url) else { throw URLError(.badURL) }
        var req = URLRequest(url: u)
        req.httpMethod = "PUT"
        for (k,v) in headers { req.setValue(v, forHTTPHeaderField: k) }
        let (_, resp) = try await URLSession.shared.upload(for: req, from: body)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.cannotWriteToFile)
        }
    }
}

// MARK: Telemetry payloads

enum TelemetryEvent: Codable {
    case sessionStart(sessionId: String, studentId: String, startedAt: String)
    case sessionEnd(sessionId: String, endedAt: String)
    case contextUpdate(sessionId: String, activeApp: String?, url: String?, windowTitle: String?)

    enum CodingKeys: String, CodingKey { case type, session_id, student_id, started_at, ended_at, at, active_app, url, window_title }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .sessionStart(let sessionId, let studentId, let startedAt):
            try container.encode("session.start", forKey: .type)
            try container.encode(sessionId, forKey: .session_id)
            try container.encode(studentId, forKey: .student_id)
            try container.encode(startedAt, forKey: .started_at)
        case .sessionEnd(let sessionId, let endedAt):
            try container.encode("session.end", forKey: .type)
            try container.encode(sessionId, forKey: .session_id)
            try container.encode(endedAt, forKey: .ended_at)
        case .contextUpdate(let sessionId, let app, let url, let title):
            try container.encode("context.update", forKey: .type)
            try container.encode(sessionId, forKey: .session_id)
            try container.encode(ISO8601DateFormatter().string(from: Date()), forKey: .at)
            if let app { try container.encode(app, forKey: .active_app) }
            if let url { try container.encode(url, forKey: .url) }
            if let title { try container.encode(title, forKey: .window_title) }
        }
    }
}

