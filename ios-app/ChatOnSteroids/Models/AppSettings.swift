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

    // MARK: - Custom endpoint

    /// Non-empty overrides the provider's default request path — the one thing
    /// that lets a server which doesn't use exactly "/chat/completions" or
    /// "/v1/messages" be reached at all without new Swift code.
    var customPath: String = ""
    /// Non-empty replaces the provider's normal auth header entirely: any header
    /// name, with any prefix in front of the key. Covers `api-key: <key>`
    /// (Azure), a bespoke header name, or a prefix other than "Bearer ".
    var authHeaderName: String = ""
    var authValuePrefix: String = ""
    /// Sent on every request to this endpoint on top of whatever auth header is
    /// resolved above — an org id, a version pin, a routing header, anything a
    /// specific server wants that isn't a credential.
    var extraHeaders: [CustomHeader] = []
    /// Appended to the request URL's query string on every request, e.g. Azure
    /// OpenAI's required `api-version`.
    var extraQueryItems: [CustomHeader] = []
    /// Off for a local, unauthenticated server (Ollama, LM Studio, llama.cpp)
    /// where there is no key to send at all.
    var requireAPIKey: Bool = true

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

        customPath = try container.decodeIfPresent(String.self, forKey: .customPath) ?? fallback.customPath
        authHeaderName = try container.decodeIfPresent(String.self, forKey: .authHeaderName) ?? fallback.authHeaderName
        authValuePrefix = try container.decodeIfPresent(String.self, forKey: .authValuePrefix) ?? fallback.authValuePrefix
        extraHeaders = try container.decodeIfPresent([CustomHeader].self, forKey: .extraHeaders) ?? fallback.extraHeaders
        extraQueryItems = try container.decodeIfPresent([CustomHeader].self, forKey: .extraQueryItems) ?? fallback.extraQueryItems
        requireAPIKey = try container.decodeIfPresent(Bool.self, forKey: .requireAPIKey) ?? fallback.requireAPIKey
    }

    var normalizedBaseURL: String {
        var trimmed = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while trimmed.hasSuffix("/") { trimmed.removeLast() }
        return trimmed
    }

    // MARK: - Request URL

    /// Builds a request URL for `defaultPath`, always appending any configured
    /// query items. `applyPathOverride` is only meaningful for the chat/completion
    /// endpoint — the one the custom path setting exists to redirect; the model
    /// listing endpoint keeps its own default path even when it's set, since the
    /// override isn't a models-list URL.
    func requestURL(defaultPath: String, applyPathOverride: Bool = false) -> URL? {
        let path: String
        if applyPathOverride {
            let overridden = customPath.trimmingCharacters(in: .whitespacesAndNewlines)
            path = overridden.isEmpty ? defaultPath : (overridden.hasPrefix("/") ? overridden : "/\(overridden)")
        } else {
            path = defaultPath
        }
        guard var components = URLComponents(string: normalizedBaseURL + path) else { return nil }
        let items = extraQueryItems.compactMap { item -> URLQueryItem? in
            let name = item.name.trimmingCharacters(in: .whitespacesAndNewlines)
            return name.isEmpty ? nil : URLQueryItem(name: name, value: item.value)
        }
        if !items.isEmpty {
            components.queryItems = (components.queryItems ?? []) + items
        }
        return components.url
    }

    /// True once a header name is set to replace the provider's own auth scheme.
    var hasAuthOverride: Bool {
        !authHeaderName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Applies the auth override, when one is configured. Providers that need
    /// their own scheme when no override is set (Anthropic's x-api-key/Bearer
    /// heuristic) apply that separately and call this first.
    func applyAuthOverride(apiKey: String, to request: inout URLRequest) -> Bool {
        guard hasAuthOverride else { return false }
        let name = authHeaderName.trimmingCharacters(in: .whitespacesAndNewlines)
        request.setValue(authValuePrefix + apiKey, forHTTPHeaderField: name)
        return true
    }

    /// Applied last, so a header configured here always wins over anything a
    /// client set as a built-in default (including its own auth header, if the
    /// user pointed a custom header at the same name).
    func applyExtraHeaders(to request: inout URLRequest) {
        for header in extraHeaders {
            let name = header.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !name.isEmpty else { continue }
            request.setValue(header.value, forHTTPHeaderField: name)
        }
    }

    // MARK: - Shared

    var modelsURL: URL? {
        switch provider {
        case .openAICompatible:
            return requestURL(defaultPath: "/models")
        case .anthropic:
            return requestURL(defaultPath: "/v1/models")
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
