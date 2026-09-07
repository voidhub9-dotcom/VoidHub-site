import SwiftUI
import UIKit

/// Renders one message body: inline markdown for prose, a real code view for fenced
/// blocks. Parsing happens per render so a half-finished fence still looks right
/// while the answer is streaming in.
struct MessageContentView: View {
    let text: String
    let isUser: Bool

    private var blocks: [ContentBlock] {
        ContentParser.blocks(from: text)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(blocks) { block in
                switch block.kind {
                case .text:
                    Text(ContentParser.inlineAttributed(block.text))
                        .textSelection(.enabled)
                        .fixedSize(horizontal: false, vertical: true)
                case .code:
                    CodeBlockView(code: block.text, language: block.language, compact: isUser)
                }
            }
        }
    }
}

struct CodeBlockView: View {
    let code: String
    let language: String?
    var compact: Bool = false

    @State private var didCopy = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text(language?.uppercased() ?? "CODE")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                Button {
                    UIPasteboard.general.string = code
                    didCopy = true
                    Task {
                        try? await Task.sleep(nanoseconds: 1_500_000_000)
                        didCopy = false
                    }
                } label: {
                    Label(didCopy ? "Copied" : "Copy", systemImage: didCopy ? "checkmark" : "doc.on.doc")
                        .font(.caption2.weight(.medium))
                        .labelStyle(.titleAndIcon)
                }
                .buttonStyle(.plain)
                .foregroundStyle(didCopy ? Color.green : Color.accentColor)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color(uiColor: .quaternarySystemFill))

            ScrollView(.horizontal, showsIndicators: true) {
                Text(code.isEmpty ? " " : code)
                    .font(.system(.footnote, design: .monospaced))
                    .textSelection(.enabled)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(Color(uiColor: .tertiarySystemFill))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .frame(maxWidth: compact ? 320 : .infinity, alignment: .leading)
    }
}
