//
//  UTIConstants.swift
//  ClipKeep
//
//  Central list of the Uniform Type Identifiers ClipKeep understands. Kept
//  as plain string constants (rather than the newer UniformTypeIdentifiers
//  framework) so the app keeps working unmodified back to its deployment
//  target and so the exact byte-for-byte strings pasteboard APIs hand back
//  are never re-derived or normalized.
//

import Foundation

enum UTI {
    static let plainText = "public.utf8-plain-text"
    static let plainTextLegacy = "public.text"
    static let rtf = "public.rtf"
    static let flatRTFD = "com.apple.flat-rtfd"
    static let url = "public.url"
    static let fileURL = "public.file-url"
    static let png = "public.png"
    static let jpeg = "public.jpeg"
    static let tiff = "public.tiff"
    static let gif = "com.compuserve.gif"
    static let heic = "public.heic"

    static let textTypes: Set<String> = [plainText, plainTextLegacy]
    static let richTextTypes: Set<String> = [rtf, flatRTFD]
    static let imageTypes: Set<String> = [png, jpeg, tiff, gif, heic]
    static let urlTypes: Set<String> = [url, fileURL]

    /// Types ClipKeep will actively classify. Anything else captured on the
    /// pasteboard is still stored (for exact paste-back) but surfaces as
    /// `.unknown` in the UI.
    static let recognizedTypes: Set<String> = textTypes
        .union(richTextTypes)
        .union(imageTypes)
        .union(urlTypes)

    /// Picks the best `ClipKind` for a set of captured UTIs, in priority
    /// order. Rich text and images are the most "specific" signals, so they
    /// win over a plain-text fallback that many apps attach alongside them.
    static func classify(_ types: Set<String>) -> ClipKind {
        if !types.isDisjoint(with: imageTypes) { return .image }
        if !types.isDisjoint(with: richTextTypes) { return .richText }
        if !types.isDisjoint(with: urlTypes) { return .url }
        if !types.isDisjoint(with: textTypes) { return .text }
        return .unknown
    }
}
