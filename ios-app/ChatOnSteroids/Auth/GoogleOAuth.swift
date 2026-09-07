import AuthenticationServices
import Foundation
import UIKit

enum AuthError: LocalizedError {
    case notConfigured
    case cancelled
    case missingCode
    case tokenExchangeFailed(String)
    case profileFetchFailed(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Google sign-in has no client ID in this build. Add GOOGLE_CLIENT_ID and GOOGLE_REVERSED_CLIENT_ID in project.yml, or continue without an account."
        case .cancelled:
            return "Sign-in was cancelled."
        case .missingCode:
            return "Google did not return an authorization code."
        case .tokenExchangeFailed(let detail):
            return "Could not exchange the authorization code: \(detail)"
        case .profileFetchFailed(let detail):
            return "Signed in, but could not read the profile: \(detail)"
        }
    }
}

/// Google Sign-In over ASWebAuthenticationSession with PKCE.
///
/// Deliberately no Google SDK: the flow is three plain HTTPS calls, and the system
/// browser session is the part Google actually requires (an embedded web view is
/// rejected with `disallowed_useragent`).
final class GoogleOAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes
        let window = scenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
        return window ?? ASPresentationAnchor()
    }

    func signIn() async throws -> (account: UserAccount, accessToken: String, refreshToken: String?) {
        guard
            let clientID = AuthConfig.googleClientID,
            let redirectURI = AuthConfig.googleRedirectURI,
            let scheme = AuthConfig.googleCallbackScheme
        else {
            throw AuthError.notConfigured
        }

        let pkce = PKCE()
        let state = UUID().uuidString

        var components = URLComponents(url: AuthConfig.googleAuthorizationEndpoint, resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: AuthConfig.googleScopes),
            URLQueryItem(name: "code_challenge", value: pkce.challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account"),
        ]

        guard let authorizationURL = components?.url else { throw AuthError.notConfigured }

        let callbackURL = try await authorize(url: authorizationURL, scheme: scheme)

        let items = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.queryItems ?? []
        // A mismatched state means the response is not the one this flow started.
        guard items.first(where: { $0.name == "state" })?.value == state else {
            throw AuthError.missingCode
        }
        guard let code = items.first(where: { $0.name == "code" })?.value else {
            throw AuthError.missingCode
        }

        let tokens = try await exchange(code: code, verifier: pkce.verifier, clientID: clientID, redirectURI: redirectURI)
        let account = try await fetchProfile(accessToken: tokens.accessToken)
        return (account, tokens.accessToken, tokens.refreshToken)
    }

    private func authorize(url: URL, scheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { callbackURL, error in
                if let error {
                    let code = (error as NSError).code
                    if code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        continuation.resume(throwing: AuthError.cancelled)
                    } else {
                        continuation.resume(throwing: error)
                    }
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: AuthError.missingCode)
                    return
                }
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            if !session.start() {
                continuation.resume(throwing: AuthError.cancelled)
            }
        }
    }

    private struct TokenResponse: Decodable {
        let access_token: String
        let refresh_token: String?
        let expires_in: Int?
        let id_token: String?
    }

    private func exchange(
        code: String,
        verifier: String,
        clientID: String,
        redirectURI: String
    ) async throws -> (accessToken: String, refreshToken: String?) {
        var request = URLRequest(url: AuthConfig.googleTokenEndpoint)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        var form = URLComponents()
        form.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "code", value: code),
            URLQueryItem(name: "code_verifier", value: verifier),
            URLQueryItem(name: "grant_type", value: "authorization_code"),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
        ]
        request.httpBody = form.percentEncodedQuery?.data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let detail = String(data: data, encoding: .utf8) ?? "unknown error"
            throw AuthError.tokenExchangeFailed(detail.prefix(300).description)
        }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return (decoded.access_token, decoded.refresh_token)
    }

    private struct UserInfo: Decodable {
        let sub: String
        let email: String?
        let name: String?
        let picture: String?
    }

    private func fetchProfile(accessToken: String) async throws -> UserAccount {
        var request = URLRequest(url: AuthConfig.googleUserInfoEndpoint)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let detail = String(data: data, encoding: .utf8) ?? "unknown error"
            throw AuthError.profileFetchFailed(detail.prefix(300).description)
        }
        let info = try JSONDecoder().decode(UserInfo.self, from: data)
        return UserAccount(
            id: info.sub,
            email: info.email ?? "",
            name: info.name ?? "",
            pictureURL: info.picture,
            provider: .google
        )
    }
}
