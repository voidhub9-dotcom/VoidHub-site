import SwiftUI

struct ModelPickerView: View {
    let selected: String
    let onSelect: (String) -> Void

    @Environment(ChatStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var models: [ModelInfo] = []
    @State private var isLoading = false
    @State private var loadError: String?
    @State private var query = ""
    @State private var manualEntry = ""

    private var filtered: [ModelInfo] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return models }
        return models.filter {
            $0.id.localizedCaseInsensitiveContains(trimmed) || $0.displayName.localizedCaseInsensitiveContains(trimmed)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        TextField("Or type a model id", text: $manualEntry)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        Button("Use") {
                            let trimmed = manualEntry.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !trimmed.isEmpty else { return }
                            onSelect(trimmed)
                            dismiss()
                        }
                        .disabled(manualEntry.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                } footer: {
                    Text("Currently using \(selected)")
                }

                if isLoading {
                    HStack(spacing: 10) {
                        ProgressView()
                        Text("Loading models…")
                            .foregroundStyle(.secondary)
                    }
                }

                if let loadError {
                    Section {
                        Text(loadError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                        Button("Try again") { Task { await load() } }
                    }
                }

                ForEach(groupedVendors, id: \.self) { vendor in
                    Section(vendor) {
                        ForEach(filtered.filter { $0.vendor == vendor }) { model in
                            Button {
                                onSelect(model.id)
                                dismiss()
                            } label: {
                                HStack(alignment: .top, spacing: 10) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(model.displayName)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(.primary)
                                        Text(model.id)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                        HStack(spacing: 8) {
                                            if let context = model.contextSummary {
                                                Text(context)
                                            }
                                            if model.supportsVision {
                                                Label("vision", systemImage: "eye")
                                            }
                                            if let price = model.priceSummary {
                                                Text(price)
                                            }
                                        }
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    }
                                    Spacer(minLength: 4)
                                    if model.id == selected {
                                        Image(systemName: "checkmark")
                                            .foregroundStyle(Color.accentColor)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .searchable(text: $query, prompt: "Filter models")
            .navigationTitle("Model")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private var groupedVendors: [String] {
        var seen: [String] = []
        for model in filtered where !seen.contains(model.vendor) {
            seen.append(model.vendor)
        }
        return seen
    }

    private func load() async {
        isLoading = true
        loadError = nil
        defer { isLoading = false }
        do {
            let fetched = try await store.makeClient().availableModels()
            if fetched.isEmpty {
                useFallback(reason: "This endpoint returned an empty model list.")
            } else {
                models = fetched
            }
        } catch {
            let description = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            useFallback(reason: description)
        }
    }

    /// Plenty of gateways proxy only the chat endpoint, so a missing model listing
    /// is a normal configuration rather than a failure. Offer the known Claude
    /// models instead of an empty screen.
    private func useFallback(reason: String) {
        if store.settings.provider == .anthropic {
            models = AnthropicClient.knownModels
            loadError = "This endpoint has no model list (\(reason)) — showing known Claude models. Anything your gateway supports can be typed above."
        } else {
            models = []
            loadError = "Could not list models: \(reason). You can still type a model id above."
        }
    }
}
