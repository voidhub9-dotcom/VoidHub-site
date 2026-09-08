import SwiftUI

struct ModelPickerView: View {
    let selected: String
    let onSelect: (String) -> Void

    @Environment(ChatStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var models: [ModelInfo] = []
    @State private var isLoading = false
    /// A real problem: auth failed, DNS failed, the endpoint is wrong.
    @State private var loadError: String?
    /// Not a problem: this endpoint just doesn't publish a model list, which is
    /// normal for a gateway that only proxies chat. Shown in neutral styling so it
    /// doesn't read as broken.
    @State private var infoNote: String?
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
                            Haptics.selection()
                            onSelect(trimmed)
                            dismiss()
                        }
                        .disabled(manualEntry.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                } footer: {
                    Text(store.settings.provider == .anthropic
                         ? "Currently using \(selected). Known Claude model IDs are listed below — tap one, or type any other id your gateway supports above."
                         : "Currently using \(selected).")
                }

                if isLoading && models.isEmpty {
                    HStack(spacing: 10) {
                        ProgressView()
                        Text("Loading models…")
                            .foregroundStyle(.secondary)
                    }
                }

                if let infoNote {
                    Section {
                        Label(infoNote, systemImage: "info.circle")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Button("Check for a live model list again") { Task { await load() } }
                            .font(.footnote)
                    }
                }

                if let loadError {
                    Section {
                        Label(loadError, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.red)
                        Button("Try again") { Task { await load() } }
                    }
                }

                ForEach(groupedVendors, id: \.self) { vendor in
                    Section(vendor) {
                        ForEach(filtered.filter { $0.vendor == vendor }) { model in
                            Button {
                                Haptics.selection()
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
                                            .transition(.scale.combined(with: .opacity))
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .animation(.easeInOut(duration: 0.2), value: models)
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
        // Most gateways that front Anthropic's API proxy only /v1/messages, so
        // waiting on a network round trip before showing anything just looks like
        // the picker is broken. Show known Claude models the instant the sheet
        // opens; a live list, if this endpoint actually has one, replaces it below.
        if store.settings.provider == .anthropic && models.isEmpty {
            models = AnthropicClient.knownModels
        }

        isLoading = true
        loadError = nil
        infoNote = nil
        defer { isLoading = false }

        do {
            let fetched = try await store.makeClient().availableModels()
            if fetched.isEmpty {
                handleNoListing(reason: "it returned an empty list")
            } else {
                withAnimation(.easeInOut(duration: 0.2)) {
                    models = fetched
                }
            }
        } catch {
            let description = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            handleNoListing(reason: description)
        }
    }

    private func handleNoListing(reason: String) {
        if store.settings.provider == .anthropic {
            infoNote = "This endpoint doesn't publish a model list (\(reason))."
            // models already holds the known-model fallback from load()'s start.
        } else {
            models = []
            loadError = "Could not list models: \(reason). You can still type a model id above."
        }
    }
}
