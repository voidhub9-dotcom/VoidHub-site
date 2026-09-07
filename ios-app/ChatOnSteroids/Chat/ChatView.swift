import SwiftUI

struct ChatView: View {
    @Environment(ChatStore.self) private var store
    @State private var viewModel: ChatViewModel

    @State private var showModelPicker = false
    @State private var showRegeneratePicker = false
    @State private var showSystemPrompt = false
    @State private var showRename = false
    @State private var renameText = ""
    @State private var editingMessage: Message?
    @State private var share: SharePayload?
    @State private var atBottom = true
    @State private var branchToast = false

    private let bottomAnchor = "chat-bottom-anchor"

    init(conversation: Conversation, store: ChatStore) {
        _viewModel = State(initialValue: ChatViewModel(conversation: conversation, store: store))
    }

    private var glass: Bool { store.settings.glassEffects }

    var body: some View {
        ZStack {
            AuroraBackground(
                palette: store.settings.accent,
                enabled: glass && store.settings.animatedBackground
            )

            VStack(spacing: 0) {
                transcript
                ComposerView(viewModel: viewModel, glass: glass)
            }

            if !atBottom {
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        ScrollToBottomButton(glass: glass) {
                            Haptics.tap()
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                scrollRequest = UUID()
                            }
                        }
                        .padding(.trailing, 18)
                        .padding(.bottom, 92)
                    }
                }
                .allowsHitTesting(true)
            }

            if branchToast {
                toast("Branched into a new chat")
            }
        }
        .navigationTitle(viewModel.conversation.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        .toolbar { toolbarContent }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: atBottom)
        .sheet(isPresented: $showModelPicker) {
            ModelPickerView(selected: viewModel.conversation.model) { model in
                viewModel.setModel(model)
                Haptics.selection()
            }
        }
        .sheet(isPresented: $showRegeneratePicker) {
            ModelPickerView(selected: viewModel.conversation.model) { model in
                viewModel.regenerate(using: model)
            }
        }
        .sheet(isPresented: $showSystemPrompt) {
            SystemPromptEditor(
                prompt: viewModel.conversation.systemPrompt,
                inherited: store.effectiveSystemPrompt(for: viewModel.conversation)
            ) { newPrompt in
                viewModel.setSystemPrompt(newPrompt)
            }
        }
        .sheet(item: $share) { payload in
            ShareSheet(items: [payload.url])
        }
        .sheet(item: $editingMessage) { message in
            EditMessageSheet(text: message.text) { updated in
                viewModel.editAndResend(id: message.id, newText: updated)
            }
        }
        .alert("Rename chat", isPresented: $showRename) {
            TextField("Title", text: $renameText)
            Button("Cancel", role: .cancel) {}
            Button("Save") { viewModel.rename(renameText) }
        }
        .onAppear { viewModel.refreshFromStore() }
    }

    // MARK: - Transcript

    @State private var scrollRequest = UUID()

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    if viewModel.conversation.messages.isEmpty && !viewModel.isStreaming {
                        emptyState
                    }

                    ForEach(viewModel.conversation.messages) { message in
                        MessageRow(
                            message: message,
                            style: store.settings.bubbleStyle,
                            glass: glass,
                            showTokens: store.settings.showMessageTokens,
                            showTimestamp: store.settings.showTimestamps,
                            tokenCount: store.settings.showMessageTokens ? viewModel.tokenEstimate(for: message) : 0,
                            canRetry: message.id == viewModel.conversation.messages.last?.id,
                            onDelete: { viewModel.deleteMessage(id: message.id) },
                            onRetry: { viewModel.retryLast() },
                            onEdit: { editingMessage = message }
                        )
                        .id(message.id)
                    }

                    if viewModel.isStreaming {
                        streamingBubble
                    }

                    Color.clear
                        .frame(height: 1)
                        .id(bottomAnchor)
                        .onAppear { atBottom = true }
                        .onDisappear { atBottom = false }
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
                .padding(.bottom, 8)
            }
            .scrollDismissesKeyboard(.interactively)
            .onAppear { proxy.scrollTo(bottomAnchor, anchor: .bottom) }
            .onChange(of: viewModel.conversation.messages.count) { _, _ in
                withAnimation(.easeOut(duration: 0.24)) {
                    proxy.scrollTo(bottomAnchor, anchor: .bottom)
                }
            }
            .onChange(of: viewModel.streamingText) { _, _ in
                guard atBottom else { return }
                proxy.scrollTo(bottomAnchor, anchor: .bottom)
            }
            .onChange(of: scrollRequest) { _, _ in
                withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                    proxy.scrollTo(bottomAnchor, anchor: .bottom)
                }
            }
        }
    }

    private var streamingBubble: some View {
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                if viewModel.streamingText.isEmpty {
                    ThinkingIndicator(glass: glass)
                } else {
                    HStack(alignment: .bottom, spacing: 4) {
                        MessageContentView(text: viewModel.streamingText, isUser: false)
                        StreamingCaret()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .glassSurface(cornerRadius: Theme.bubbleCorner, enabled: glass)
                }
            }
            Spacer(minLength: 44)
        }
        .transition(.opacity)
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            VStack(spacing: 10) {
                Image(systemName: "bolt.horizontal.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Color.accentColor)
                    .springEntrance()
                Text("Ask anything")
                    .font(.title3.weight(.semibold))
                Text(store.hasAPIKey
                     ? "Using \(viewModel.conversation.model)"
                     : "Add an API key in Settings first.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 40)

            if store.settings.starterPromptsEnabled && store.hasAPIKey {
                StarterPromptsView(glass: glass) { prompt in
                    viewModel.draft = prompt
                }
                .padding(.top, 4)
            }
        }
        .padding(.bottom, 8)
    }

    private func toast(_ text: String) -> some View {
        VStack {
            Spacer()
            Text(text)
                .font(.footnote.weight(.medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .glassSurface(cornerRadius: 20, strokeOpacity: 0.3)
                .padding(.bottom, 100)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            ContextMeter(
                fraction: viewModel.contextFraction,
                tokens: viewModel.estimatedTokens,
                limit: store.settings.contextLimit
            )
        }

        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button {
                    showModelPicker = true
                } label: {
                    Label("Model: \(viewModel.conversation.model)", systemImage: "cpu")
                }

                Button {
                    showRegeneratePicker = true
                } label: {
                    Label("Regenerate with…", systemImage: "arrow.triangle.2.circlepath")
                }
                .disabled(viewModel.conversation.messages.isEmpty || viewModel.isStreaming)

                Divider()

                Button {
                    showSystemPrompt = true
                } label: {
                    Label("System prompt", systemImage: "text.alignleft")
                }

                Button {
                    renameText = viewModel.conversation.title
                    showRename = true
                } label: {
                    Label("Rename", systemImage: "pencil")
                }

                Menu {
                    Button {
                        viewModel.moveToProject(nil)
                    } label: {
                        Label("No project", systemImage: "tray")
                    }
                    ForEach(store.projects) { project in
                        Button {
                            viewModel.moveToProject(project.id)
                        } label: {
                            Label(project.name, systemImage: "folder")
                        }
                    }
                } label: {
                    Label("Move to project", systemImage: "folder")
                }

                Divider()

                Button {
                    if viewModel.branch() != nil {
                        Haptics.success()
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) { branchToast = true }
                        Task {
                            try? await Task.sleep(nanoseconds: 1_800_000_000)
                            withAnimation { branchToast = false }
                        }
                    }
                } label: {
                    Label("Branch this chat", systemImage: "arrow.triangle.branch")
                }
                .disabled(viewModel.conversation.messages.isEmpty)

                Button {
                    if let url = viewModel.exportMarkdown() {
                        share = SharePayload(url: url)
                    }
                } label: {
                    Label("Export as Markdown", systemImage: "square.and.arrow.up")
                }
                .disabled(viewModel.conversation.messages.isEmpty)

                Divider()

                Button(role: .destructive) {
                    viewModel.clearMessages()
                    Haptics.warning()
                } label: {
                    Label("Clear messages", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }
}

// MARK: - Edit sheet

struct EditMessageSheet: View {
    let onSave: (String) -> Void

    @State private var text: String
    @Environment(\.dismiss) private var dismiss

    init(text: String, onSave: @escaping (String) -> Void) {
        self.onSave = onSave
        _text = State(initialValue: text)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextEditor(text: $text)
                        .frame(minHeight: 180)
                } footer: {
                    Text("Everything after this message is removed and the answer is generated again.")
                }
            }
            .navigationTitle("Edit message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Resend") {
                        onSave(text)
                        dismiss()
                    }
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct SystemPromptEditor: View {
    let inherited: String
    let onSave: (String) -> Void

    @State private var text: String
    @Environment(\.dismiss) private var dismiss

    init(prompt: String, inherited: String, onSave: @escaping (String) -> Void) {
        self.inherited = inherited
        self.onSave = onSave
        _text = State(initialValue: prompt)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextEditor(text: $text)
                        .frame(minHeight: 160)
                        .font(.body)
                } header: {
                    Text("This chat's system prompt")
                } footer: {
                    Text("Leave empty to inherit the project's prompt, then the global one.")
                }

                if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Section("Currently inherited") {
                        Text(inherited.isEmpty ? "None" : inherited)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("System prompt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(text)
                        dismiss()
                    }
                }
            }
        }
    }
}
