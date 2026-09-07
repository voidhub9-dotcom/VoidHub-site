import Foundation

/// Talks to Anthropic's Messages API, or to any gateway that fronts it — the base
/// URL is appended with `/v1/messages` exactly as Anthropic's own SDKs do, so a
/// gateway base configured for Claude Code resolves to the same endpoint here.
struct AnthropicClient: LLMClient {
    let settings: AppSettings
    let apiKey: String

    /// Required on every request; the API rejects calls without it.
    private static let apiVersion = "2023-06-01"

    // MARK: - Streaming

    func stream(
        model: String,
        systemPrompt: String,
        history: [Message]
    ) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let request = try buildRequest(
                        model: model,
                        systemPrompt: systemPrompt,
                        history: history,
                        stream: true
                    )
                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse else {
                        throw APIError.transport("The provider sent a response the app could not read.")
                    }
                    guard (200..<300).contains(http.statusCode) else {
                        let message = try await SSE.errorMessage(from: bytes)
                        throw APIError.http(status: http.statusCode, message: message)
                    }

                    var produced = false
                    for try await line in bytes.lines {
                        if Task.isCancelled { break }
                        guard let payload = SSE.payload(of: line),
                              let data = payload.data(using: .utf8),
                              let event = try? JSONDecoder().decode(AnthropicWire.StreamEvent.self, from: data)
                        else {
                            continue
                        }

                        // A stream can fail after a 200 has already been sent.
                        if event.type == "error" {
                            throw APIError.transport(event.error?.message ?? "The provider ended the stream with an error.")
                        }

                        guard event.type == "content_block_delta" else { continue }
                        // Thinking deltas share the event type; only text is displayable.
                        guard event.delta?.type == "text_delta" || event.delta?.type == nil else { continue }
                        if let piece = event.delta?.text, !piece.isEmpty {
                            produced = true
                            continuation.yield(piece)
                        }
                    }

