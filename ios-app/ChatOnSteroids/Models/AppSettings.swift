import Foundation

/// Which wire protocol the configured endpoint speaks. They are not
/// interchangeable: different paths, different auth headers, different response
/// shapes, different streaming events.
enum ProviderKind: String, Codable, Sendable, CaseIterable, Identifiable {
    case openAICompatible
    case anthropic

    var id: String { rawValue }

    var label: String {
        switch self {
        case .openAICompatible: return "OpenAI-compatible"
        case .anthropic: return "Anthropic"
        }
    }

    var detail: String {
        switch self {
        case .openAICompatible: return "OpenRouter, OpenAI, or any server exposing /chat/completions."
        case .anthropic: return "api.anthropic.com or a gateway that speaks /v1/messages."
        }
    }

    var defaultBaseURL: String {
        switch self {
        case .openAICompatible: return "https://openrouter.ai/api/v1"
        case .anthropic: return "https://api.anthropic.com"
        }
    }

    var defaultModel: String {
        switch self {
        case .openAICompatible: return "openai/gpt-4o-mini"
        case .anthropic: return "claude-opus-5"
        }
    }
}

/// How the key is presented to an Anthropic-shaped endpoint. First-party keys use
/// `x-api-key`; gateways that front the API usually want a bearer token instead
/// (that is what `ANTHROPIC_AUTH_TOKEN` sets in Anthropic's own tooling).
enum AnthropicAuthStyle: String, Codable, Sendable, CaseIterable, Identifiable {
    case automatic
    case apiKeyHeader
    case bearer

    var id: String { rawValue }

    var label: String {
        switch self {
        case .automatic: return "Automatic"
        case .apiKeyHeader: return "x-api-key"
        case .bearer: return "Bearer token"
        }
    }
}

struct AppSettings: Codable, Sendable, Equatable {
    var provider: ProviderKind = .openAICompatible
    /// Any OpenAI-compatible endpoint, or an Anthropic-shaped one when the provider
    /// says so. OpenRouter by default, the same choice the desktop app offers.
    var baseURL: String = ProviderKind.openAICompatible.defaultBaseURL
    var defaultModel: String = ProviderKind.openAICompatible.defaultModel
    var anthropicAuthStyle: AnthropicAuthStyle = .automatic
    var systemPrompt: String = "You are a concise, technically precise assistant. Prefer working code over prose."
    var temperature: Double = 0.7
    var maxTokens: Int = 0
    /// Local token budget the context meter measures against. An estimate, not the
    /// provider's own counter — the same caveat the desktop app makes.
    var contextLimit: Int = 128_000
    var streamResponses: Bool = true
    var sendOnReturn: Bool = false
    var historyRetentionDays: Int = 0

    // MARK: - Appearance

    var theme: AppTheme = .system
    var accent: AccentPalette = .violet
    var bubbleStyle: BubbleStyle = .glass
    var fontScale: FontScale = .standard
    /// Turns off the aurora wash and every translucent surface at once.
    var glassEffects: Bool = true
    var animatedBackground: Bool = true

    // MARK: - Behaviour

    var hapticsEnabled: Bool = true
    var showMessageTokens: Bool = false
    var showTimestamps: Bool = false
    var starterPromptsEnabled: Bool = true

    init() {}

    /// Decoded field by field so a settings file written by an older build — which
    /// has none of the newer keys — loads with defaults instead of failing outright
    /// and silently resetting everything the user had configured.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let fallback = AppSettings()

