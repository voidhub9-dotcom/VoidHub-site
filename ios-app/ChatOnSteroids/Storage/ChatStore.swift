import Foundation
import Observation

/// Everything the app persists, in memory on the main actor and mirrored to disk.
///
/// Mutations go through methods rather than property observers so that every write
/// has exactly one place that also schedules the save.
@MainActor
@Observable
final class ChatStore {
    private enum File {
        static let conversations = "conversations.json"
        static let projects = "projects.json"
        static let settings = "settings.json"
    }

    private(set) var conversations: [Conversation] = []
    private(set) var projects: [Project] = []
    private(set) var settings = AppSettings()
    /// One key per provider, so switching between them keeps both.
    private(set) var keysByProvider: [ProviderKind: String] = [:]

    @ObservationIgnored private var saveTask: Task<Void, Never>?

    init() {
        load()
    }

    // MARK: - Loading

    private func load() {
        settings = DiskStore.load(AppSettings.self, from: File.settings) ?? AppSettings()
        projects = DiskStore.load([Project].self, from: File.projects) ?? []
        conversations = DiskStore.load([Conversation].self, from: File.conversations) ?? []
        for provider in ProviderKind.allCases {
            keysByProvider[provider] = Keychain.get(.forProvider(provider)) ?? ""
        }
        pruneExpiredHistory()
        sortConversations()
    }