                    if !produced && !Task.isCancelled {
                        throw APIError.emptyResponse
                    }
                    continuation.finish()
                } catch is CancellationError {
                    continuation.finish()
                } catch let error as URLError where error.code == .cancelled {
                    continuation.finish()
                } catch let error as APIError {
                    continuation.finish(throwing: error)
                } catch let error as URLError {
                    continuation.finish(throwing: APIError.transport(error.localizedDescription))
                } catch {
                    continuation.finish(throwing: APIError.transport(error.localizedDescription))
                }
            }

            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    // MARK: - Single shot

    func complete(model: String, systemPrompt: String, history: [Message]) async throws -> String {
        let request = try buildRequest(model: model, systemPrompt: systemPrompt, history: history, stream: false)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("The provider sent a response the app could not read.")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(status: http.statusCode, message: Wire.ErrorEnvelope.message(from: data))
        }

        let decoded = try JSONDecoder().decode(AnthropicWire.MessagesResponse.self, from: data)
        let text = (decoded.content ?? [])
            .filter { $0.type == "text" }
            .compactMap { $0.text }
            .joined()
        guard !text.isEmpty else { throw APIError.emptyResponse }
        return text
    }

    func probe(model: String) async throws -> String {
        try await defaultProbe(model: model)
    }

    // MARK: - Models

    /// Current Claude model IDs, offered when the endpoint has no model listing —
    /// which is the normal case for a gateway that only proxies `/v1/messages`.
    /// Whether a given gateway actually serves each of these is its own business;
    /// these are a starting point, not a promise.
    static let knownModels: [ModelInfo] = [
        ModelInfo(id: "claude-opus-5", name: "Claude Opus 5", contextLength: 1_000_000, promptPrice: nil, completionPrice: nil, supportsVision: true),
        ModelInfo(id: "claude-sonnet-5", name: "Claude Sonnet 5", contextLength: 1_000_000, promptPrice: nil, completionPrice: nil, supportsVision: true),
        ModelInfo(id: "claude-haiku-4-5", name: "Claude Haiku 4.5", contextLength: 200_000, promptPrice: nil, completionPrice: nil, supportsVision: true),
        ModelInfo(id: "claude-opus-4-8", name: "Claude Opus 4.8", contextLength: 1_000_000, promptPrice: nil, completionPrice: nil, supportsVision: true),
        ModelInfo(id: "claude-opus-4-7", name: "Claude Opus 4.7", contextLength: 1_000_000, promptPrice: nil, completionPrice: nil, supportsVision: true),
        ModelInfo(id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextLength: 1_000_000, promptPrice: nil, completionPrice: nil, supportsVision: true),
    ]

    func availableModels() async throws -> [ModelInfo] {
        guard let url = settings.modelsURL else { throw APIError.badURL }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        applyAuth(to: &request)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("The provider sent a response the app could not read.")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(status: http.statusCode, message: Wire.ErrorEnvelope.message(from: data))
        }

        let decoded = try JSONDecoder().decode(AnthropicWire.ModelListResponse.self, from: data)
        return (decoded.data ?? []).map { entry in
            ModelInfo(
                id: entry.id,
                name: entry.display_name ?? entry.id,
                contextLength: entry.max_input_tokens,
                promptPrice: nil,
                completionPrice: nil,
                supportsVision: true
            )
        }
        .sorted { $0.id.localizedCaseInsensitiveCompare($1.id) == .orderedAscending }
    }

    // MARK: - Request building

    private func buildRequest(
        model: String,
        systemPrompt: String,
        history: [Message],
        stream: Bool
    ) throws -> URLRequest {
        guard !apiKey.isEmpty else { throw APIError.missingKey }
        guard let url = settings.anthropicMessagesURL else { throw APIError.badURL }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Self.apiVersion, forHTTPHeaderField: "anthropic-version")
        applyAuth(to: &request)
        if stream {
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        }

        let trimmedSystem = systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        let body = AnthropicWire.MessagesRequest(
            model: model,
            max_tokens: settings.anthropicMaxTokens,
            system: trimmedSystem.isEmpty ? nil : trimmedSystem,
            messages: Self.wireMessages(history: history),
            stream: stream
        )
        // Deliberately no `temperature`: current Claude models reject sampling
        // parameters outright, so sending one turns every request into a 400.
        request.httpBody = try JSONEncoder().encode(body)
        return request
    }

    private func applyAuth(to request: inout URLRequest) {
        guard !apiKey.isEmpty else { return }
        switch resolvedAuthStyle {
        case .apiKeyHeader:
            request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        case .bearer:
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        case .automatic:
            break // resolvedAuthStyle never returns .automatic
        }
    }

    /// First-party keys are `sk-ant-…` and go in `x-api-key`. Anything else is
    /// almost always a gateway token, which expects a bearer header — the same
    /// split Anthropic's tooling makes between ANTHROPIC_API_KEY and
    /// ANTHROPIC_AUTH_TOKEN.
    private var resolvedAuthStyle: AnthropicAuthStyle {
        switch settings.anthropicAuthStyle {
        case .apiKeyHeader, .bearer:
            return settings.anthropicAuthStyle
        case .automatic:
            return apiKey.hasPrefix("sk-ant-") ? .apiKeyHeader : .bearer
        }
    }

    static func wireMessages(history: [Message]) -> [AnthropicWire.RequestMessage] {
        var result: [AnthropicWire.RequestMessage] = []

        for message in history where message.role != .system && !message.isError {
            var text = message.text
            // No file transport in this API either; inline text attachments with a
            // header so the model can tell them from the user's own prose.
            let textAttachments = message.attachments.filter { $0.kind == .text }
            if !textAttachments.isEmpty {
                let rendered = textAttachments
                    .map { "--- \($0.name) ---\n\($0.payload)" }
                    .joined(separator: "\n\n")
                text = text.isEmpty ? rendered : "\(text)\n\n\(rendered)"
            }

            let images = message.attachments.filter { $0.kind == .image }
            if images.isEmpty {
                // An entirely empty turn is not valid; keep a placeholder rather than
                // sending a message the API will reject.
                result.append(
                    AnthropicWire.RequestMessage(
                        role: message.role.rawValue,
                        content: .text(text.isEmpty ? "(no content)" : text)
                    )
                )
            } else {
                var blocks: [AnthropicWire.RequestMessage.Block] = images.map {
                    .image(mediaType: $0.mimeType, base64: $0.payload)
                }
                // Anthropic's guidance is images first, then the question about them.
                if !text.isEmpty { blocks.append(.text(text)) }
                result.append(
                    AnthropicWire.RequestMessage(role: message.role.rawValue, content: .blocks(blocks))
                )
            }
        }

        // The conversation must open on a user turn.
        while let first = result.first, first.role != MessageRole.user.rawValue {
            result.removeFirst()
        }
        return result
    }
}