        provider = try container.decodeIfPresent(ProviderKind.self, forKey: .provider) ?? fallback.provider
        baseURL = try container.decodeIfPresent(String.self, forKey: .baseURL) ?? fallback.baseURL
        defaultModel = try container.decodeIfPresent(String.self, forKey: .defaultModel) ?? fallback.defaultModel
        anthropicAuthStyle = try container.decodeIfPresent(AnthropicAuthStyle.self, forKey: .anthropicAuthStyle) ?? fallback.anthropicAuthStyle
        systemPrompt = try container.decodeIfPresent(String.self, forKey: .systemPrompt) ?? fallback.systemPrompt
        temperature = try container.decodeIfPresent(Double.self, forKey: .temperature) ?? fallback.temperature
        maxTokens = try container.decodeIfPresent(Int.self, forKey: .maxTokens) ?? fallback.maxTokens
        contextLimit = try container.decodeIfPresent(Int.self, forKey: .contextLimit) ?? fallback.contextLimit
        streamResponses = try container.decodeIfPresent(Bool.self, forKey: .streamResponses) ?? fallback.streamResponses
        sendOnReturn = try container.decodeIfPresent(Bool.self, forKey: .sendOnReturn) ?? fallback.sendOnReturn
        historyRetentionDays = try container.decodeIfPresent(Int.self, forKey: .historyRetentionDays) ?? fallback.historyRetentionDays

        theme = try container.decodeIfPresent(AppTheme.self, forKey: .theme) ?? fallback.theme
        accent = try container.decodeIfPresent(AccentPalette.self, forKey: .accent) ?? fallback.accent
        bubbleStyle = try container.decodeIfPresent(BubbleStyle.self, forKey: .bubbleStyle) ?? fallback.bubbleStyle
        fontScale = try container.decodeIfPresent(FontScale.self, forKey: .fontScale) ?? fallback.fontScale
        glassEffects = try container.decodeIfPresent(Bool.self, forKey: .glassEffects) ?? fallback.glassEffects
        animatedBackground = try container.decodeIfPresent(Bool.self, forKey: .animatedBackground) ?? fallback.animatedBackground

        hapticsEnabled = try container.decodeIfPresent(Bool.self, forKey: .hapticsEnabled) ?? fallback.hapticsEnabled
        showMessageTokens = try container.decodeIfPresent(Bool.self, forKey: .showMessageTokens) ?? fallback.showMessageTokens
        showTimestamps = try container.decodeIfPresent(Bool.self, forKey: .showTimestamps) ?? fallback.showTimestamps
        starterPromptsEnabled = try container.decodeIfPresent(Bool.self, forKey: .starterPromptsEnabled) ?? fallback.starterPromptsEnabled
    }

    var normalizedBaseURL: String {
        var trimmed = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while trimmed.hasSuffix("/") { trimmed.removeLast() }
        return trimmed
    }

    // MARK: - OpenAI-compatible endpoints

    var chatCompletionsURL: URL? {
        URL(string: normalizedBaseURL + "/chat/completions")
    }

    // MARK: - Anthropic endpoints

    /// Anthropic's SDKs append `/v1/messages` to the configured base URL, so a
    /// gateway base such as `https://host/anthropic` resolves exactly as it does
    /// for Claude Code.
    var anthropicMessagesURL: URL? {
        URL(string: normalizedBaseURL + "/v1/messages")
    }

    // MARK: - Shared

    var modelsURL: URL? {
        switch provider {
        case .openAICompatible:
            return URL(string: normalizedBaseURL + "/models")
        case .anthropic:
            return URL(string: normalizedBaseURL + "/v1/models")
        }
    }

    var isOpenRouter: Bool {
        provider == .openAICompatible && normalizedBaseURL.contains("openrouter.ai")
    }

    /// Anthropic requires `max_tokens` on every request; there is no "provider
    /// default". This keeps answers long enough to be useful without pushing a
    /// non-streaming request into an HTTP timeout.
    var anthropicMaxTokens: Int {
        maxTokens > 0 ? maxTokens : 16_000
    }

    /// Switching provider moves the endpoint and model to that provider's defaults,
    /// but only when the current values are still the other provider's defaults —
    /// a URL the user typed themselves is never overwritten.
    mutating func switchProvider(to newProvider: ProviderKind) {
        guard newProvider != provider else { return }
        let old = provider
        if normalizedBaseURL == old.defaultBaseURL || normalizedBaseURL.isEmpty {
            baseURL = newProvider.defaultBaseURL
        }
        if defaultModel == old.defaultModel || defaultModel.isEmpty {
            defaultModel = newProvider.defaultModel
        }
        provider = newProvider
    }
}
