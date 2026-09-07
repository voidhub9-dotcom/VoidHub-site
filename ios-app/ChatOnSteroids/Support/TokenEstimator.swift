import Foundation

/// A local, deliberately approximate token count for the context meter.
///
/// This is an estimate and is labelled as one in the UI — the provider's own
/// counter is the only exact number, and it is not exposed to the client.
enum TokenEstimator {
    /// Roughly four characters per token for English prose and code alike, plus a
    /// small per-message overhead for role framing.
    static func estimate(_ text: String) -> Int {
        guard !text.isEmpty else { return 0 }
        return max(1, Int((Double(text.count) / 3.8).rounded(.up)))
    }

    static func estimate(_ message: Message) -> Int {
        var total = estimate(message.text) + 4
        for attachment in message.attachments {
            switch attachment.kind {
            case .text:
                total += estimate(attachment.payload)
            case .image:
                // Vision tiles are billed in blocks; this is a mid-range stand-in.
                total += 850
            }
        }
        return total
    }

    static func estimate(_ messages: [Message]) -> Int {
        messages.reduce(into: 0) { $0 += estimate($1) }
    }

    static func format(_ tokens: Int) -> String {
        if tokens >= 1_000_000 {
            return String(format: "%.1fM", Double(tokens) / 1_000_000)
        }
        if tokens >= 1_000 {
            return String(format: "%.1fk", Double(tokens) / 1_000)
        }
        return "\(tokens)"
    }
}
