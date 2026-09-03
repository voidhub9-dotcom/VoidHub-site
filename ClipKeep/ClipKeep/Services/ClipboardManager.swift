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
import CryptoKit
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

    /// Any single pasteboard representation larger than this is dropped
    /// (not the whole clip -- other representations of the same clip are
    /// still kept) to avoid one giant, unusual UTI blowing out storage.
    private let maxRepresentationBytes = 20 * 1024 * 1024 // 20 MB
    /// Combined size across all representations of one clip. Clips larger
    /// than this are not captured at all.
    private let maxItemTotalBytes = 40 * 1024 * 1024 // 40 MB

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

        guard pasteboard.numberOfItems > 0 else { return }

        let availableTypes = Set(pasteboard.types)
        guard !availableTypes.isEmpty else { return }

        var representations: [String: Data] = [:]
        var totalBytes = 0
        for type in availableTypes {
            guard let data = pasteboard.data(forPasteboardType: type) else { continue }
            guard data.count <= maxRepresentationBytes else {
                logger.notice("Dropping oversized representation \(type, privacy: .public): \(data.count) bytes")
                continue
            }
            representations[type] = data
            totalBytes += data.count
        }

        guard !representations.isEmpty else {
            logger.notice("Pasteboard changed but produced no readable representation (types: \(availableTypes.joined(separator: ","), privacy: .public))")
            return
        }
        guard totalBytes <= maxItemTotalBytes else {
            logger.notice("Skipping clip: \(totalBytes) bytes exceeds the \(self.maxItemTotalBytes)-byte limit")
            return
        }

        let digest = Self.digest(for: representations)
        if digest == lastCapturedDigest {
            return
        }
        lastCapturedDigest = digest

        let kind = UTI.classify(availableTypes)
        let preview = Self.makePreview(kind: kind, representations: representations)

        let metadata = ClipMetadata(
            kind: kind,
            previewText: preview,
            approximateByteCount: totalBytes,
            storedTypes: Array(representations.keys).sorted()
        )

        do {
            try store.saveRepresentations(representations, for: metadata.id)
            items.insert(metadata, at: 0)
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
            lastCapturedDigest = Self.digest(for: representations)
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

    // MARK: - Preview / hashing helpers

    private static func digest(for representations: [String: Data]) -> String {
        var hasher = SHA256()
        for key in representations.keys.sorted() {
            hasher.update(data: Data(key.utf8))
            if let data = representations[key] {
                hasher.update(data: data)
            }
        }
        return hasher.finalize().compactMap { String(format: "%02x", $0) }.joined()
    }

    private static func makePreview(kind: ClipKind, representations: [String: Data]) -> String {
        switch kind {
        case .text:
            return previewFromPlainText(representations) ?? "(Empty text)"

        case .richText:
            if let rtfData = representations[UTI.rtf],
               let attributed = try? NSAttributedString(
                    data: rtfData,
                    options: [.documentType: NSAttributedString.DocumentType.rtf],
                    documentAttributes: nil
               ) {
                return truncate(attributed.string)
            }
            if let rtfdData = representations[UTI.flatRTFD],
               let attributed = try? NSAttributedString(
                    data: rtfdData,
                    options: [.documentType: NSAttributedString.DocumentType.rtfd],
                    documentAttributes: nil
               ) {
                return truncate(attributed.string)
            }
            return previewFromPlainText(representations) ?? "Formatted text"

        case .url:
            if let text = previewFromPlainText(representations) {
                return text
            }
            return "Link"

        case .image:
            guard let imageData = representations.first(where: { UTI.imageTypes.contains($0.key) })?.value,
                  let image = UIImage(data: imageData) else {
                return "Image"
            }
            let pixelWidth = Int(image.size.width * image.scale)
            let pixelHeight = Int(image.size.height * image.scale)
            let kb = imageData.count / 1024
            return "Image · \(pixelWidth)×\(pixelHeight) · \(kb) KB"

        case .unknown:
            let typeList = representations.keys.sorted().joined(separator: ", ")
            return "Unsupported content (\(typeList))"
        }
    }

    /// Delegates to the shared extractor so the preview shown in the app and
    /// the text the keyboard actually inserts can never disagree about what a
    /// clip says. (It also fixes a latent wrinkle: this used to iterate
    /// `UTI.textTypes`, a Set, so which representation won was unspecified
    /// when a clip carried both. The extractor checks them in a fixed order.)
    private static func previewFromPlainText(_ representations: [String: Data]) -> String? {
        guard let text = ClipTextExtractor.plainText(from: representations) else { return nil }
        return truncate(text)
    }

    private static func truncate(_ string: String, limit: Int = 400) -> String {
        let collapsed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        if collapsed.count <= limit {
            return collapsed
        }
        let endIndex = collapsed.index(collapsed.startIndex, offsetBy: limit)
        return String(collapsed[collapsed.startIndex..<endIndex]) + "…"
    }
}
