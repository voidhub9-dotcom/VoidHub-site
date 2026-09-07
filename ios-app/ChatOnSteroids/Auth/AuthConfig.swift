import Foundation

/// Google credentials arrive from the build settings in `project.yml` through
/// Info.plist, so there is exactly one place to paste them and no source file to edit.
enum AuthConfig {
    private static func infoValue(_ key: String) -> String? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        // An unset build setting expands to the literal "$(GOOGLE_CLIENT_ID)".
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else { return nil }
        return trimmed
    }

    static var googleClientID: String? { infoValue("GoogleClientID") }

    static var googleReversedClientID: String? { infoValue("GoogleReversedClientID") }

    static var isGoogleConfigured: Bool {
        googleClientID != nil && googleReversedClientID != nil
    }

    /// Google's iOS OAuth clients require the reversed-client-ID scheme.
    static var googleRedirectURI: String? {
        guard let reversed = googleReversedClientID else { return nil }
        return reversed + ":/oauth2redirect"
    }

    static var googleCallbackScheme: String? { googleReversedClientID }

    static let googleAuthorizationEndpoint = URL(string: "https://accounts.google.com/o/oauth2/v2/auth")!
    static let googleTokenEndpoint = URL(string: "https://oauth2.googleapis.com/token")!
    static let googleUserInfoEndpoint = URL(string: "https://openidconnect.googleapis.com/v1/userinfo")!
    static let googleScopes = "openid email profile"
}
