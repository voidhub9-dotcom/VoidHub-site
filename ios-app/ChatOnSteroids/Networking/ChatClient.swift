import Foundation

enum APIError: LocalizedError {
    case missingKey
    case badURL
    case http(status: Int, message: String?)
    case transport(String)
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .missingKey:
            return "No API key yet. Add one in Settings → Provider."
        case .badURL:
            return "That base URL is not a valid endpoint. Check Settings → Provider."
        case .http(let status, let message):
            if let message, !message.isEmpty {
                return "\(message) (HTTP \(status))"
            }
            switch status {
            case 401: return "The provider rejected the API key (HTTP 401)."
            case 402: return "The account has no credit left for this model (HTTP 402)."
            case 429: return "Rate limited by the provider (HTTP 429). Try again shortly."
            default: return "The provider returned HTTP \(status)."
            }
        case .transport(let detail):
            return detail
        case .emptyResponse:
            return "The model returned an empty answer."
        }
    }
}

/// Talks to any OpenAI-compatible endpoint. Stateless by design: it is rebuilt from
/// current settings for each turn, so changing the model or key takes effect on the
/// very next send with nothing to invalidate.
struct ChatClient {
    let settings: AppSettings
    let apiKey: String

    private static let maxErrorBodyBytes = 8 * 1024

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
                        let message = try await Self.errorMessage(from: bytes)
                        throw APIError.http(status: http.statusCode, message: message)
                    }

                    var produced = false
                    for try await line in bytes.lines {
                        if Task.isCancelled { break }
                        guard line.hasPrefix("data:") else { continue }
                        let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        if payload.isEmpty { continue }
                        if payload == "[DONE]" { break }
                        guard let data = payload.data(using: .utf8),
                              let chunk = try? JSONDecoder().decode(Wire.StreamChunk.self, from: data)
                        else {
                            continue
                        }
                        if let piece = chunk.choices?.first?.delta?.content, !piece.isEmpty {
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
        let decoded = try JSONDecoder().decode(Wire.CompletionResponse.self, from: data)
        guard let text = decoded.choices?.first?.message?.content, !text.isEmpty else {
            throw APIError.emptyResponse
        }
        return text
    }

    // MARK: - Models

    func availableModels() async throws -> [ModelInfo] {
        guard let url = settings.modelsURL else { throw APIError.badURL }
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        // Some gateways list models without a key; sending one when we have it is harmless.
        if !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("The provider sent a response the app could not read.")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(status: http.statusCode, message: Wire.ErrorEnvelope.message(from: data))
        }

        let decoded = try JSONDecoder().decode(Wire.ModelListResponse.self, from: data)
        let entries = decoded.data ?? []
        return entries.map { entry in
            let modalities = entry.architecture?.input_modalities ?? []
            let modality = entry.architecture?.modality ?? ""
            return ModelInfo(
                id: entry.id,
                name: entry.name ?? entry.id,
                contextLength: entry.context_length,
                promptPrice: entry.pricing?.prompt.flatMap { Double($0) },
                completionPrice: entry.pricing?.completion.flatMap { Double($0) },
                supportsVision: modalities.contains("image") || modality.contains("image")
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
        guard let url = settings.chatCompletionsURL else { throw APIError.badURL }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        if stream {
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        }
        if settings.isOpenRouter {
            // OpenRouter attributes traffic with these; they are optional but keep
            // the account's dashboard readable.
            request.setValue("https://github.com/voidhub9-dotcom", forHTTPHeaderField: "HTTP-Referer")
            request.setValue("Chat On Steroids iOS", forHTTPHeaderField: "X-Title")
        }

        let body = Wire.CompletionRequest(
            model: model,
            messages: Self.wireMessages(systemPrompt: systemPrompt, history: history),
            stream: stream,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens > 0 ? settings.maxTokens : nil
        )
        request.httpBody = try JSONEncoder().encode(body)
        return request
    }

    static func wireMessages(systemPrompt: String, history: [Message]) -> [Wire.RequestMessage] {
        var result: [Wire.RequestMessage] = []
        let trimmedSystem = systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedSystem.isEmpty {
            result.append(Wire.RequestMessage(role: "system", content: .text(trimmedSystem)))
        }

        for message in history where message.role != .system && !message.isError {
            var text = message.text
            // Text attachments have no transport of their own in this API; inline them
            // with a header so the model can tell them apart from the user's prose.
            let textAttachments = message.attachments.filter { $0.kind == .text }
            if !textAttachments.isEmpty {
                let rendered = textAttachments
                    .map { "--- \($0.name) ---\n\($0.payload)" }
                    .joined(separator: "\n\n")
                text = text.isEmpty ? rendered : "\(text)\n\n\(rendered)"
            }

            let images = message.attachments.filter { $0.kind == .image }
            if images.isEmpty {
                result.append(Wire.RequestMessage(role: message.role.rawValue, content: .text(text)))
            } else {
                var parts: [Wire.RequestMessage.Part] = []
                if !text.isEmpty { parts.append(.text(text)) }
                parts.append(contentsOf: images.map { .image(dataURL: $0.dataURL) })
                result.append(Wire.RequestMessage(role: message.role.rawValue, content: .parts(parts)))
            }
        }
        return result
    }

    private static func errorMessage(from bytes: URLSession.AsyncBytes) async throws -> String? {
        var data = Data()
        for try await byte in bytes {
            data.append(byte)
            if data.count >= maxErrorBodyBytes { break }
        }
        return Wire.ErrorEnvelope.message(from: data)
    }
}
