//
//  ClipDetailView.swift
//  ClipKeep
//

import Foundation
import SwiftUI
import UIKit

struct ClipDetailView: View {
    let metadata: ClipMetadata
    @EnvironmentObject private var clipboardManager: ClipboardManager
    @Environment(\.dismiss) private var dismiss

    @State private var representations: [String: Data] = [:]
    @State private var loadError: String?
    @State private var showDeleteConfirmation = false
    @State private var isPinned: Bool

    init(metadata: ClipMetadata) {
        self.metadata = metadata
        self._isPinned = State(initialValue: metadata.isPinned)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                content
                metadataSection
            }
            .padding()
        }
        .navigationTitle(metadata.kind.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            bottomActionBar
        }
        .confirmationDialog(
            "Delete this clip? This can't be undone.",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete Clip", role: .destructive) {
                clipboardManager.delete(metadata)
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        }
        .task {
            loadRepresentations()
        }
    }

    @ViewBuilder
    private var content: some View {
        if let loadError {
            EmptyStateView(
                symbolName: "exclamationmark.triangle",
                title: "Couldn't Load Clip",
                message: loadError
            )
            .frame(minHeight: 200)
        } else {
            switch metadata.kind {
            case .text, .url:
                Text(plainTextPreview)
                    .font(.body)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)

            case .richText:
                if let attributed = richTextAttributedString {
                    Text(AttributedString(attributed))
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    Text(plainTextPreview)
                        .font(.body)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

            case .image:
                if let image = image {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                } else if representations.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    EmptyStateView(
                        symbolName: "photo.badge.exclamationmark",
                        title: "Image Unavailable",
                        message: "The stored image data couldn't be decoded."
                    )
                    .frame(minHeight: 200)
                }

            case .unknown:
                EmptyStateView(
                    symbolName: "questionmark.square.dashed",
                    title: "Unsupported Content",
                    message: "ClipKeep saved the raw data for this clip, but doesn't know how to preview its type. It will still paste back exactly as copied."
                )
                .frame(minHeight: 160)
            }
        }
    }

    /// A floating action bar -- pin and delete as small circular buttons,
    /// "Copy to Clipboard" as the prominent primary action -- the same
    /// layout Photos and Files use for their detail-view toolbars. On
    /// iOS 26 this renders as real Liquid Glass, with `GlassEffectContainer`
    /// grouping the three buttons so they can blend into one another
    /// instead of each being sampled independently.
    @ViewBuilder
    private var bottomActionBar: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 14) {
                HStack(spacing: 14) {
                    GlassIconButton(
                        systemName: isPinned ? "pin.fill" : "pin",
                        accessibilityLabel: isPinned ? "Unpin" : "Pin",
                        tint: .orange
                    ) {
                        clipboardManager.togglePinned(metadata)
                        isPinned.toggle()
                    }

                    GlassIconButton(
                        systemName: "trash",
                        accessibilityLabel: "Delete",
                        tint: .red,
                        role: .destructive
                    ) {
                        showDeleteConfirmation = true
                    }

                    Spacer(minLength: 0)

                    Button {
                        clipboardManager.copyBack(metadata)
                    } label: {
                        Label("Copy to Clipboard", systemImage: "doc.on.clipboard")
                            .padding(.horizontal, 6)
                    }
                    .buttonStyle(.glassProminent)
                    .controlSize(.large)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        } else {
            HStack(spacing: 14) {
                GlassIconButton(
                    systemName: isPinned ? "pin.fill" : "pin",
                    accessibilityLabel: isPinned ? "Unpin" : "Pin",
                    tint: .orange
                ) {
                    clipboardManager.togglePinned(metadata)
                    isPinned.toggle()
                }

                GlassIconButton(
                    systemName: "trash",
                    accessibilityLabel: "Delete",
                    tint: .red,
                    role: .destructive
                ) {
                    showDeleteConfirmation = true
                }

                Button {
                    clipboardManager.copyBack(metadata)
                } label: {
                    Label("Copy to Clipboard", systemImage: "doc.on.clipboard")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding()
            .background(.bar)
        }
    }

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Divider()
            LabeledContent("Captured", value: metadata.createdAt.formatted(date: .abbreviated, time: .shortened))
            LabeledContent("Size", value: ByteCountFormatter.string(fromByteCount: Int64(metadata.approximateByteCount), countStyle: .file))
            LabeledContent("Stored Formats", value: metadata.storedTypes.joined(separator: ", "))
        }
        .font(.footnote)
        .foregroundStyle(.secondary)
    }

    private func loadRepresentations() {
        do {
            representations = try clipboardManager.loadRepresentations(for: metadata)
        } catch {
            loadError = error.localizedDescription
        }
    }

    private var plainTextPreview: String {
        for type in UTI.textTypes {
            if let data = representations[type], let string = String(data: data, encoding: .utf8) {
                return string
            }
        }
        return metadata.previewText
    }

    private var richTextAttributedString: NSAttributedString? {
        if let data = representations[UTI.rtf] {
            return try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil)
        }
        if let data = representations[UTI.flatRTFD] {
            return try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtfd], documentAttributes: nil)
        }
        return nil
    }

    private var image: UIImage? {
        guard let data = representations.first(where: { UTI.imageTypes.contains($0.key) })?.value else {
            return nil
        }
        return UIImage(data: data)
    }
}
