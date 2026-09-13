import Foundation

/// A fact the app remembers across every conversation — the phone-sized version of
/// the "memory" panel these desktop-style assistants ship. Deliberately plain text
/// and user-controlled rather than auto-extracted: an assistant silently deciding
/// what's worth remembering about you is the wrong default on a personal device.
struct MemoryNote: Codable, Sendable, Identifiable, Hashable {
    var id: UUID = UUID()
    var text: String
    var createdAt: Date = Date()
}
