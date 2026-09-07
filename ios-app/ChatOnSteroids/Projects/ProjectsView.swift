import SwiftUI

struct ProjectsView: View {
    @Binding var selection: UUID?

    @Environment(ChatStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var editing: Project?
    @State private var showNew = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        selection = nil
                        dismiss()
                    } label: {
                        HStack {
                            Label("All chats", systemImage: "tray.full")
                            Spacer()
                            Text("\(store.conversations.count)")
                                .foregroundStyle(.secondary)
                            if selection == nil {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }

                Section {
                    if store.projects.isEmpty {
                        Text("A project groups chats and gives them a shared system prompt.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    ForEach(store.projects) { project in
                        Button {
                            selection = project.id
                            dismiss()
                        } label: {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(Theme.projectColor(project.colorIndex))
                                    .frame(width: 10, height: 10)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                    if !project.systemPrompt.isEmpty {
                                        Text(project.systemPrompt)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                                Spacer()
                                Text("\(store.conversationCount(inProject: project.id))")
                                    .foregroundStyle(.secondary)
                                if selection == project.id {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Color.accentColor)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                if selection == project.id { selection = nil }
                                store.deleteProject(id: project.id)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                            Button {
                                editing = project
                            } label: {
                                Label("Edit", systemImage: "pencil")
                            }
                            .tint(.blue)
                        }
                    }
                } header: {
                    Text("Projects")
                } footer: {
                    if !store.projects.isEmpty {
                        Text("Deleting a project keeps its chats and moves them back to All chats.")
                    }
                }
            }
            .navigationTitle("Projects")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showNew = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showNew) {
                ProjectEditor(project: nil) { name, prompt in
                    store.createProject(name: name, systemPrompt: prompt)
                }
            }
            .sheet(item: $editing) { project in
                ProjectEditor(project: project) { name, prompt in
                    var updated = project
                    updated.name = name
                    updated.systemPrompt = prompt
                    store.update(updated)
                }
            }
        }
    }
}

struct ProjectEditor: View {
    let project: Project?
    let onSave: (String, String) -> Void

    @State private var name: String
    @State private var prompt: String
    @Environment(\.dismiss) private var dismiss

    init(project: Project?, onSave: @escaping (String, String) -> Void) {
        self.project = project
        self.onSave = onSave
        _name = State(initialValue: project?.name ?? "")
        _prompt = State(initialValue: project?.systemPrompt ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Project name", text: $name)
                }
                Section {
                    TextEditor(text: $prompt)
                        .frame(minHeight: 140)
                } header: {
                    Text("System prompt")
                } footer: {
                    Text("Every chat in this project starts with this prompt unless the chat overrides it.")
                }
            }
            .navigationTitle(project == nil ? "New project" : "Edit project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(name, prompt)
                        dismiss()
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
