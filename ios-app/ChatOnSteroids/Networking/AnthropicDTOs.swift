import Foundation

/// Wire types for Anthropic's Messages API. Structurally different from the
/// OpenAI-compatible shape in four ways that matter here: the system prompt is a
/// top-level field rather than a message, `max_tokens` is required, images carry
/// raw base64 with a separate media type instead of a data URL, and the stream is
/// a sequence of typed events rather than choice deltas.
enum AnthropicWire {
    struct RequestMessage: Encodable {
        let role: String
        let content: Content

        enum Content: Encodable {
            case text(String)
            case blocks([Block])

            func encode(to encoder: Encoder) throws {
                var container = encoder.singleValueContainer()
                switch self {
                case .text(let value):
                    try container.encode(value)
                case .blocks(let value):
                    try container.encode(value)
                }
            }
        }

        struct Block: Encodable {
            struct ImageSource: Encodable {
                let type: String
                let media_type: String
                let data: String
            }

            let type: String
            let text: String?
            let source: ImageSource?

            static func text(_ value: String) -> Block {
                Block(type: "text", text: value, source: nil)
            }

            /// `data` is raw base64 — no `data:` URL prefix, unlike the OpenAI shape.
            static func image(mediaType: String, base64: String) -> Block {
                Block(
                    type: "image",
                    text: nil,
                    source: ImageSource(type: "base64", media_type: mediaType, data: base64)
                )
            }
        }
    }

    struct MessagesRequest: Encodable {
        let model: String
        let max_tokens: Int
        let system: String?
        let messages: [RequestMessage]
        let stream: Bool
    }

    /// One streamed event. Only `content_block_delta` carries text; the rest
    /// (message_start, ping, content_block_stop, message_delta, message_stop) are
    /// bookkeeping, and `error` reports a mid-stream failure.
    struct StreamEvent: Decodable {
        struct Delta: Decodable {
            let type: String?
            let text: String?
        }

        struct ErrorDetail: Decodable {
            let type: String?
            let message: String?
        }

        let type: String
        let delta: Delta?
        let error: ErrorDetail?
    }

    struct MessagesResponse: Decodable {
        struct Block: Decodable {
            let type: String
            let text: String?
        }

        let content: [Block]?
        let stop_reason: String?
    }

    struct ModelListResponse: Decodable {
        struct Entry: Decodable {
            let id: String
            let display_name: String?
            let max_input_tokens: Int?
        }

        let data: [Entry]?
    }
}
