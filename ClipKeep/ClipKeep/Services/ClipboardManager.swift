//
//  ClipboardManager.swift
//  ClipKeep
//
//  Owns the clip history and all interaction with UIPasteboard.
//
//  IMPORTANT PLATFORM NOTE:
//  iOS gives no app -- ClipKeep included -- a way to run in the background
//  and silently watch the system pasteboard. That is a deliberate privacy
//  boundary Apple enforces, not a limitation of this code. Instead, ClipKeep
//  checks the pasteboard's `changeCount` every time the app becomes active
//  (app switch, Home Screen, Share Sheet, etc.) and on a lightweight timer
//  while it is in the foreground, which is the same approach every
//  App-Store clipboard manager uses. Depending on iOS version and settings,
//  the system may also show its own "Allow Paste" prompt the first time a
//  given foreground session reads pasteboard contents -- that prompt comes
//  from iOS itself and cannot be suppressed or skipped by an app.
//

import Foundation
import UIKit
import Combine
import os

@MainActor
final class ClipboardManager: ObservableObject {

    @Published private(set) var items: [ClipMetadata] = []
    @Published var lastErrorMessage: String?
    @Published private(set) var totalStorageBytes: Int = 0
    @Published var toastMessage: ToastMessage?

    // MARK: - Configuration (persisted via UserDefaults)
    //
    // These are `@Published` (rather than a plain `var` with `didSet`) so
    // that Settings controls bound via `$clipboardManager.maxHistoryItems`
    // correctly redraw every dependent view when changed -- Swift does not
    // allow combining a property wrapper with `willSet`/`didSet` on the same
    // declaration, so persistence to UserDefaults is wired up as a Combine
    // subscription in `init` instead of a `didSet`.
    @Published var maxHistoryItems: Int
    @Published var retentionDays: Int

    private enum Keys {
        static let maxHistoryItems = "clipkeep.maxHistoryItems"
        static let retentionDays = "clipkeep.retentionDays"
    }

    // MARK: - Internal state

    private let pasteboard = UIPasteboard.general
    private let store: PersistenceStore
    private let logger = Logger(subsystem: "com.clipkeep.app", category: "ClipboardManager")

    private var lastKnownChangeCount: Int
    private var lastCapturedDigest: String?
    private var foregroundPollTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    init(store: PersistenceStore = .shared) {
        self.store = store
        self.lastKnownChangeCount = pasteboard.changeCount

        let defaults = UserDefaults.standard
        self.maxHistoryItems = defaults.object(forKey: Keys.maxHistoryItems) as? Int ?? 250
        self.retentionDays = defaults.object(forKey: Keys.retentionDays) as? Int ?? 0

        // Lowering the limit here only affects future captures; it does not
        // retroactively trim existing history until the next new clip comes
        // in (via enforceLimitsAndPersist()). That keeps this subscription
        // free of MainActor-isolation ceremony while still behaving
        // correctly: nothing is ever silently deleted just for opening
        // Settings.
        $maxHistoryItems
            .dropFirst()
            .removeDuplicates()
            .sink { newValue in
                UserDefaults.standard.set(newValue, forKey: Keys.maxHistoryItems)
            }
            .store(in: &cancellables)

        $retentionDays
            .dropFirst()
            .removeDuplicates()
            .sink { newValue in
                UserDefaults.standard.set(newValue, forKey: Keys.retentionDays)
            }
            .store(in: &cancellables)

        loadFromDisk()
    }

    // MARK: - Lifecycle hooks (called from ClipKeepApp)

    /// Call when the scene becomes active (foreground).
    func handleDidBecomeActive() {
        captureIfNeeded()
        startForegroundPolling()
    }

    /// Call when the scene resigns active (background/inactive).
    func handleDidResignActive() {
        stopForegroundPolling()
    }

