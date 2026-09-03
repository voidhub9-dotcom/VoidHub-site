//
//  KeyboardRootView.swift
//  ClipKeep
//
//  The keyboard's entire interface, and the same view the app's Preview tab
//  renders so what you configure is literally what you get.
//
//  Every side effect arrives as a closure in `KeyboardActions` rather than
//  being called directly, because this view runs in two very different
//  places: inside the extension, where taps drive a real UITextDocumentProxy,
//  and inside the app, where they drive a harmless demo string. Keeping the
//  view itself free of UIInputViewController means neither context needs a
//  stubbed-out version of the other's dependencies.
//
//  There is no search field in here on purpose. A UITextField living inside a
//  keyboard has to take first responder to receive typing, which pulls focus
//  out of the host app's field -- the very field the user is trying to type
//  into. Filtering is therefore limited to the favorites toggle; full search
//  stays in the app where it costs nothing.
//

import SwiftUI
import UIKit

/// Outcome of putting a clip on the pasteboard. An enum rather than a Bool so
/// the keyboard can tell the user *which* thing went wrong -- "turn on Full
/// Access" and "this image is too big to hand over from a keyboard" need very
/// different responses from them.
enum ClipCopyResult {
    case copied
    case needsFullAccess
    /// Refused before loading: keyboard extensions run under a far tighter
    /// memory cap than apps, and materializing a large image here is a
    /// reliable way to get the whole keyboard killed mid-tap.
    case tooLarge
    case failed
}

/// Everything the keyboard can do to the outside world. The extension supplies
/// real implementations; the in-app preview supplies safe ones.
struct KeyboardActions {
    var insertText: (String) -> Void
    var deleteBackward: () -> Void
    var insertNewline: () -> Void
    var copyToPasteboard: (ClipMetadata) -> ClipCopyResult
    /// nil when the host doesn't need a globe key -- iOS hides it when
    /// ClipKeep is the only third-party keyboard installed.
    var advanceToNextInputMode: (() -> Void)?
    var playInputFeedback: () -> Void

    static var preview: KeyboardActions {
        KeyboardActions(
            insertText: { _ in },
            deleteBackward: {},
            insertNewline: {},
            copyToPasteboard: { _ in .copied },
            advanceToNextInputMode: nil,
            playInputFeedback: {}
        )
    }
}

struct KeyboardRootView: View {

    @ObservedObject var store: KeyboardClipStore
    let actions: KeyboardActions
    let hasFullAccess: Bool
    /// Suppresses the utility row in the app's Preview tab, where a backspace
    /// key that deletes nothing would just be confusing.
    var showsUtilityRow: Bool = true

    @State private var banner: Banner?

    private struct Banner: Equatable {
        let text: String
        let symbol: String
        let isError: Bool
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().opacity(0.5)
            content
            if showsUtilityRow {
                Divider().opacity(0.5)
                utilityRow
            }
        }
        .background(Color(uiColor: .systemGray5))
        .overlay(alignment: .top) {
            if let banner {
                bannerView(banner)
                    .padding(.top, 44)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.snappy(duration: 0.22), value: banner)
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 8) {
            Button {
                store.setFavoritesOnly(false)
                actions.playInputFeedback()
            } label: {
                filterChip(title: "All", isSelected: !store.showFavoritesOnly)
            }
            .buttonStyle(.plain)

            Button {
                store.setFavoritesOnly(true)
                actions.playInputFeedback()
            } label: {
                filterChip(title: "Favorites", symbol: "star.fill", isSelected: store.showFavoritesOnly)
            }
            .buttonStyle(.plain)

            Spacer(minLength: 0)

            Text("ClipKeep")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.tertiary)

