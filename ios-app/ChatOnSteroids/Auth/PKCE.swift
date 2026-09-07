import CryptoKit
import Foundation
import Security

/// Proof Key for Code Exchange (RFC 7636). A native app is a public client — it
/// holds no client secret — so the verifier is what stops an intercepted
/// authorization code from being redeemed by anyone else.
struct PKCE {
    let verifier: String
    let challenge: String

    init() {
        var bytes = [UInt8](repeating: 0, count: 32)
        if SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) != errSecSuccess {
            // SecRandomCopyBytes does not fail in practice; if it ever does, a
            // non-random verifier would silently weaken the exchange, so use the
            // system RNG rather than shipping a predictable value.
            bytes = (0..<32).map { _ in UInt8.random(in: UInt8.min...UInt8.max) }
        }
        let verifierValue = Data(bytes).base64URLEncodedString()
        verifier = verifierValue
        challenge = Data(SHA256.hash(data: Data(verifierValue.utf8))).base64URLEncodedString()
    }
}

extension Data {
    func base64URLEncodedString() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
