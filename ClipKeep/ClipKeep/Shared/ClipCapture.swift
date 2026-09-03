//
//  ClipCapture.swift
//  ClipKeep
//
//  Reading the system pasteboard into a storable clip.
//
//  Shared by the app and the keyboard so both capture identically. The
//  keyboard needs its own capture path for one specific reason: App Groups
//  require a paid Apple Developer account, so a sideloaded build signed with
//  a free Apple ID has the group entitlement stripped and the keyboard cannot
//  see the app's history at all. Rather than showing a dead end in that case,
//  the keyboard keeps its own history in its own container -- and to fill
//  that history it has to read the pasteboard itself.
//
//  Limits differ per caller. The app can afford a 20 MB representation; a
//  keyboard extension, running under a much tighter memory ceiling, cannot,
//  and being killed mid-tap reads to the user as a crash.
//

import Foundation
import UIKit
import CryptoKit

/// One clip read off the pasteboard, before anything has been written to disk.
struct CapturedClip {
    let metadata: ClipMetadata
    let representations: [String: Data]
    /// SHA-256 over the captured bytes, used to recognise a repeat of the
    /// clip already at the top of the history.
    let digest: String
}

enum ClipCapture {

    struct Limits {
        /// Any single representation larger than this is dropped. The rest of
        /// the clip is still kept -- one unusual oversized UTI shouldn't cost
        /// you the plain text alongside it.
        let maxRepresentationBytes: Int
        /// Combined across all representations. Over this, the clip is skipped.
        let maxTotalBytes: Int

        static let app = Limits(
            maxRepresentationBytes: 20 * 1024 * 1024,
            maxTotalBytes: 40 * 1024 * 1024
        )

        /// Deliberately an order of magnitude smaller. An extension that gets
        /// jetsammed while capturing takes the keyboard down with it.
        static let keyboard = Limits(
            maxRepresentationBytes: 2 * 1024 * 1024,
            maxTotalBytes: 4 * 1024 * 1024
        )
    }

    /// Reads every representation the pasteboard offers, byte for byte.
    ///
    /// Returns nil when there is nothing usable to store. Callers are expected
    /// to have checked `changeCount` first: reading representation *data* is
    /// what triggers the system's "Allow Paste" prompt, whereas reading the
    /// change counter does not.
    static func read(from pasteboard: UIPasteboard, limits: Limits) -> CapturedClip? {
        guard pasteboard.numberOfItems > 0 else { return nil }

        let availableTypes = Set(pasteboard.types)
        guard !availableTypes.isEmpty else { return nil }

        var representations: [String: Data] = [:]
        var totalBytes = 0
        for type in availableTypes {
            guard let data = pasteboard.data(forPasteboardType: type) else { continue }
            guard data.count <= limits.maxRepresentationBytes else { continue }
            representations[type] = data
            totalBytes += data.count
        }

        guard !representations.isEmpty, totalBytes <= limits.maxTotalBytes else { return nil }

        let kind = UTI.classify(availableTypes)
        let metadata = ClipMetadata(
            kind: kind,
            previewText: makePreview(kind: kind, representations: representations),
            approximateByteCount: totalBytes,
            storedTypes: Array(representations.keys).sorted()
        )

        return CapturedClip(
            metadata: metadata,
            representations: representations,
            digest: digest(for: representations)
        )
    }

    // MARK: - Hashing

    static func digest(for representations: [String: Data]) -> String {
        var hasher = SHA256()
        for key in representations.keys.sorted() {
            hasher.update(data: Data(key.utf8))
            if let data = representations[key] {
                hasher.update(data: data)
            }
        }
        return hasher.finalize().compactMap { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Preview text

    static func makePreview(kind: ClipKind, representations: [String: Data]) -> String {
        switch kind {
        case .text:
            return previewFromPlainText(representations) ?? "(Empty text)"

        case .richText:
            if let flattened = ClipTextExtractor.richTextString(from: representations) {
                return truncate(flattened)
            }
            return previewFromPlainText(representations) ?? "Formatted text"

        case .url:
            return previewFromPlainText(representations) ?? "Link"

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

    static func previewFromPlainText(_ representations: [String: Data]) -> String? {
        guard let text = ClipTextExtractor.plainText(from: representations) else { return nil }
        return truncate(text)
    }

    static func truncate(_ string: String, limit: Int = 400) -> String {
        let collapsed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        if collapsed.count <= limit {
            return collapsed
        }
        let endIndex = collapsed.index(collapsed.startIndex, offsetBy: limit)
        return String(collapsed[collapsed.startIndex..<endIndex]) + "…"
    }
}
