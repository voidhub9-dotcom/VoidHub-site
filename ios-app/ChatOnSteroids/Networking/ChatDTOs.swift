import Foundation

/// Wire types for the OpenAI-compatible `/chat/completions` contract that
/// OpenRouter, OpenAI and most local servers all speak.
enum Wire {
    struct RequestMessage: Encodable {
        let role: String
        let content: Content

        /// The spec allows either a bare string or an array of typed parts. Vision
        /// turns need the array form; everything else stays a string so simpler
        /// servers that never implemented parts still work.
        enum Content: Encodable {
            case text(String)
            case parts([Part])

            func encode(to encoder: Encoder) throws {
                var container = encoder.singleValueContainer()
                switch self {
                case .text(let value):
                    try container.encode(value)
                case .parts(let value):
                    try container.encode(value)
                }
            }
        }

        struct Part: Encodable {
            struct ImageURL: Encodable {
                let url: String
            }

            let type: String
            let text: String?
            let image_url: ImageURL?

            static func text(_ value: String) -> Part {
                Part(type: "text", text: value, image_url: nil)
            }

            static func image(dataURL: String) -> Part {
                Part(type: "image_url", text: nil, image_url: ImageURL(url: dataURL))
            }
        }
    }

    struct CompletionRequest: Encodable {
        let model: String
        let messages: [RequestMessage]
        let stream: Bool
        let temperature: Double?
        let max_tokens: Int?
    }

    struct StreamChunk: Decodable {
        struct Choice: Decodable {
            struct Delta: Decodable {
                let content: String?
            }

            let delta: Delta?
            let finish_reason: String?
        }

        let choices: [Choice]?
    }

    struct CompletionResponse: Decodable {
        struct Choice: Decodable {
            struct ResponseMessage: Decodable {
                let content: String?
            }

            let message: ResponseMessage?
        }

        let choices: [Choice]?
    }

    /// Providers disagree on shape: some return `{"error":{"message":…}}`, some a
    /// bare string. Accept both so the user sees the real reason either way.
    struct ErrorEnvelope: Decodable {
        struct Detail: Decodable {
            let message: String?
            let code: String?
        }

        let error: Detail?

        static func message(from data: Data) -> String? {
            if let envelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: data),
               let message = envelope.error?.message,
               !message.isEmpty {
                return message
            }
            guard let raw = String(data: data, encoding: .utf8) else { return nil }
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : String(trimmed.prefix(400))
        }
    }

    struct ModelListResponse: Decodable {
        struct Entry: Decodable {
            struct Pricing: Decodable {
                let prompt: String?
                let completion: String?
            }

            struct Architecture: Decodable {
                let modality: String?
                let input_modalities: [String]?
            }

            let id: String
            let name: String?
            let context_length: Int?
            let pricing: Pricing?
            let architecture: Architecture?
        }

        let data: [Entry]?
    }
}
