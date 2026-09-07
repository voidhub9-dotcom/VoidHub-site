import Foundation

enum MessageRole: String, Codable, Sendable, CaseIterable {
    case system
    case user
    case assistant
}

/// A file the user attached to a turn. Images travel to the model as base64 data
/// URLs; text files are inlined into the prompt, because that is all an
/// OpenAI-compatible endpoint accepts without a provider-specific upload API.
struct Attachment: Codable, Identifiable, Hashable, Sendable {
    enum Kind: String, Codable, Sendable {
        case image
        case text
    }

    var id: UUID = UUID()
    var kind: Kind
    var name: String
    var mimeType: String
    /// Base64 for `.image`, decoded UTF-8 for `.text`.
    var payload: String
    var byteCount: Int

    var dataURL: String { "data:\(mimeType);base64,\(payload)" }

    var displaySize: String {
        ByteCountFormatter.string(fromByteCount: Int64(byteCount), countStyle: .file)
    }
}

struct Message: Codable, Identifiable, Hashable, Sendable {
    var id: UUID = UUID()
    var role: MessageRole
    var text: String
    var attachments: [Attachment] = []
    var createdAt: Date = Date()
    /// The model that produced an assistant turn; nil for user and system turns.
    var model: String?
    /// Set when the turn is a delivery failure rather than a model answer, so the
    /// UI can offer a retry instead of pretending the model said this.
    var isError: Bool = false

    static func user(_ text: String, attachments: [Attachment] = []) -> Message {
        Message(role: .user, text: text, attachments: attachments)
    }

    static func assistant(_ text: String, model: String?) -> Message {
        Message(role: .assistant, text: text, model: model)
    }

    static func failure(_ text: String) -> Message {
        Message(role: .assistant, text: text, isError: true)
    }
}
