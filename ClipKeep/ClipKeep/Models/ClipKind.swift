//
//  ClipKind.swift
//  ClipKeep
//
//  Classifies a captured clipboard entry so the UI can pick an icon and a
//  sensible preview strategy without inspecting raw UTI strings everywhere.
//

import Foundation

/// High-level classification of a clipboard entry, derived from the set of
/// Uniform Type Identifiers (UTIs) present on the pasteboard at capture time.
enum ClipKind: String, Codable, CaseIterable, Equatable, Hashable {
    case text
    case richText
    case url
    case image
    case unknown

    /// SF Symbol used to represent this kind in list rows and detail views.
    var symbolName: String {
        switch self {
        case .text: return "doc.plaintext"
        case .richText: return "doc.richtext"
        case .url: return "link"
        case .image: return "photo"
        case .unknown: return "questionmark.square.dashed"
        }
    }

    /// Human readable label used in accessibility hints and empty previews.
    var displayName: String {
        switch self {
        case .text: return "Text"
        case .richText: return "Rich Text"
        case .url: return "Link"
        case .image: return "Image"
        case .unknown: return "Unsupported"
        }
    }
}
