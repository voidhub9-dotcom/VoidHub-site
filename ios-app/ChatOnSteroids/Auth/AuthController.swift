import Foundation
import Observation

@MainActor
@Observable
final class AuthController {
    private static let accountDefaultsKey = "com.voidhub.chatonsteroids.account"

    private(set) var account: UserAccount?
    private(set) var isWorking = false
    var errorMessage: String?

    @ObservationIgnored private let oauth = GoogleOAuth()

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.accountDefaultsKey),
           let stored = try? JSONDecoder().decode(UserAccount.self, from: data) {
            account = stored
        }
    }

    var isAuthenticated: Bool { account != nil }

    var isGoogleAvailable: Bool { AuthConfig.isGoogleConfigured }

    func signInWithGoogle() async {
        guard !isWorking else { return }
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            let result = try await oauth.signIn()
            Keychain.set(result.accessToken, for: .googleAccessToken)
            if let refresh = result.refreshToken {
                Keychain.set(refresh, for: .googleRefreshToken)
            }
            persist(result.account)
        } catch AuthError.cancelled {
            // A deliberate dismissal is not an error worth shouting about.
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// No account, no network identity — history stays on the device. The app is
    /// fully usable this way; sign-in only adds a profile.
    func continueLocally() {
        errorMessage = nil
        persist(.localAccount)
    }

    func signOut() {
        Keychain.delete(.googleAccessToken)
        Keychain.delete(.googleRefreshToken)
        UserDefaults.standard.removeObject(forKey: Self.accountDefaultsKey)
        account = nil
        errorMessage = nil
    }

    private func persist(_ newAccount: UserAccount) {
        account = newAccount
        if let data = try? JSONEncoder().encode(newAccount) {
            UserDefaults.standard.set(data, forKey: Self.accountDefaultsKey)
        }
    }
}
