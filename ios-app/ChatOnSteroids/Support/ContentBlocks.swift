import Foundation

/// One renderable run of a message: either prose or a fenced code block.
///
/// `id` is the block's index rather than a fresh UUID, so re-parsing a message on
/// every streamed token does not hand SwiftUI a brand-new identity each time and
/// destroy the list it is animating.
struct ContentBlock: Identifiable, Hashable {
    enum Kind: Hashable {
        case text
        case code
    }

    var id: Int
    var kind: Kind
    var text: String
    var language: String?
}

enum ContentParser {
    /// Splits on ``` fences. An unterminated fence is treated as an open code block,
    /// which is the normal state halfway through a streamed answer.
    static func blocks(from raw: String) -> [ContentBlock] {
        guard raw.contains("```") else {
            let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? [] : [ContentBlock(id: 0, kind: .text, text: raw, language: nil)]
        }

        var blocks: [ContentBlock] = []
        var buffer: [String] = []
        var codeLines: [String] = []
        var language: String?
        var inCode = false

        func flushText() {
            let joined = buffer.joined(separator: "\n")
            buffer.removeAll()
            guard !joined.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            blocks.append(ContentBlock(id: blocks.count, kind: .text, text: joined, language: nil))
        }

        func flushCode() {
            let joined = codeLines.joined(separator: "\n")
            codeLines.removeAll()
            // An empty block is still worth showing while a fence is streaming in.
            blocks.append(ContentBlock(id: blocks.count, kind: .code, text: joined, language: language))
            language = nil
        }

        for line in raw.components(separatedBy: .newlines) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("```") {
                if inCode {
                    flushCode()
                    inCode = false
                } else {
                    flushText()
                    let tag = trimmed.dropFirst(3).trimmingCharacters(in: .whitespaces)
                    language = tag.isEmpty ? nil : tag
                    inCode = true
                }
                continue
            }
            if inCode {
                codeLines.append(line)
            } else {
                buffer.append(line)
            }
        }

        if inCode {
            flushCode()
        } else {
            flushText()
        }

        return blocks
    }

    /// Inline emphasis, links and inline code, with newlines preserved.
    static func inlineAttributed(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(
            allowsExtendedAttributes: false,
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
        if let parsed = try? AttributedString(markdown: text, options: options) {
            return parsed
        }
        return AttributedString(text)
    }
}
