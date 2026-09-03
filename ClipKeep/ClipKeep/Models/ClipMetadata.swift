//
//  ClipMetadata.swift
//  ClipKeep
//
//  Lightweight, always-in-memory record for one history entry. The heavy
//  payload (the raw pasteboard bytes) lives on disk and is loaded lazily via
//  PersistenceStore, so the app can hold thousands of these without ever
//  paging in image or RTF data it isn't currently displaying.
//

import Foundation

struct ClipMetadata: Identifiable, Codable, Equatable {
    let id: UUID
    let createdAt: Date
    let kind: ClipKind
    /// Short, human-readable preview text shown in list rows. Always safe to
    /// display directly; already truncated at capture time.
    let previewText: String
    /// Total byte size of every representation stored for this entry, used
    /// for the storage total shown in Settings and for size-based pruning.
    let approximateByteCount: Int
    /// The UTIs captured for this entry, preserved so the detail view and
    /// copy-back logic know exactly what representations are on disk without
    /// opening the file first.
    let storedTypes: [String]
    var isPinned: Bool

    init(
        id: UUID = UUID(),
        createdAt: Date = Date(),
        kind: ClipKind,
        previewText: String,
        approximateByteCount: Int,
        storedTypes: [String],
        isPinned: Bool = false
    ) {
        self.id = id
        self.createdAt = createdAt
        self.kind = kind
        self.previewText = previewText
        self.approximateByteCount = approximateByteCount
        self.storedTypes = storedTypes
        self.isPinned = isPinned
    }
}