            Button {
                store.reload(hasFullAccess: hasFullAccess)
                actions.playInputFeedback()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 13, weight: .semibold))
                    .frame(width: 30, height: 30)
                    .background(Color(uiColor: .systemGray4), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Reload clips")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }

    private func filterChip(title: String, symbol: String? = nil, isSelected: Bool) -> some View {
        HStack(spacing: 4) {
            if let symbol {
                Image(systemName: symbol)
                    .font(.system(size: 10, weight: .semibold))
            }
            Text(title)
                .font(.caption.weight(.semibold))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .foregroundStyle(isSelected ? Color.white : Color.primary)
        .background(
            Capsule().fill(isSelected ? Color.accentColor : Color(uiColor: .systemGray4))
        )
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let problem = store.accessProblem {
            messageState(
                symbol: "lock.fill",
                title: problem.title,
                message: problem.message
            )
        } else if store.items.isEmpty {
            messageState(
                symbol: store.hasAnyClips ? "star" : "clipboard",
                title: store.hasAnyClips ? "No Favorites Yet" : "No Clips Yet",
                message: store.hasAnyClips
                    ? "Swipe a clip in the ClipKeep app to favorite it, and it will show up here."
                    : "Copy something, then open the ClipKeep app once so it can capture the clip. It will be available here afterwards."
            )
        } else {
            ScrollView {
                LazyVStack(spacing: 6) {
                    ForEach(store.items) { metadata in
                        clipRow(metadata)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
            }
            .scrollIndicators(.automatic)
        }
    }

    private func clipRow(_ metadata: ClipMetadata) -> some View {
        Button {
            use(metadata)
        } label: {
            HStack(spacing: 10) {
                Image(systemName: metadata.kind.symbolName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.accentColor)
                    .frame(width: 30, height: 30)
                    .background(Color.accentColor.opacity(0.14), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                Text(metadata.previewText)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if metadata.isPinned {
                    Image(systemName: "star.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.orange)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
        .contextMenu {
            Button {
                copy(metadata)
            } label: {
                Label("Copy to Clipboard", systemImage: "doc.on.clipboard")
            }
        }
    }

    private func messageState(symbol: String, title: String, message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.system(size: 26, weight: .light))
                .foregroundStyle(.secondary)
            Text(title)
                .font(.subheadline.weight(.semibold))
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Utility row

    private var utilityRow: some View {
        HStack(spacing: 8) {
            if let advance = actions.advanceToNextInputMode {
                utilityKey(symbol: "globe", label: "Next keyboard") {
                    advance()
                }
            }

            utilityKey(title: "space", label: "Space", isWide: true) {
                actions.insertText(" ")
            }

            utilityKey(symbol: "delete.left", label: "Delete") {
                actions.deleteBackward()
            }

            utilityKey(symbol: "return", label: "Return") {
                actions.insertNewline()
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
    }

    private func utilityKey(
        symbol: String? = nil,
        title: String? = nil,
        label: String,
        isWide: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            actions.playInputFeedback()
            action()
        } label: {
            Group {
                if let symbol {
                    Image(systemName: symbol).font(.system(size: 16, weight: .medium))
                } else if let title {
                    Text(title).font(.footnote.weight(.medium))
                }
            }
            .frame(maxWidth: isWide ? .infinity : nil)
            .frame(width: isWide ? nil : 44, height: 38)
            .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    // MARK: - Actions

    private func use(_ metadata: ClipMetadata) {
        actions.playInputFeedback()

        // Images have no text form, so they always take the pasteboard path
        // regardless of the configured behavior -- typing "Image · 1170×2532"
        // into someone's message would be worse than doing nothing.
        let mustCopy = (metadata.kind == .image || metadata.kind == .unknown)
        if mustCopy || KeyboardSettings.insertBehavior == .copyToPasteboard {
            copy(metadata)
            return
        }

        guard let text = store.insertableText(for: metadata) else {
            // Text extraction failed but the bytes still exist; falling back
            // to the pasteboard is strictly better than a dead tap.
            copy(metadata)
            return
        }
        actions.insertText(text)
        show(Banner(text: "Inserted", symbol: "checkmark.circle.fill", isError: false))
    }

    private func copy(_ metadata: ClipMetadata) {
        switch actions.copyToPasteboard(metadata) {
        case .copied:
            show(Banner(text: "Copied — press and hold the field to paste", symbol: "doc.on.clipboard.fill", isError: false))
        case .needsFullAccess:
            show(Banner(text: "Needs Full Access to copy", symbol: "lock.fill", isError: true))
        case .tooLarge:
            show(Banner(text: "Too large — copy it from the app", symbol: "exclamationmark.triangle.fill", isError: true))
        case .failed:
            show(Banner(text: "Couldn't read that clip", symbol: "exclamationmark.triangle.fill", isError: true))
        }
    }

    private func show(_ newBanner: Banner) {
        banner = newBanner
        Task {
            try? await Task.sleep(for: .seconds(1.6))
            if banner == newBanner {
                banner = nil
            }
        }
    }

    private func bannerView(_ banner: Banner) -> some View {
        HStack(spacing: 6) {
            Image(systemName: banner.symbol)
            Text(banner.text)
                .lineLimit(1)
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(
            Capsule().fill(banner.isError ? Color.red.opacity(0.9) : Color.black.opacity(0.75))
        )
    }
}
