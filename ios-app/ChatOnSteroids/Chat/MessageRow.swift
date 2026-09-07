import SwiftUI
import UIKit

struct MessageRow: View {
    let message: Message
    var style: BubbleStyle = .glass
    var glass: Bool = true
    var showTokens: Bool = false
    var showTimestamp: Bool = false
    var tokenCount: Int = 0
    var canRetry: Bool = false
    var onDelete: () -> Void = {}
    var onRetry: () -> Void = {}
    var onEdit: () -> Void = {}

    private var isUser: Bool { message.role == .user }

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            if isUser { Spacer(minLength: 44) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
                if !message.attachments.isEmpty {
                    AttachmentPreviewRow(attachments: message.attachments, alignTrailing: isUser)
                }

                if !message.text.isEmpty || message.attachments.isEmpty {
                    bubble
                }

                footer
            }

            if !isUser { Spacer(minLength: 44) }
        }
        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
        .springEntrance()
    }

    // MARK: - Bubble

    @ViewBuilder
    private var bubble: some View {
        let content = MessageContentView(text: message.text, isUser: isUser)
            .padding(.horizontal, paddedBubble ? 14 : 0)
            .padding(.vertical, paddedBubble ? 10 : 0)

        Group {
            if message.isError {
                content
                    .background(
                        RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous)
                            .fill(Color.red.opacity(0.12))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous)
                            .strokeBorder(Color.red.opacity(0.45), lineWidth: 1)
                    )
            } else if isUser {
                content
                    .foregroundStyle(.white)
                    .background(userBackground)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous))
                    .shadow(color: Color.accentColor.opacity(glass ? 0.25 : 0), radius: 10, y: 4)
            } else {
                assistantBubble(content)
            }
        }
        .contextMenu { menu }
    }

    /// Minimal drops the assistant's bubble entirely, so the padding goes with it.
    private var paddedBubble: Bool {
        !(style == .minimal && !isUser && !message.isError)
    }

    private var userBackground: some View {
        LinearGradient(
            colors: [Color.accentColor, Color.accentColor.opacity(0.82)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    @ViewBuilder
    private func assistantBubble(_ content: some View) -> some View {
        switch style {
        case .glass:
            content.glassSurface(cornerRadius: Theme.bubbleCorner, enabled: glass)
        case .solid:
            content.background(
                RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous)
                    .fill(Color(uiColor: .secondarySystemBackground))
            )
        case .minimal:
            content
        }
    }

    // MARK: - Menu

    @ViewBuilder
    private var menu: some View {
        Button {
            UIPasteboard.general.string = message.text
            Haptics.success()
        } label: {
            Label("Copy text", systemImage: "doc.on.doc")
        }

        if isUser {
            Button {
                onEdit()
            } label: {
                Label("Edit and resend", systemImage: "pencil")
            }
        }

        if canRetry && message.role == .assistant {
            Button {
                onRetry()
            } label: {
                Label("Regenerate", systemImage: "arrow.clockwise")
            }
        }

        Button(role: .destructive) {
            onDelete()
        } label: {
            Label("Delete message", systemImage: "trash")
        }
    }

    // MARK: - Footer

    @ViewBuilder
    private var footer: some View {
        let pieces = footerPieces
        if !pieces.isEmpty {
            HStack(spacing: 6) {
                if message.isError {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
                Text(pieces.joined(separator: " · "))
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4)
        }
    }

    private var footerPieces: [String] {
        var pieces: [String] = []
        if message.isError {
            pieces.append("Not delivered")
        } else if let model = message.model, !isUser {
            pieces.append(model)
        }
        if showTokens && tokenCount > 0 {
            pieces.append("~\(TokenEstimator.format(tokenCount)) tok")
        }
        if showTimestamp {
            pieces.append(message.createdAt.formatted(date: .omitted, time: .shortened))
        }
        return pieces
    }
}

struct AttachmentPreviewRow: View {
    let attachments: [Attachment]
    var alignTrailing: Bool

    var body: some View {
        HStack(spacing: 8) {
            ForEach(attachments) { attachment in
                switch attachment.kind {
                case .image:
                    if let image = decodedImage(attachment) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 108, height: 108)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .strokeBorder(.white.opacity(0.18), lineWidth: 0.8)
                            )
                    }
                case .text:
                    HStack(spacing: 6) {
                        Image(systemName: "doc.text.fill")
                        VStack(alignment: .leading, spacing: 1) {
                            Text(attachment.name)
                                .font(.caption.weight(.medium))
                                .lineLimit(1)
                            Text(attachment.displaySize)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .glassSurface(cornerRadius: 10)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: alignTrailing ? .trailing : .leading)
    }

    private func decodedImage(_ attachment: Attachment) -> UIImage? {
        guard let data = Data(base64Encoded: attachment.payload) else { return nil }
        return UIImage(data: data)
    }
}
