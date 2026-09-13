import SwiftUI

/// Facts the app repeats to the model on every conversation. Purely manual: nothing
/// is added here without the user typing it or explicitly choosing "Remember this"
/// on a message.
struct MemorySettingsView: View {
    @Environment(ChatStore.self) private var store
    @State private var newNote = ""
    @State private var editingNote: MemoryNote?
    @State private var showDeleteAll = false
    @FocusState private var isAdding: Bool

    var body: some View {
        Form {
            Section {
                HStack(alignment: .top, spacing: 10) {
                    TextField("e.g. I prefer Swift over Objective-C", text: $newNote, axis: .vertical)
                        .lineLimit(1...4)
                        .focused($isAdding)
                    Button {
                        guard store.addMemory(newNote) != nil else { return }
                        Haptics.success()
                        newNote = ""
                        isAdding = false
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                    }
                    .disabled(newNote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            } footer: {
                Text("Sent to the model on every chat, appended after the system prompt. Nothing is added automatically.")
            }

            if !store.memoryNotes.isEmpty {
                Section {
                    ForEach(store.memoryNotes) { note in
                        Button {
                            editingNote = note
                        } label: {
                            Text(note.text)
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                        }
                        .buttonStyle(.plain)
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                Haptics.warning()
                                store.deleteMemory(id: note.id)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                } header: {
                    Text("Remembered (\(store.memoryNotes.count))")
                }

                Section {
                    Button("Delete all memory", role: .destructive) {
                        showDeleteAll = true
                    }
                }
            }
        }
        .navigationTitle("Memory")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $editingNote) { note in
            EditMemorySheet(note: note) { updated in
                store.updateMemory(id: note.id, text: updated)
            }
        }
        .alert("Delete all memory?", isPresented: $showDeleteAll) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                store.deleteAllMemory()
                Haptics.warning()
            }
        } message: {
            Text("Removes everything the app remembers about you. Your chats are untouched.")
        }
    }
}

private struct EditMemorySheet: View {
    let note: MemoryNote
    let onSave: (String) -> Void

    @State private var text: String
    @Environment(\.dismiss) private var dismiss

    init(note: MemoryNote, onSave: @escaping (String) -> Void) {
        self.note = note
        self.onSave = onSave
        _text = State(initialValue: note.text)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextEditor(text: $text)
                    .frame(minHeight: 120)
            }
            .navigationTitle("Edit memory")
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
                    .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
