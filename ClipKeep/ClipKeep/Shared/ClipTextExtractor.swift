//
//  ClipTextExtractor.swift
//  ClipKeep
//
//  Turns a clip's stored representations into plain text.
//
//  Shared between the app (preview strings) and the keyboard extension
//  (the text actually typed into the field when a row is tapped), so the two
//  can never disagree about what a given clip "says". The keyboard needs the
//  full string rather than the truncated preview stored in the index, which
//  is why this reads the payload rather than using ClipMetadata.previewText.
//

import Foundation
import UIKit

enum ClipTextExtractor {

    /// The first usable plain-text representation, untouched.
    ///
    /// Deliberately not trimmed or truncated: this is the string that gets
    /// typed into someone's message, so leading indentation and trailing
    /// newlines are content, not noise.
    static func plainText(from representations: [String: Data]) -> String? {
        for type in [UTI.plainText, UTI.plainTextLegacy] {
            if let data = representations[type], let string = String(data: data, encoding: .utf8) {
                return string
            }
        }
        return nil
    }

    /// The text content of an RTF/RTFD representation, with formatting
    /// flattened away.
    static func richTextString(from representations: [String: Data]) -> String? {
        let candidates: [(String, NSAttributedString.DocumentType)] = [
            (UTI.rtf, .rtf),
            (UTI.flatRTFD, .rtfd)
        ]
        for (type, documentType) in candidates {
            guard let data = representations[type] else { continue }
            if let attributed = try? NSAttributedString(
                data: data,
                options: [.documentType: documentType],
                documentAttributes: nil
            ) {
                return attributed.string
            }
        }
        return nil
    }

    /// Best-effort text for any clip, in the order a person would expect:
    /// plain text first (it is what they copied), rich text flattened next,
    /// and a URL string last.
    ///
    /// Returns nil for image and unrecognized clips -- there is no honest
    /// text form of a screenshot, so callers put those on the pasteboard
    /// instead of typing something approximate.
    static func insertableText(from representations: [String: Data], kind: ClipKind) -> String? {
        switch kind {
        case .text:
            return plainText(from: representations)

        case .richText:
            return plainText(from: representations) ?? richTextString(from: representations)

        case .url:
            if let text = plainText(from: representations) {
                return text
            }
            // A public.url representation is a bookmark-encoded URL on some
            // sources and a bare UTF-8 string on others; try the cheap
            // reading before giving up.
            if let data = representations[UTI.url] ?? representations[UTI.fileURL],
               let string = String(data: data, encoding: .utf8),
               !string.isEmpty {
                return string
            }
            return nil

        case .image, .unknown:
            return nil
        }
    }
}
