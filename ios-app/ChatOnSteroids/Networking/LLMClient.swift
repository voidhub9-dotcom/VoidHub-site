import Foundation

/// The chat surface every provider has to supply. The view model talks to this and
/// never learns which wire format is underneath.
protocol LLMClient {
    func stream(model: String, systemPrompt: String, history: [Message]) -> AsyncThrowingStream<String, Error>
    func complete(model: String, systemPrompt: String, history: [Message]) async throws -> String
    func availableModels() async throws -> [ModelInfo]

    /// Confirms the endpoint and credentials actually work, returning a short
    /// description of what answered.
    ///
    /// Listing models is the cheap check, but plenty of gateways proxy only the
    /// chat endpoint and answer a model listing with 404 or 405. That is not a
    /// broken configuration, so a failed listing falls through to sending one tiny
    /// message — the thing the user actually cares about.
    func probe(model: String) async throws -> String
}

extension LLMClient {
    /// Shared two-step probe: list models, and if that route is missing or refuses
    /// the method, send a one-token message instead.
    func defaultProbe(model: String) async throws -> String {
        do {
            let models = try await availableModels()
            if !models.isEmpty {
                return "\(models.count) models"
            }
        } catch let error as APIError {
            // 404/405 mean "no listing here", which says nothing about chat. Any
            // other failure (401, DNS, TLS) is real and worth reporting as-is.
            guard case .http(let status, _) = error, status == 404 || status == 405 else {
                throw error
            }
        }

        _ = try await complete(
            model: model,
            systemPrompt: "",
            history: [Message.user("Reply with the single word: ok")]
        )
        return "chat endpoint OK"
    }
}

enum ClientFactory {
    static func make(settings: AppSettings, apiKey: String) -> LLMClient {
        switch settings.provider {
        case .openAICompatible:
            return ChatClient(settings: settings, apiKey: apiKey)
        case .anthropic:
            return AnthropicClient(settings: settings, apiKey: apiKey)
        }
    }
}

/// Shared plumbing: both providers stream Server-Sent Events and both report
/// failures as a JSON body with an `error.message`, so the framing lives here.
enum SSE {
    static let maxErrorBodyBytes = 8 * 1024

    /// Extracts the JSON payload of one `data:` line, or nil for anything else
    /// (comments, `event:` lines, blank separators, keep-alives).
    static func payload(of line: String) -> String? {
        guard line.hasPrefix("data:") else { return nil }
        let value = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
        return value.isEmpty ? nil : value
    }

    static func errorMessage(from bytes: URLSession.AsyncBytes) async throws -> String? {
        var data = Data()
        for try await byte in bytes {
            data.append(byte)
            if data.count >= maxErrorBodyBytes { break }
        }
        return Wire.ErrorEnvelope.message(from: data)
    }
}
