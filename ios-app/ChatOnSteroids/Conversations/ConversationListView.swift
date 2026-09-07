import SwiftUI

struct ConversationListView: View {
    @Environment(ChatStore.self) private var store

    @State private var path = NavigationPath()
    @State private var query = ""
    @State private var projectFilter: UUID?
    @State private var showSettings = false
    @State private var showProjects = false

    private var visibleConversations: [Conversation] {
        let base = store.conversations(in: projectFilter)
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return base }
        return base.filter { conversation in
            conversation.title.localizedCaseInsensitiveContains(trimmed)
                || conversation.messages.contains { $0.text.localizedCaseInsensitiveContains(trimmed) }
        }
    }

    private var searchHits: [ChatStore.SearchHit] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else { return [] }
        return store.search(trimmed, limit: 40)
    }

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if store.conversations.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .navigationTitle(projectFilter == nil ? "Chats" : (store.project(id: projectFilter)?.name ?? "Chats"))
            .searchable(text: $query, prompt: "Search chats and messages")
            .toolbar { toolbarContent }
            .navigationDestination(for: Conversation.self) { conversation in
                ChatView(conversation: conversation, store: store)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showProjects) {
                ProjectsView(selection: $projectFilter)
            }
        }
    }

    private var list: some View {
        List {
            if !store.hasAPIKey {
                Section {
                    Button {
                        showSettings = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "key.fill")
                                .foregroundStyle(.orange)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Add an API key to start chatting")
                                    .font(.subheadline.weight(.medium))
                                Text("Settings → Provider")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            if !searchHits.isEmpty {
                Section("Matching messages") {
                    ForEach(searchHits) { hit in
                        Button {
                            path.append(hit.conversation)
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(hit.conversation.title)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Text(hit.message.text)
                                    .font(.subheadline)
                                    .lineLimit(2)
                                    .foregroundStyle(.primary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            Section(searchHits.isEmpty ? "" : "Chats") {
                ForEach(visibleConversations) { conversation in
                    NavigationLink(value: conversation) {
                        row(conversation)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            store.deleteConversation(id: conversation.id)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            store.togglePin(id: conversation.id)
                        } label: {
                            Label(conversation.isPinned ? "Unpin" : "Pin", systemImage: "pin")
                        }
                        .tint(.orange)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func row(_ conversation: Conversation) -> some View {
        HStack(spacing: 12) {
            if let project = store.project(id: conversation.projectID) {
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .fill(Theme.projectColor(project.colorIndex))
                    .frame(width: 4, height: 34)
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 5) {
                    if conversation.isPinned {
                        Image(systemName: "pin.fill")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                    Text(conversation.title)
                        .font(.body.weight(.medium))
                        .lineLimit(1)
                }
                Text(conversation.preview)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 6)

            VStack(alignment: .trailing, spacing: 3) {
                Text(conversation.lastActivity, format: .relative(presentation: .numeric))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                if !conversation.messages.isEmpty {
                    Text("\(conversation.messages.count)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No chats yet")
                .font(.title3.weight(.semibold))
            Text(store.hasAPIKey
                 ? "Start one and it stays on this device."
                 : "Add an API key in Settings, then start a chat.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button {
                newChat()
            } label: {
                Label("New chat", systemImage: "square.and.pencil")
                    .padding(.horizontal, 6)
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 4)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button {
                showSettings = true
            } label: {
                Image(systemName: "gearshape")
            }
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                showProjects = true
            } label: {
                Image(systemName: projectFilter == nil ? "folder" : "folder.fill")
            }
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                newChat()
            } label: {
                Image(systemName: "square.and.pencil")
            }
        }
    }

    private func newChat() {
        let conversation = store.createConversation(projectID: projectFilter)
        path.append(conversation)
    }
}
