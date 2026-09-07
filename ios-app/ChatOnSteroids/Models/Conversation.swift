import Foundation

struct Conversation: Codable, Identifiable, Hashable, Sendable {
    var id: UUID = UUID()
    var title: String = "New chat"
    var projectID: UUID?
    var model: String
    /// Empty means "inherit from the project, then from global settings".
    var systemPrompt: String = ""
    var messages: [Message] = []
    var createdAt: Date = Date()
    var updatedAt: Date = Date()
    var isPinned: Bool = false

    /// Turns that actually go to the model, in order.
    var modelTurns: [Message] {
        messages.filter { !$0.isError && $0.role != .system }
    }

    var lastActivity: Date {
        messages.last?.createdAt ?? updatedAt
    }

    var preview: String {
        guard let last = messages.last(where: { !$0.text.isEmpty }) else {
            return "No messages yet"
        }
        let flattened = last.text
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return flattened.isEmpty ? "No messages yet" : flattened
    }

    /// A title derived from the opening user turn, used until the user renames it.
    static func derivedTitle(from text: String) -> String {
        let cleaned = text
            .replacingOccurrences(of: "\n", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return "New chat" }
        if cleaned.count <= 48 { return cleaned }
        let cut = cleaned.prefix(48)
        // Prefer a word boundary so titles do not end mid-word.
        if let space = cut.lastIndex(of: " "), cut.distance(from: cut.startIndex, to: space) > 24 {
            return String(cut[cut.startIndex..<space]) + "…"
        }
        return String(cut) + "…"
    }
}
