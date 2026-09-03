//
//  PersistenceStore.swift
//  ClipKeep
//
//  Disk layout:
//    Application Support/ClipKeep/index.json        -> [ClipMetadata]
//    Application Support/ClipKeep/Items/<uuid>.plist -> [String: Data]
//
//  The index is small and cheap to keep fully in memory. Each item's raw
//  pasteboard representations (which can be multi-megabyte for images) are
//  written as their own binary property list and only read back on demand
//  (copy-back or the detail view). Binary plist is used instead of JSON so
//  the `Data` payloads are stored as raw bytes rather than base64 text,
//  which roughly costs a third less disk and avoids an extra encode/decode
//  pass on large images.
//

import Foundation
import os

enum PersistenceError: LocalizedError {
    case directoryCreationFailed(underlying: Error)
    case encodingFailed(underlying: Error)
    case writeFailed(underlying: Error)
    case readFailed(underlying: Error)
    case itemNotFound(UUID)

    var errorDescription: String? {
        switch self {
        case .directoryCreationFailed(let underlying):
            return "Could not create ClipKeep's storage folder: \(underlying.localizedDescription)"
        case .encodingFailed(let underlying):
            return "Could not encode clip data: \(underlying.localizedDescription)"
        case .writeFailed(let underlying):
            return "Could not write clip data to disk: \(underlying.localizedDescription)"
        case .readFailed(let underlying):
            return "Could not read clip data from disk: \(underlying.localizedDescription)"
        case .itemNotFound(let id):
            return "No stored data was found for clip \(id.uuidString)."
        }
    }
}

/// Handles all reading and writing of clip history to disk. Every public
/// method is safe to call from any thread; callers that mutate state
/// serially (as `ClipboardManager` does, on the main actor) get atomic,
/// non-corrupting writes courtesy of `Data.write(options: .atomic)`.
final class PersistenceStore {

    static let shared = PersistenceStore()

    private let logger = Logger(subsystem: "com.clipkeep.app", category: "PersistenceStore")
    private let fileManager = FileManager.default

    private let rootDirectory: URL
    private let itemsDirectory: URL
    private let indexURL: URL

    private init() {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        rootDirectory = appSupport.appendingPathComponent("ClipKeep", isDirectory: true)
        itemsDirectory = rootDirectory.appendingPathComponent("Items", isDirectory: true)
        indexURL = rootDirectory.appendingPathComponent("index.json")

        do {
            try fileManager.createDirectory(at: itemsDirectory, withIntermediateDirectories: true)
            // Exclude our storage from iCloud/iTunes device backups: clipboard
            // contents can include sensitive data the user never intended to
            // export off-device via a backup.
            var excluded = rootDirectory
            var resourceValues = URLResourceValues()
            resourceValues.isExcludedFromBackup = true
            try? excluded.setResourceValues(resourceValues)
        } catch {
            logger.fault("Failed to create storage directories: \(error.localizedDescription, privacy: .public)")
        }
    }

    // MARK: - Index

    /// Loads the metadata index. Returns an empty array (rather than
    /// throwing) when no history exists yet, which is the normal state on
    /// first launch.
    func loadIndex() -> [ClipMetadata] {
        guard fileManager.fileExists(atPath: indexURL.path) else { return [] }
        do {
            let data = try Data(contentsOf: indexURL)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode([ClipMetadata].self, from: data)
        } catch {
            logger.error("Failed to load index, starting fresh: \(error.localizedDescription, privacy: .public)")
            // A corrupt index should never crash the app or wipe the user's
            // item files; we simply present an empty list. The orphaned item
            // files are harmless and will be cleaned up on the next
            // clearAll() call.
            return []
        }
    }

    func saveIndex(_ metadata: [ClipMetadata]) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        do {
            let data = try encoder.encode(metadata)
            try data.write(to: indexURL, options: .atomic)
        } catch let error as EncodingError {
            throw PersistenceError.encodingFailed(underlying: error)
        } catch {
            throw PersistenceError.writeFailed(underlying: error)
        }
    }

    // MARK: - Item payloads

    private func itemURL(for id: UUID) -> URL {
        itemsDirectory.appendingPathComponent(id.uuidString).appendingPathExtension("plist")
    }

    /// Persists the raw pasteboard representations for one clip. `data` maps
    /// a UTI string (e.g. "public.utf8-plain-text") to the exact bytes the
    /// pasteboard returned for that type -- nothing is re-encoded.
    func saveRepresentations(_ data: [String: Data], for id: UUID) throws {
        let encoder = PropertyListEncoder()
        encoder.outputFormat = .binary
        do {
            let encoded = try encoder.encode(data)
            try encoded.write(to: itemURL(for: id), options: .atomic)
        } catch let error as EncodingError {
            throw PersistenceError.encodingFailed(underlying: error)
        } catch {
            throw PersistenceError.writeFailed(underlying: error)
        }
    }

    /// Loads back the exact representations previously saved for `id`.
    func loadRepresentations(for id: UUID) throws -> [String: Data] {
        let url = itemURL(for: id)
        guard fileManager.fileExists(atPath: url.path) else {
            throw PersistenceError.itemNotFound(id)
        }
        do {
            let raw = try Data(contentsOf: url)
            let decoder = PropertyListDecoder()
            return try decoder.decode([String: Data].self, from: raw)
        } catch let error as DecodingError {
            throw PersistenceError.encodingFailed(underlying: error)
        } catch {
            throw PersistenceError.readFailed(underlying: error)
        }
    }

    func deleteRepresentations(for id: UUID) {
        let url = itemURL(for: id)
        guard fileManager.fileExists(atPath: url.path) else { return }
        do {
            try fileManager.removeItem(at: url)
        } catch {
            logger.error("Failed to delete stored item \(id.uuidString, privacy: .public): \(error.localizedDescription, privacy: .public)")
        }
    }

    /// Deletes every stored item file and resets the index. Used by "Clear
    /// All History" in Settings.
    func clearAll() throws {
        if fileManager.fileExists(atPath: itemsDirectory.path) {
            let contents = try fileManager.contentsOfDirectory(at: itemsDirectory, includingPropertiesForKeys: nil)
            for url in contents {
                try? fileManager.removeItem(at: url)
            }
        }
        try saveIndex([])
    }

    /// Total bytes currently used on disk by clip payloads, used for the
    /// storage figure shown in Settings.
    func totalStorageBytes() -> Int {
        guard let contents = try? fileManager.contentsOfDirectory(
            at: itemsDirectory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) else { return 0 }

        return contents.reduce(0) { total, url in
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
            return total + size
        }
    }
}
