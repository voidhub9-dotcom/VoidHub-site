import Foundation
import UIKit
import UniformTypeIdentifiers

enum AttachmentBuilder {
    /// Full-resolution camera images are several megabytes, and base64 adds another
    /// third on top. Downscale and re-encode before anything goes near a request body.
    static let maxImageDimension: CGFloat = 1280
    static let jpegQuality: CGFloat = 0.72
    static let maxTextBytes = 256 * 1024

    static func image(from data: Data, name: String) -> Attachment? {
        guard let original = UIImage(data: data) else { return nil }
        let resized = downscale(original, maxDimension: maxImageDimension)
        guard let encoded = resized.jpegData(compressionQuality: jpegQuality) else { return nil }
        return Attachment(
            kind: .image,
            name: name.isEmpty ? "image.jpg" : name,
            mimeType: "image/jpeg",
            payload: encoded.base64EncodedString(),
            byteCount: encoded.count
        )
    }

    static func text(from data: Data, name: String) -> Attachment? {
        let clipped = data.count > maxTextBytes ? data.prefix(maxTextBytes) : data.prefix(data.count)
        guard var string = String(data: Data(clipped), encoding: .utf8) else { return nil }
        if data.count > maxTextBytes {
            string += "\n\n[truncated — file is \(ByteCountFormatter.string(fromByteCount: Int64(data.count), countStyle: .file))]"
        }
        return Attachment(
            kind: .text,
            name: name.isEmpty ? "file.txt" : name,
            mimeType: "text/plain",
            payload: string,
            byteCount: data.count
        )
    }

    /// Decides which of the two an arbitrary picked file should become.
    static func make(from data: Data, name: String, type: UTType?) -> Attachment? {
        if let type, type.conforms(to: .image) {
            return image(from: data, name: name)
        }
        if UIImage(data: data) != nil {
            return image(from: data, name: name)
        }
        return text(from: data, name: name)
    }

    private static func downscale(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > maxDimension, longest > 0 else { return image }

        let scale = maxDimension / longest
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: target, format: format)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
