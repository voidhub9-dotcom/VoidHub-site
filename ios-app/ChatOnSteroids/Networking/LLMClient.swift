import Foundation

/// The chat surface every provider has to supply. The view model talks to this and
/// never learns which wire format is underneath.
protocol LLMClient {
    func stream(model: String, systemPrompt: String, history: [Message]) -> AsyncThrowingStream<String, Error>
    func complete(model: String, systemPrompt: String, history: [Message]) async throws -> String
    func availableModels() async throws -> [ModelInfo]
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
