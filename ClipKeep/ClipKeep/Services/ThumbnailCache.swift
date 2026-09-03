//
//  ThumbnailCache.swift
//  ClipKeep
//
//  Decoding a full-resolution image from disk for every row in a long
//  history list is wasteful. This cache holds downscaled UIImages keyed by
//  clip id, built once and reused for as long as memory allows -- NSCache
//  evicts entries automatically under memory pressure, so there is no
//  unbounded growth to manage by hand.
//

import Foundation
import UIKit

/// `NSCache` is documented as thread-safe for concurrent access, and every
/// method here either reads/writes through it directly or performs
/// stateless, thread-safe image rendering (`UIGraphicsImageRenderer`) -- so
/// it is safe to call from the background task that builds thumbnails as
/// well as from the main actor that displays them. `@unchecked Sendable`
/// documents that guarantee to the compiler explicitly rather than relying
/// on the current project's concurrency-checking level to stay lenient.
final class ThumbnailCache: @unchecked Sendable {

    static let shared = ThumbnailCache()

    private let cache = NSCache<NSString, UIImage>()

    private init() {
        cache.countLimit = 300
        cache.totalCostLimit = 64 * 1024 * 1024 // ~64 MB of decoded pixel data
    }

    func thumbnail(for id: UUID) -> UIImage? {
        cache.object(forKey: id.uuidString as NSString)
    }

    func store(_ image: UIImage, for id: UUID) {
        let cost = Int(image.size.width * image.size.height * 4 * image.scale * image.scale)
        cache.setObject(image, forKey: id.uuidString as NSString, cost: max(cost, 1))
    }

    /// Builds and caches a thumbnail from raw image bytes, downscaling to
    /// keep memory bounded regardless of the source resolution.
    @discardableResult
    func makeThumbnail(from data: Data, id: UUID, maxDimension: CGFloat = 240) -> UIImage? {
        if let cached = thumbnail(for: id) {
            return cached
        }
        guard let source = UIImage(data: data) else { return nil }

        let scaleFactor = min(1, maxDimension / max(source.size.width, source.size.height))
        let targetSize = CGSize(
            width: max(1, source.size.width * scaleFactor),
            height: max(1, source.size.height * scaleFactor)
        )

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let scaled = renderer.image { _ in
            source.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        store(scaled, for: id)
        return scaled
    }

    func removeThumbnail(for id: UUID) {
        cache.removeObject(forKey: id.uuidString as NSString)
    }

    func removeAll() {
        cache.removeAllObjects()
    }
}
