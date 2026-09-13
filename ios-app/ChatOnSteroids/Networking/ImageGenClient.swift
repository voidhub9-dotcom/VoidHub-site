import Foundation

/// Wire types for the OpenAI-compatible `/images/generations` endpoint — a
/// different request/response shape from chat completion, not a variant of it.
enum ImageWire {
    struct GenerationRequest: Encodable {
        let model: String
        let prompt: String
        let n: Int
        let size: String
    }

    struct GenerationResponse: Decodable {
        struct Entry: Decodable {
            /// Providers return either inline base64 or a URL to fetch; never both.
            let b64_json: String?
            let url: String?
        }

        let data: [Entry]?
    }
}

/// Generates an image from a prompt and hands back a ready-to-attach `Attachment`.
/// Stateless like the chat clients, and deliberately its own type rather than a
/// method on `ChatClient` — the request and response shapes share nothing with
/// chat completion beyond both being JSON over HTTPS.
struct ImageGenClient {
    let settings: AppSettings
    let apiKey: String

    func generate(prompt: String, model: String) async throws -> Attachment {
        if settings.requireAPIKey {
            guard !apiKey.isEmpty else { throw APIError.missingKey }
        }
        guard let url = settings.requestURL(defaultPath: "/images/generations") else {
            throw APIError.badURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !apiKey.isEmpty && !settings.applyAuthOverride(apiKey: apiKey, to: &request) {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        settings.applyExtraHeaders(to: &request)

        let body = ImageWire.GenerationRequest(model: model, prompt: prompt, n: 1, size: "1024x1024")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("The provider sent a response the app could not read.")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(status: http.statusCode, message: Wire.ErrorEnvelope.message(from: data))
        }

        let decoded = try JSONDecoder().decode(ImageWire.GenerationResponse.self, from: data)
        guard let entry = decoded.data?.first else { throw APIError.emptyResponse }

        if let base64 = entry.b64_json, !base64.isEmpty {
            guard let raw = Data(base64Encoded: base64) else { throw APIError.emptyResponse }
            return Attachment(
                kind: .image,
                name: "generated.png",
                mimeType: "image/png",
                payload: base64,
                byteCount: raw.count
            )
        }

        if let urlString = entry.url, let imageURL = URL(string: urlString) {
            return try await downloadImage(from: imageURL)
        }

        throw APIError.emptyResponse
    }

    /// Some providers hand back a signed URL instead of inline bytes; the image
    /// still has to end up as base64 in the message, since `Attachment` has no
    /// remote-URL representation for the transcript to render against later.
    private func downloadImage(from url: URL) async throws -> Attachment {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.transport("Could not download the generated image.")
        }
        return Attachment(
            kind: .image,
            name: "generated.png",
            mimeType: http.mimeType ?? "image/png",
            payload: data.base64EncodedString(),
            byteCount: data.count
        )
    }
}
