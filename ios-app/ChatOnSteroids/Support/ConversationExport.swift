import Foundation

enum ConversationExport {
    /// A conversation as portable Markdown — the format that survives being pasted
    /// anywhere else.
    static func markdown(_ conversation: Conversation, projectName: String?) -> String {
        var lines: [String] = []
        lines.append("# \(conversation.title)")
        lines.append("")

        var meta: [String] = ["Model: `\(conversation.model)`"]
        if let projectName { meta.append("Project: \(projectName)") }
        meta.append("Exported: \(Self.dateFormatter.string(from: Date()))")
        lines.append(meta.joined(separator: " · "))
        lines.append("")

        let systemPrompt = conversation.systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        if !systemPrompt.isEmpty {
            lines.append("> **System**: \(systemPrompt)")
            lines.append("")
        }

        for message in conversation.messages {
            let heading: String
            switch message.role {
            case .user: heading = "### You"
            case .assistant: heading = message.isError ? "### Error" : "### Assistant"
            case .system: heading = "### System"
            }
            lines.append(heading)

            if !message.attachments.isEmpty {
                let names = message.attachments.map { "`\($0.name)`" }.joined(separator: ", ")
                lines.append("_Attachments: \(names)_")
                lines.append("")
            }

            lines.append(message.text)
            lines.append("")
        }

        return lines.joined(separator: "\n")
    }

    /// Everything the app holds, for a manual backup.
    static func backupJSON(conversations: [Conversation], projects: [Project]) -> Data? {
        struct Backup: Encodable {
            let exportedAt: Date
            let conversations: [Conversation]
            let projects: [Project]
        }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
        return try? encoder.encode(
            Backup(exportedAt: Date(), conversations: conversations, projects: projects)
        )
    }

    /// Writes text to a temporary file so the share sheet can offer it as a document.
    static func temporaryFile(named name: String, contents: String) -> URL? {
        let safe = name
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: ":", with: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let filename = safe.isEmpty ? "conversation.md" : "\(safe).md"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        do {
            try contents.write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            return nil
        }
    }

    static func temporaryFile(named name: String, data: Data) -> URL? {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
