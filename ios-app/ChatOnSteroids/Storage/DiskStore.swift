import Foundation

/// Plain JSON files under Application Support. Chat history is small, the format
/// stays inspectable and exportable, and there is no migration story to get wrong.
enum DiskStore {
    private static let folderName = "ChatOnSteroids"

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.withoutEscapingSlashes]
        return encoder
    }

    private static var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    static func directory() -> URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        let folder = base.appendingPathComponent(folderName, isDirectory: true)
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    static func load<T: Decodable>(_ type: T.Type, from name: String) -> T? {
        guard let url = directory()?.appendingPathComponent(name) else { return nil }
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? decoder.decode(type, from: data)
    }

    /// Atomic so a crash mid-write cannot leave a half-written history file behind.
    @discardableResult
    static func save<T: Encodable>(_ value: T, to name: String) -> Bool {
        guard let url = directory()?.appendingPathComponent(name) else { return false }
        guard let data = try? encoder.encode(value) else { return false }
        do {
            try data.write(to: url, options: .atomic)
            return true
        } catch {
            return false
        }
    }

    static func delete(_ name: String) {
        guard let url = directory()?.appendingPathComponent(name) else { return }
        try? FileManager.default.removeItem(at: url)
    }
}
