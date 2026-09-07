import Foundation

/// One entry from the provider's `/models` listing. Only the fields every
/// OpenAI-compatible provider actually returns are required.
struct ModelInfo: Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var contextLength: Int?
    var promptPrice: Double?
    var completionPrice: Double?
    var supportsVision: Bool

    var displayName: String { name.isEmpty ? id : name }

    var vendor: String {
        guard let slash = id.firstIndex(of: "/") else { return "Other" }
        return String(id[id.startIndex..<slash])
    }

    var contextSummary: String? {
        guard let contextLength, contextLength > 0 else { return nil }
        if contextLength >= 1000 {
            return "\(contextLength / 1000)k context"
        }
        return "\(contextLength) context"
    }

    var priceSummary: String? {
        guard let promptPrice, let completionPrice, promptPrice > 0 || completionPrice > 0 else {
            return nil
        }
        // Provider prices are per token; per-million reads far better.
        let inPer = promptPrice * 1_000_000
        let outPer = completionPrice * 1_000_000
        return String(format: "$%.2f in / $%.2f out per 1M", inPer, outPer)
    }
}