    private func pruneExpiredHistory() {
        let days = settings.historyRetentionDays
        guard days > 0 else { return }
        guard let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) else { return }
        let before = conversations.count
        conversations.removeAll { !$0.isPinned && $0.lastActivity < cutoff }
        if conversations.count != before { scheduleSave() }
    }

    private func sortConversations() {
        conversations.sort { lhs, rhs in
            if lhs.isPinned != rhs.isPinned { return lhs.isPinned }
            return lhs.lastActivity > rhs.lastActivity
        }
    }

    // MARK: - Saving

    private func scheduleSave() {
        saveTask?.cancel()
        let conversationsSnapshot = conversations
        let projectsSnapshot = projects
        let settingsSnapshot = settings
        saveTask = Task.detached(priority: .utility) {
            // Coalesce the bursts that streaming produces: one write per idle moment,
            // not one per token. Encoding stays off the main actor.
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            DiskStore.save(conversationsSnapshot, to: File.conversations)
            DiskStore.save(projectsSnapshot, to: File.projects)
            DiskStore.save(settingsSnapshot, to: File.settings)
        }
    }

    /// Forces the pending write immediately — used when the app leaves the foreground,
    /// where the debounce would otherwise be cut short by suspension.
    func flush() {
        saveTask?.cancel()
        saveTask = nil
        DiskStore.save(conversations, to: File.conversations)
        DiskStore.save(projects, to: File.projects)
        DiskStore.save(settings, to: File.settings)
    }

    // MARK: - Conversations

    func conversation(id: UUID) -> Conversation? {
        conversations.first { $0.id == id }
    }

    func conversations(in projectID: UUID?) -> [Conversation] {
        guard let projectID else { return conversations }
        return conversations.filter { $0.projectID == projectID }
    }

    @discardableResult
    func createConversation(projectID: UUID? = nil) -> Conversation {
        let conversation = Conversation(
            projectID: projectID,
            model: settings.defaultModel
        )
        conversations.insert(conversation, at: 0)
        sortConversations()
        scheduleSave()
        return conversation
    }

    func update(_ conversation: Conversation) {
        var updated = conversation
        updated.updatedAt = Date()
        if let index = conversations.firstIndex(where: { $0.id == conversation.id }) {
            conversations[index] = updated
        } else {
            conversations.insert(updated, at: 0)
        }
        sortConversations()
        scheduleSave()
    }

    /// A copy with fresh identity, placed at the top of the list.
    @discardableResult
    func duplicate(_ conversation: Conversation) -> Conversation {
        var copy = conversation
        copy.id = UUID()
        copy.title = conversation.title + " (branch)"
        copy.createdAt = Date()
        copy.updatedAt = Date()
        copy.isPinned = false
        // New identities for the messages too, so the two threads never collide in
        // a ForEach or a search result.
        copy.messages = conversation.messages.map { message in
            var duplicated = message
            duplicated.id = UUID()
            return duplicated
        }
        conversations.insert(copy, at: 0)
        sortConversations()
        scheduleSave()
        return copy
    }

    func deleteConversation(id: UUID) {
        conversations.removeAll { $0.id == id }
        scheduleSave()
    }

    func deleteConversations(ids: Set<UUID>) {
        conversations.removeAll { ids.contains($0.id) }
        scheduleSave()
    }

    func renameConversation(id: UUID, to title: String) {
        guard let index = conversations.firstIndex(where: { $0.id == id }) else { return }
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        conversations[index].title = trimmed.isEmpty ? "New chat" : trimmed
        conversations[index].updatedAt = Date()
        scheduleSave()
    }

    func togglePin(id: UUID) {
        guard let index = conversations.firstIndex(where: { $0.id == id }) else { return }
        conversations[index].isPinned.toggle()
        sortConversations()
        scheduleSave()
    }

    func moveConversation(id: UUID, toProject projectID: UUID?) {
        guard let index = conversations.firstIndex(where: { $0.id == id }) else { return }
        conversations[index].projectID = projectID
        conversations[index].updatedAt = Date()
        scheduleSave()
    }

    // MARK: - Projects

    func project(id: UUID?) -> Project? {
        guard let id else { return nil }
        return projects.first { $0.id == id }
    }

    @discardableResult
    func createProject(name: String, systemPrompt: String = "") -> Project {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let project = Project(
            name: trimmed.isEmpty ? "Untitled project" : trimmed,
            systemPrompt: systemPrompt,
            colorIndex: projects.count % Theme.projectColors.count
        )
        projects.append(project)
        scheduleSave()
        return project
    }

    func update(_ project: Project) {
        guard let index = projects.firstIndex(where: { $0.id == project.id }) else { return }
        projects[index] = project
        scheduleSave()
    }

    /// Chats in a deleted project are kept and moved to the top level; losing a folder
    /// should never silently lose the conversations inside it.
    func deleteProject(id: UUID) {
        projects.removeAll { $0.id == id }
        for index in conversations.indices where conversations[index].projectID == id {
            conversations[index].projectID = nil
        }
        scheduleSave()
    }

    func conversationCount(inProject id: UUID) -> Int {
        conversations.reduce(into: 0) { total, conversation in
            if conversation.projectID == id { total += 1 }
        }
    }

    // MARK: - Settings and credentials

    func updateSettings(_ newValue: AppSettings) {
        settings = newValue
        scheduleSave()
    }

    /// The key for whichever provider is selected right now.
    var apiKey: String {
        keysByProvider[settings.provider] ?? ""
    }

    func apiKey(for provider: ProviderKind) -> String {
        keysByProvider[provider] ?? ""
    }

    func setAPIKey(_ key: String) {
        setAPIKey(key, for: settings.provider)
    }

    func setAPIKey(_ key: String, for provider: ProviderKind) {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        keysByProvider[provider] = trimmed
        if trimmed.isEmpty {
            Keychain.delete(.forProvider(provider))
        } else {
            Keychain.set(trimmed, for: .forProvider(provider))
        }
    }

    var hasAPIKey: Bool { !apiKey.isEmpty }

    /// Builds the client for the current provider and credentials.
    func makeClient() -> LLMClient {
        ClientFactory.make(settings: settings, apiKey: apiKey)
    }

    /// Conversation prompt wins, then the project's, then the global default.
    func effectiveSystemPrompt(for conversation: Conversation) -> String {
        let own = conversation.systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        if !own.isEmpty { return own }
        if let project = project(id: conversation.projectID) {
            let projectPrompt = project.systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
            if !projectPrompt.isEmpty { return projectPrompt }
        }
        return settings.systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Search

    struct SearchHit: Identifiable, Hashable {
        var id: UUID { message.id }
        var conversation: Conversation
        var message: Message
    }

    func search(_ query: String, limit: Int = 200) -> [SearchHit] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard needle.count >= 2 else { return [] }
        var hits: [SearchHit] = []
        for conversation in conversations {
            for message in conversation.messages where message.text.localizedCaseInsensitiveContains(needle) {
                hits.append(SearchHit(conversation: conversation, message: message))
                if hits.count >= limit { return hits }
            }
        }
        return hits
    }

    // MARK: - Bulk actions

    func deleteAllConversations() {
        conversations.removeAll()
        scheduleSave()
    }

    var totalMessageCount: Int {
        conversations.reduce(into: 0) { $0 += $1.messages.count }
    }
}
