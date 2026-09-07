import Foundation

/// A folder of chats that share a system prompt — the phone-sized version of the
/// desktop app's project folders.
struct Project: Codable, Identifiable, Hashable, Sendable {
    var id: UUID = UUID()
    var name: String
    var systemPrompt: String = ""
    var colorIndex: Int = 0
    var createdAt: Date = Date()
}
