import SwiftUI
import UIKit

struct MessageRow: View {
    let message: Message
    var canRetry: Bool = false
    var onDelete: () -> Void = {}
    var onRetry: () -> Void = {}

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
    }

    private var bubble: some View {
        MessageContentView(text: message.text, isUser: isUser)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(bubbleBackground)
            .foregroundStyle(bubbleForeground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous)
                    .stroke(message.isError ? Color.red.opacity(0.45) : Color.clear, lineWidth: 1)
            )
            .contextMenu {
                Button {
                    UIPasteboard.general.string = message.text
                } label: {
                    Label("Copy text", systemImage: "doc.on.doc")
                }
                if canRetry && message.role == .assistant {
                    Button {
                        onRetry()
                    } label: {
                        Label("Retry this answer", systemImage: "arrow.clockwise")
                    }
                }
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Label("Delete message", systemImage: "trash")
                }
            }
    }

    @ViewBuilder
    private var bubbleBackground: some View {
        if message.isError {
            Color.red.opacity(0.12)
        } else if isUser {
            Color.accentColor
        } else {
            Color(uiColor: .secondarySystemBackground)
        }
    }

    private var bubbleForeground: Color {
        if message.isError { return .primary }
        return isUser ? .white : .primary
    }

    @ViewBuilder
    private var footer: some View {
        HStack(spacing: 6) {
            if message.isError {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption2)
                    .foregroundStyle(.red)
                Text("Not delivered")
            } else if let model = message.model, !isUser {
                Text(model)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
        .padding(.horizontal, 4)
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
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
