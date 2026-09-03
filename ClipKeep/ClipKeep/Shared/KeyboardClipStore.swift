//
//  KeyboardClipStore.swift
//  ClipKeep
//
//  The keyboard's clip history.
//
//  Deliberately not ClipboardManager: that type owns a foreground poll timer
//  and a lot of app-lifecycle state, all of which is wrong inside a keyboard
//  extension that is memory-capped and lives for seconds at a time.
//
//  STORAGE MODES
//
//  Which store this reads depends on what the build was actually signed with,
//  and it is not a detail that can be assumed away:
//
//   * `.shared` -- the App Group container is reachable, so the keyboard and
//     the app read and write one history. This is the good case.
//
//   * `.standalone` -- no App Group. Sideloading with a free Apple ID cannot
//     provision one (App Groups need a paid Apple Developer account), so most
//     re-signed builds land here with the entitlement stripped. Rather than
//     showing an empty list and an apology, the keyboard falls back to its
//     own container -- extensions get one, separate from the app's -- and
//     fills it by reading the pasteboard itself whenever it opens. The result
//     is a keyboard that works on its own out of the box; the only thing lost
//     is that its history and the app's are separate.
//
//   * `.locked` -- no Full Access. Nothing works: iOS denies a sandboxed
//     keyboard both shared containers and UIPasteboard, so there is nothing
//     to read and nothing to fall back to. This is the one case that really
//     is a dead end, and the only one the UI presents as such.
//

import Foundation
import Combine
import UIKit
import os

// Intentionally not @MainActor. Every caller is already on the main thread
// (SwiftUI bodies and UIInputViewController lifecycle methods both are), and
// leaving the type non-isolated means the plain closures in KeyboardActions
// can call into it without hopping actors on every keystroke.
final class KeyboardClipStore: ObservableObject {

    /// Where this keyboard's clips are coming from.
    enum StorageMode: Equatable {
        case shared
        case standalone
        case locked

        var isUsable: Bool { self != .locked }
    }

    @Published private(set) var items: [ClipMetadata] = []
    @Published private(set) var mode: StorageMode = .locked
    /// Set through `setFavoritesOnly(_:)` rather than directly. Swift does not
    /// accept a property wrapper and a `didSet` on the same declaration (the
    /// same constraint ClipboardManager works around with Combine), so the
    /// write-through to shared defaults lives in an explicit setter.
    @Published private(set) var showFavoritesOnly: Bool

    /// Cap on the standalone history. The app's own limit is user-configurable
    /// and lives in ClipboardManager; the keyboard cannot show a settings
    /// screen, so it takes a fixed, conservative number.
    private static let standaloneHistoryLimit = 100

    private var allItems: [ClipMetadata] = []
    private var lastKnownChangeCount: Int?
    private let store: PersistenceStore
    private let capturesPasteboard: Bool
    private let logger = Logger(subsystem: "com.clipkeep.app", category: "KeyboardClipStore")

    /// - Parameter capturesPasteboard: whether this instance may write new
    ///   clips. True in the keyboard extension, which is the only writer in
    ///   standalone mode. False in the app's Preview tab: there ClipboardManager
    ///   already owns capture, and a second writer rewriting the same index
    ///   file from the same process would race it and lose entries.
    init(store: PersistenceStore = .shared, capturesPasteboard: Bool = true) {
        self.store = store
        self.capturesPasteboard = capturesPasteboard
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

    /// Reloads from whichever store applies, and in standalone mode also picks
    /// up anything copied since the keyboard was last on screen.
    ///
    /// Cheap enough to call on every appearance: the index is one small JSON
    /// file, and clip payloads are only read when a row is tapped.
    func reload(hasFullAccess: Bool) {
        mode = resolveMode(hasFullAccess: hasFullAccess)

        guard mode.isUsable else {
            allItems = []
            items = []
            return
        }

        // In standalone mode nothing else writes to this store, so the
        // keyboard has to do the capturing as well as the reading.
        if capturesPasteboard, mode == .standalone {
            captureFromPasteboard()
        }

        allItems = store.loadIndex().sorted { lhs, rhs in
            if lhs.isPinned != rhs.isPinned {
                return lhs.isPinned && !rhs.isPinned
            }
            return lhs.createdAt > rhs.createdAt
        }
        applyFilter()
    }

    private func resolveMode(hasFullAccess: Bool) -> StorageMode {
        guard hasFullAccess else { return .locked }
        return AppGroup.isAvailable ? .shared : .standalone
    }

    private func applyFilter() {
        items = showFavoritesOnly ? allItems.filter(\.isPinned) : allItems
    }

    /// True when the history is genuinely empty rather than filtered down to
    /// nothing -- the two need different empty-state copy.
    var hasAnyClips: Bool { !allItems.isEmpty }

    // MARK: - Capture (standalone mode)

    /// Pulls whatever is on the pasteboard now into the keyboard's own
    /// history.
    ///
    /// Guarded by `changeCount`, which is free to read and does not trigger
    /// the system paste prompt; only an actual change gets as far as reading
    /// bytes. Called on every appearance and from the reload button.
    @discardableResult
    func captureFromPasteboard() -> Bool {
        let pasteboard = UIPasteboard.general
        let currentChangeCount = pasteboard.changeCount

        // First run in this process: record the counter but still capture, so
        // opening the keyboard for the very first time picks up whatever the
        // user already has copied rather than looking broken.
        let isFirstLook = (lastKnownChangeCount == nil)
        guard isFirstLook || currentChangeCount != lastKnownChangeCount else { return false }
        lastKnownChangeCount = currentChangeCount

        guard let captured = ClipCapture.read(from: pasteboard, limits: .keyboard) else { return false }

        var index = store.loadIndex()

        // Skip a clip already sitting at the top. Comparing preview text and
        // byte count rather than re-hashing every stored payload keeps this
        // cheap; an exact digest match would mean loading each item's bytes
        // back off disk on every keyboard appearance.
        if let newest = index.max(by: { $0.createdAt < $1.createdAt }),
           newest.previewText == captured.metadata.previewText,
           newest.approximateByteCount == captured.metadata.approximateByteCount {
            return false
        }

        do {
            try store.saveRepresentations(captured.representations, for: captured.metadata.id)
            index.insert(captured.metadata, at: 0)
            index = pruned(index)
            try store.saveIndex(index)
            return true
        } catch {
            logger.error("Keyboard capture failed: \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    /// Trims the standalone history to its cap, oldest unpinned clips first,
    /// deleting their payloads so the extension's container doesn't grow
    /// without bound.
    private func pruned(_ index: [ClipMetadata]) -> [ClipMetadata] {
        let unpinned = index.filter { !$0.isPinned }
        guard unpinned.count > Self.standaloneHistoryLimit else { return index }

        let overflow = unpinned.count - Self.standaloneHistoryLimit
        let oldest = unpinned.sorted { $0.createdAt > $1.createdAt }.suffix(overflow)
        let doomed = Set(oldest.map(\.id))
        for id in doomed {
            store.deleteRepresentations(for: id)
        }
        return index.filter { !doomed.contains($0.id) }
    }

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

    /// Puts every stored representation back on the system pasteboard, byte
    /// for byte -- the path used for images, which cannot be typed into a
    /// text field.
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
            // Our own write bumps the counter; recording it here stops the
            // next appearance from re-capturing the clip we just pasted.
            lastKnownChangeCount = UIPasteboard.general.changeCount
            return true
        } catch {
            logger.error("Keyboard could not copy clip \(metadata.id.uuidString, privacy: .public): \(error.localizedDescription, privacy: .public)")
            return false
        }
    }
}
