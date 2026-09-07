import Foundation
import Observation

@MainActor
@Observable
final class ChatViewModel {
    private(set) var conversation: Conversation
    private(set) var isStreaming = false
    /// The answer as it arrives, rendered as a live bubble until the turn completes.
    private(set) var streamingText = ""
    var errorMessage: String?
    var draft = ""
    var pendingAttachments: [Attachment] = []

    @ObservationIgnored private let store: ChatStore
    @ObservationIgnored private var streamTask: Task<Void, Never>?

    init(conversation: Conversation, store: ChatStore) {
        self.conversation = conversation
        self.store = store
    }

    // MARK: - Derived state

    var canSend: Bool {
        guard !isStreaming else { return false }
        let hasText = !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return hasText || !pendingAttachments.isEmpty
    }

    var estimatedTokens: Int {
        var total = TokenEstimator.estimate(conversation.messages)
        total += TokenEstimator.estimate(store.effectiveSystemPrompt(for: conversation))
        if !streamingText.isEmpty { total += TokenEstimator.estimate(streamingText) }
        return total
    }

    var contextFraction: Double {
        let limit = store.settings.contextLimit
        guard limit > 0 else { return 0 }
        return min(1, Double(estimatedTokens) / Double(limit))
    }

    var modelName: String { conversation.model }

    var projectName: String? { store.project(id: conversation.projectID)?.name }

    // MARK: - Mutations

    func refreshFromStore() {
        guard let latest = store.conversation(id: conversation.id) else { return }
        // Never clobber a turn that is still arriving.
        guard !isStreaming else { return }
        conversation = latest
    }

    func setModel(_ model: String) {
        conversation.model = model
        store.update(conversation)
    }

    func rename(_ title: String) {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        conversation.title = trimmed.isEmpty ? "New chat" : trimmed
        store.update(conversation)
    }

    func setSystemPrompt(_ prompt: String) {
        conversation.systemPrompt = prompt
        store.update(conversation)
    }

    func moveToProject(_ projectID: UUID?) {
        conversation.projectID = projectID
        store.update(conversation)
    }

    func addAttachment(_ attachment: Attachment) {
        pendingAttachments.append(attachment)
    }

    func removeAttachment(id: UUID) {
        pendingAttachments.removeAll { $0.id == id }
    }

    func deleteMessage(id: UUID) {
        conversation.messages.removeAll { $0.id == id }
        store.update(conversation)
    }

    func clearMessages() {
        stop()
        conversation.messages.removeAll()
        store.update(conversation)
    }

    // MARK: - Sending

    func send() {
        guard canSend else { return }
        guard store.hasAPIKey else {
            errorMessage = APIError.missingKey.localizedDescription
            return
        }

        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let message = Message.user(text, attachments: pendingAttachments)
        conversation.messages.append(message)
        if conversation.title == "New chat" && !text.isEmpty {
            conversation.title = Conversation.derivedTitle(from: text)
        }
        draft = ""
        pendingAttachments = []
        store.update(conversation)
        beginTurn()
    }

    /// Drops the last assistant turn and asks again from the same user message.
    func retryLast() {
        guard !isStreaming else { return }
        if let last = conversation.messages.last, last.role == .assistant {
            conversation.messages.removeLast()
        }
        guard conversation.messages.contains(where: { $0.role == .user }) else { return }
        store.update(conversation)
        beginTurn()
    }

    func stop() {
        streamTask?.cancel()
        streamTask = nil
        guard isStreaming else { return }
        finishTurn(interrupted: true)
    }

    private func beginTurn() {
        streamTask?.cancel()
        errorMessage = nil
        streamingText = ""
        isStreaming = true

        let client = ChatClient(settings: store.settings, apiKey: store.apiKey)
        let system = store.effectiveSystemPrompt(for: conversation)
        let history = conversation.messages
        let model = conversation.model
        let useStreaming = store.settings.streamResponses

        streamTask = Task { [weak self] in
            guard let self else { return }
            do {
                if useStreaming {
                    for try await piece in client.stream(model: model, systemPrompt: system, history: history) {
                        if Task.isCancelled { break }
                        self.streamingText += piece
                    }
                } else {
                    let whole = try await client.complete(model: model, systemPrompt: system, history: history)
                    self.streamingText = whole
                }
                guard !Task.isCancelled else { return }
                self.finishTurn(interrupted: false)
            } catch {
                guard !Task.isCancelled else { return }
                self.failTurn(error)
            }
        }
    }

    private func finishTurn(interrupted: Bool) {
        let text = streamingText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty {
            var message = Message.assistant(streamingText, model: conversation.model)
            if interrupted {
                message.text += "\n\n_[stopped]_"
            }
            conversation.messages.append(message)
            store.update(conversation)
        }
        streamingText = ""
        isStreaming = false
        streamTask = nil
    }

    /// A partial answer is kept — it is real output the model produced — and the
    /// failure is recorded as its own turn so retry has something to replace.
    private func failTurn(_ error: Error) {
        let partial = streamingText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !partial.isEmpty {
            conversation.messages.append(Message.assistant(streamingText, model: conversation.model))
        }
        let description = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        conversation.messages.append(Message.failure(description))
        store.update(conversation)

        errorMessage = description
        streamingText = ""
        isStreaming = false
        streamTask = nil
    }
}
