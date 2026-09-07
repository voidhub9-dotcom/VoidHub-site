import Foundation

struct AppSettings: Codable, Sendable, Equatable {
    /// Any OpenAI-compatible endpoint. OpenRouter by default, the same choice the
    /// desktop app offers for its API path.
    var baseURL: String = "https://openrouter.ai/api/v1"
    var defaultModel: String = "openai/gpt-4o-mini"
    var systemPrompt: String = "You are a concise, technically precise assistant. Prefer working code over prose."
    var temperature: Double = 0.7
    var maxTokens: Int = 0
    /// Local token budget the context meter measures against. An estimate, not the
    /// provider's own counter — the same caveat the desktop app makes.
    var contextLimit: Int = 128_000
    var streamResponses: Bool = true
    var sendOnReturn: Bool = false
    var historyRetentionDays: Int = 0

    var normalizedBaseURL: String {
        var trimmed = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while trimmed.hasSuffix("/") { trimmed.removeLast() }
        return trimmed
    }

    var chatCompletionsURL: URL? {
        URL(string: normalizedBaseURL + "/chat/completions")
    }

    var modelsURL: URL? {
        URL(string: normalizedBaseURL + "/models")
    }

    var isOpenRouter: Bool {
        normalizedBaseURL.contains("openrouter.ai")
    }
}
