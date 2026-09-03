//
//  KeyboardClipStore.swift
//  ClipKeep
//
//  The keyboard's read-only view of the clip history.
//
//  Deliberately not ClipboardManager: that type owns capture, runs a
//  foreground poll timer, and talks to UIPasteboard on every state change --
//  all of which are wrong inside a keyboard extension, which is memory-capped
//  (extensions get killed well before an app would), lives for seconds at a
//  time, and should never trigger a system paste prompt just by opening.
//  This reads the index, loads one payload on demand, and nothing else.
//

import Foundation
import Combine
import UIKit
import os

// Intentionally not @MainActor. Every caller is already on the main thread
// (SwiftUI bodies and UIInputViewController lifecycle methods both are), and
// leaving the type non-isolated means the plain closures in KeyboardActions
// can call into it without the extension having to hop actors on every
// keystroke.
final class KeyboardClipStore: ObservableObject {

    /// Clips to show, already filtered and ordered for display.
    @Published private(set) var items: [ClipMetadata] = []
    /// Set when the shared container can't be reached, so the UI can explain
    /// why the list is empty instead of implying the history was lost.
    @Published private(set) var accessProblem: AccessProblem?
    /// Set through `setFavoritesOnly(_:)` rather than directly. Swift does not
    /// accept a property wrapper and a `didSet` on the same declaration (the
    /// same constraint ClipboardManager works around with Combine), so the
    /// write-through to shared defaults lives in an explicit setter.
    @Published private(set) var showFavoritesOnly: Bool

    enum AccessProblem: Equatable {
        /// The extension is running without Full Access, so iOS is denying it
        /// the shared container.
        case needsFullAccess
        /// Entitled but the container still isn't there -- typically an
        /// unsigned or re-signed build whose App Group wasn't applied.
        case containerUnavailable

        var title: String {
            switch self {
            case .needsFullAccess: return "Full Access Needed"
            case .containerUnavailable: return "No Shared Storage"
            }
        }

        var message: String {
            switch self {
            case .needsFullAccess:
                return "Turn on Allow Full Access for the ClipKeep keyboard in Settings › General › Keyboard › Keyboards › ClipKeep. iOS blocks keyboards from reading shared app data until you do."
            case .containerUnavailable:
                return "This build isn't entitled to ClipKeep's App Group, so the keyboard can't see your clips. Re-sign the app with the group entitlement enabled."
            }
        }
    }

    private var allItems: [ClipMetadata] = []
    private let store: PersistenceStore
    private let logger = Logger(subsystem: "com.clipkeep.app", category: "KeyboardClipStore")

    init(store: PersistenceStore = .shared) {
        self.store = store
        self.showFavoritesOnly = KeyboardSettings.favoritesOnly
    }

    /// Changes the filter and remembers the choice, so the keyboard opens on
    /// whichever list was last in use.
    func setFavoritesOnly(_ value: Bool) {
        guard showFavoritesOnly != value else { return }
        showFavoritesOnly = value
        KeyboardSettings.favoritesOnly = value
        applyFilter()
    }

    // MARK: - Loading

    /// Reloads from disk. Cheap enough to call every time the keyboard
    /// appears: the index is a single small JSON file, and clip payloads are
    /// only read when a row is actually tapped.
    func reload(hasFullAccess: Bool) {
        guard AppGroup.isAvailable else {
            accessProblem = hasFullAccess ? .containerUnavailable : .needsFullAccess
            allItems = []
            items = []
            return
        }
        accessProblem = nil
        allItems = store.loadIndex().sorted { lhs, rhs in
            if lhs.isPinned != rhs.isPinned {
                return lhs.isPinned && !rhs.isPinned
            }
            return lhs.createdAt > rhs.createdAt
        }
        applyFilter()
    }

    private func applyFilter() {
        items = showFavoritesOnly ? allItems.filter(\.isPinned) : allItems
    }

    /// True when the history is genuinely empty rather than filtered down to
    /// nothing -- the two need different empty-state copy.
    var hasAnyClips: Bool { !allItems.isEmpty }

    // MARK: - Using a clip

    /// The full text of a clip, read from its payload rather than the
    /// truncated preview in the index.
    func insertableText(for metadata: ClipMetadata) -> String? {
        do {
            let representations = try store.loadRepresentations(for: metadata.id)
            return ClipTextExtractor.insertableText(from: representations, kind: metadata.kind)
        } catch {
            logger.error("Keyboard could not read clip \(metadata.id.uuidString, privacy: .public): \(error.localizedDescription, privacy: .public)")
            return nil
        }
    }

    /// Puts every stored representation of a clip back on the system
    /// pasteboard, byte for byte -- the path used for images, which cannot be
    /// typed into a text field.
    ///
    /// Requires Full Access: UIPasteboard is off-limits to a sandboxed
    /// keyboard. Returns false when the write couldn't happen so the caller
    /// can say so instead of silently doing nothing.
    @discardableResult
    func copyToPasteboard(_ metadata: ClipMetadata, hasFullAccess: Bool) -> Bool {
        guard hasFullAccess else { return false }
        do {
            let representations = try store.loadRepresentations(for: metadata.id)
            guard !representations.isEmpty else { return false }
            UIPasteboard.general.items = [representations.mapValues { $0 as Any }]
            return true
        } catch {
            logger.error("Keyboard could not copy clip \(metadata.id.uuidString, privacy: .public): \(error.localizedDescription, privacy: .public)")
            return false
        }
    }
}
