import Foundation

/// One name/value pair — a header, or a query parameter, depending where it's
/// used. Its own type mainly so the editor list has stable per-row identity.
struct CustomHeader: Codable, Sendable, Identifiable, Hashable {
    var id: UUID = UUID()
    var name: String = ""
    var value: String = ""
}
