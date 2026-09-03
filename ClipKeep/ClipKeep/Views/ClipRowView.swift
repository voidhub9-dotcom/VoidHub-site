//
//  ClipRowView.swift
//  ClipKeep
//

import Foundation
import SwiftUI
import UIKit

struct ClipRowView: View {
    let metadata: ClipMetadata
    @EnvironmentObject private var clipboardManager: ClipboardManager
    @State private var thumbnail: UIImage?

    var body: some View {
        HStack(spacing: 12) {
            leadingIcon
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: 3) {
                Text(metadata.previewText)
                    .font(.body)
                    .lineLimit(metadata.kind == .image ? 1 : 2)
                    .foregroundStyle(.primary)

                HStack(spacing: 6) {
                    Text(metadata.createdAt, format: .relative(presentation: .named))
                    Text("·")
                    Text(metadata.kind.displayName)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 4)

            if metadata.isPinned {
                Image(systemName: "pin.fill")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(
                        Circle().fill(
                            LinearGradient(
                                colors: [.orange, .orange.opacity(0.75)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    )
                    .accessibilityLabel("Pinned")
            }
        }
        .padding(.vertical, 4)
        .task(id: metadata.id) {
            await loadThumbnailIfNeeded()
        }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Double tap to view. Swipe for more actions.")
    }

    @ViewBuilder
    private var leadingIcon: some View {
        if metadata.kind == .image, let thumbnail {
            Image(uiImage: thumbnail)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 40, height: 40)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        } else {
            Image(systemName: metadata.kind.symbolName)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.accentColor)
                .frame(width: 40, height: 40)
                .adaptiveGlassBackground(
                    in: AnyShape(RoundedRectangle(cornerRadius: 11, style: .continuous)),
                    tint: Color.accentColor.opacity(0.5)
                )
        }
    }

    @MainActor
    private func loadThumbnailIfNeeded() async {
        guard metadata.kind == .image else { return }
        if let cached = ThumbnailCache.shared.thumbnail(for: metadata.id) {
            thumbnail = cached
            return
        }
        do {
            let representations = try clipboardManager.loadRepresentations(for: metadata)
            guard let imageData = representations.first(where: { UTI.imageTypes.contains($0.key) })?.value else {
                return
            }
            let built = await Task.detached(priority: .utility) {
                ThumbnailCache.shared.makeThumbnail(from: imageData, id: metadata.id)
            }.value
            thumbnail = built
        } catch {
            // Silent by design: a missing thumbnail just falls back to the
            // generic image icon, which is not worth surfacing as an error.
        }
    }
}