    private func startForegroundPolling() {
        stopForegroundPolling()
        // A modest interval: frequent enough to catch a clip made in a
        // neighboring Split View / Slide Over app, gentle enough not to
        // matter for battery since it only runs while ClipKeep is frontmost.
        foregroundPollTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.captureIfNeeded()
            }
        }
    }

    private func stopForegroundPolling() {
        foregroundPollTimer?.invalidate()
        foregroundPollTimer = nil
    }

    // MARK: - Capture

    func captureIfNeeded() {
        let currentChangeCount = pasteboard.changeCount
        // Also covers the case where this change was ClipKeep copying an
        // existing entry back to the pasteboard: copyBack(_:) updates
        // lastKnownChangeCount synchronously, so that write never reaches
        // this point as a "new" change to capture.
        guard currentChangeCount != lastKnownChangeCount else { return }
        lastKnownChangeCount = currentChangeCount

        // Reading the representations is shared with the keyboard extension so
        // both capture identically; only the size limits differ, since an
        // extension is killed at a much lower memory ceiling than an app.
        guard let captured = ClipCapture.read(from: pasteboard, limits: .app) else {
            logger.notice("Pasteboard changed but produced nothing storable")
            return
        }

        if captured.digest == lastCapturedDigest {
            return
        }
        lastCapturedDigest = captured.digest

        do {
            try store.saveRepresentations(captured.representations, for: captured.metadata.id)
            items.insert(captured.metadata, at: 0)
            enforceLimitsAndPersist()
        } catch {
            logger.error("Failed to save new clip: \(error.localizedDescription, privacy: .public)")
            lastErrorMessage = error.localizedDescription
        }
    }

    // MARK: - Copy back to pasteboard (paste), byte-for-byte

    /// Restores every representation exactly as it was captured, so whatever
    /// the destination app asks the pasteboard for -- plain text, RTF,
    /// PNG/JPEG bytes, a URL -- it receives the original bytes, not a
    /// re-encoded approximation.
    func copyBack(_ metadata: ClipMetadata) {
        do {
            let representations = try store.loadRepresentations(for: metadata.id)
            guard !representations.isEmpty else {
                throw PersistenceError.itemNotFound(metadata.id)
            }
            pasteboard.items = [representations.mapValues { $0 as Any }]
            lastKnownChangeCount = pasteboard.changeCount
            lastCapturedDigest = ClipCapture.digest(for: representations)
            HapticsManager.shared.confirmSuccess()
            toastMessage = ToastMessage(text: "Copied to Clipboard", symbolName: "checkmark.circle.fill")
        } catch {
            logger.error("Failed to copy clip \(metadata.id.uuidString, privacy: .public) back to pasteboard: \(error.localizedDescription, privacy: .public)")
            lastErrorMessage = error.localizedDescription
            HapticsManager.shared.confirmWarning()
            toastMessage = ToastMessage(text: "Couldn't Copy Clip", symbolName: "exclamationmark.triangle.fill")
        }
    }

    /// Loads the raw representations for detail display without touching
    /// the live pasteboard.
    func loadRepresentations(for metadata: ClipMetadata) throws -> [String: Data] {
        try store.loadRepresentations(for: metadata.id)
    }

    // MARK: - Mutations

    func togglePinned(_ metadata: ClipMetadata) {
        guard let index = items.firstIndex(where: { $0.id == metadata.id }) else { return }
        items[index].isPinned.toggle()
        persistIndex()
        HapticsManager.shared.selectionChanged()
    }

    func delete(_ metadata: ClipMetadata) {
        items.removeAll { $0.id == metadata.id }
        store.deleteRepresentations(for: metadata.id)
        ThumbnailCache.shared.removeThumbnail(for: metadata.id)
        persistIndex()
    }

    func delete(at offsets: IndexSet, in displayedItems: [ClipMetadata]) {
        for index in offsets {
            delete(displayedItems[index])
        }
    }

    func clearAllHistory() {
        do {
            try store.clearAll()
            items.removeAll()
            ThumbnailCache.shared.removeAll()
            lastCapturedDigest = nil
            refreshStorageTotal()
            HapticsManager.shared.confirmWarning()
        } catch {
            logger.error("Failed to clear history: \(error.localizedDescription, privacy: .public)")
            lastErrorMessage = error.localizedDescription
        }
    }

    // MARK: - Persistence plumbing

    private func loadFromDisk() {
        items = store.loadIndex()
        sortItems()
        refreshStorageTotal()
    }

    private func sortItems() {
        items.sort { lhs, rhs in
            if lhs.isPinned != rhs.isPinned {
                return lhs.isPinned && !rhs.isPinned
            }
            return lhs.createdAt > rhs.createdAt
        }
    }

    private func persistIndex() {
        sortItems()
        do {
            try store.saveIndex(items)
        } catch {
            logger.error("Failed to persist index: \(error.localizedDescription, privacy: .public)")
            lastErrorMessage = error.localizedDescription
        }
        refreshStorageTotal()
    }

    private func enforceLimitsAndPersist() {
        applyRetentionPolicy()
        applyCountLimit()
        persistIndex()
    }

    private func applyRetentionPolicy() {
        guard retentionDays > 0 else { return }
        let cutoff = Calendar.current.date(byAdding: .day, value: -retentionDays, to: Date()) ?? .distantPast
        let expired = items.filter { !$0.isPinned && $0.createdAt < cutoff }
        for metadata in expired {
            store.deleteRepresentations(for: metadata.id)
            ThumbnailCache.shared.removeThumbnail(for: metadata.id)
        }
        items.removeAll { !$0.isPinned && $0.createdAt < cutoff }
    }

    private func applyCountLimit() {
        sortItems()
        let unpinned = items.filter { !$0.isPinned }
        guard unpinned.count > maxHistoryItems else { return }

        let overflow = unpinned.count - maxHistoryItems
        let toRemove = unpinned.suffix(overflow) // oldest unpinned entries, since list is newest-first
        let idsToRemove = Set(toRemove.map(\.id))
        for id in idsToRemove {
            store.deleteRepresentations(for: id)
            ThumbnailCache.shared.removeThumbnail(for: id)
        }
        items.removeAll { idsToRemove.contains($0.id) }
    }

    private func refreshStorageTotal() {
        totalStorageBytes = store.totalStorageBytes()
    }

}
