import SwiftUI

struct ChatView: View {
    @Environment(ChatStore.self) private var store
    @State private var viewModel: ChatViewModel
    @State private var showModelPicker = false
    @State private var showSystemPrompt = false
    @State private var showRename = false
    @State private var renameText = ""

    private let bottomAnchor = "chat-bottom-anchor"

    init(conversation: Conversation, store: ChatStore) {
        _viewModel = State(initialValue: ChatViewModel(conversation: conversation, store: store))
    }

    var body: some View {
        VStack(spacing: 0) {
            transcript
            ComposerView(viewModel: viewModel)
        }
        .navigationTitle(viewModel.conversation.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .sheet(isPresented: $showModelPicker) {
            ModelPickerView(selected: viewModel.conversation.model) { model in
                viewModel.setModel(model)
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
        .alert("Rename chat", isPresented: $showRename) {
            TextField("Title", text: $renameText)
            Button("Cancel", role: .cancel) {}
            Button("Save") { viewModel.rename(renameText) }
        }
        .onAppear { viewModel.refreshFromStore() }
    }

    // MARK: - Transcript

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
                            canRetry: message.id == viewModel.conversation.messages.last?.id,
                            onDelete: { viewModel.deleteMessage(id: message.id) },
                            onRetry: { viewModel.retryLast() }
                        )
                        .id(message.id)
                    }

                    if viewModel.isStreaming {
                        streamingBubble
                    }

                    Color.clear
                        .frame(height: 1)
                        .id(bottomAnchor)
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
                .padding(.bottom, 8)
            }
            .scrollDismissesKeyboard(.interactively)
            .onAppear {
                proxy.scrollTo(bottomAnchor, anchor: .bottom)
            }
            .onChange(of: viewModel.conversation.messages.count) { _, _ in
                withAnimation(.easeOut(duration: 0.2)) {
                    proxy.scrollTo(bottomAnchor, anchor: .bottom)
                }
            }
            .onChange(of: viewModel.streamingText) { _, _ in
                proxy.scrollTo(bottomAnchor, anchor: .bottom)
            }
        }
    }

    private var streamingBubble: some View {
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                if viewModel.streamingText.isEmpty {
                    HStack(spacing: 8) {
                        ProgressView().controlSize(.small)
                        Text("Thinking…")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous))
                } else {
                    MessageContentView(text: viewModel.streamingText, isUser: false)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: Theme.bubbleCorner, style: .continuous))
                }
            }
            Spacer(minLength: 44)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "bolt.horizontal.circle")
                .font(.system(size: 42))
                .foregroundStyle(.secondary)
            Text("Ask anything")
                .font(.headline)
            Text(store.hasAPIKey
                 ? "Using \(viewModel.conversation.model)"
                 : "Add an API key in Settings first.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
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

                Button(role: .destructive) {
                    viewModel.clearMessages()
                } label: {
                    Label("Clear messages", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
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
