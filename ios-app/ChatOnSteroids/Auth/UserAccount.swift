import Foundation

struct UserAccount: Codable, Equatable, Sendable {
    enum Provider: String, Codable, Sendable {
        case google
        case local
    }

    var id: String
    var email: String
    var name: String
    var pictureURL: String?
    var provider: Provider

    static let localAccount = UserAccount(
        id: "local",
        email: "",
        name: "On this device",
        pictureURL: nil,
        provider: .local
    )

    var displayName: String {
        if !name.isEmpty { return name }
        if !email.isEmpty { return email }
        return "Signed in"
    }

    var initials: String {
        let source = name.isEmpty ? email : name
        let parts = source
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
            .map(String.init)
        let joined = parts.joined().uppercased()
        return joined.isEmpty ? "?" : joined
    }
}
