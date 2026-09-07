import SwiftUI

struct SettingsView: View {
    @Environment(ChatStore.self) private var store
    @Environment(AuthController.self) private var auth
    @Environment(\.dismiss) private var dismiss

    @State private var draft = AppSettings()
    @State private var apiKeyField = ""
    @State private var showModelPicker = false
    @State private var testState: TestState = .idle
    @State private var showDeleteAll = false
    @State private var loaded = false

    private enum TestState: Equatable {
        case idle
        case running
        case ok(String)
        case failed(String)
    }

    var body: some View {
        NavigationStack {
            Form {
                providerSection
                defaultsSection
                generationSection
                dataSection
                accountSection
                aboutSection
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showModelPicker) {
                ModelPickerView(selected: draft.defaultModel) { model in
                    draft.defaultModel = model
                }
            }
            .onAppear {
                guard !loaded else { return }
                draft = store.settings
                apiKeyField = store.apiKey
                loaded = true
            }
            .onChange(of: draft) { _, newValue in
                store.updateSettings(newValue)
            }
            .alert("Delete all chats?", isPresented: $showDeleteAll) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) { store.deleteAllConversations() }
            } message: {
                Text("This removes every conversation stored on this device. It cannot be undone.")
            }
        }
    }

    // MARK: - Sections

    private var providerSection: some View {
        Section {
            TextField("Base URL", text: $draft.baseURL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)

            SecureField("API key", text: $apiKeyField)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .onSubmit { store.setAPIKey(apiKeyField) }

            Button("Save key") {
                store.setAPIKey(apiKeyField)
            }
            .disabled(apiKeyField == store.apiKey)

            Button {
                Task { await testConnection() }
            } label: {
                HStack {
                    Text("Test connection")
                    Spacer()
                    switch testState {
                    case .idle:
                        EmptyView()
                    case .running:
                        ProgressView()
                    case .ok(let detail):
                        Label(detail, systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.green)
                    case .failed:
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.red)
                    }
                }
            }

            if case .failed(let message) = testState {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        } header: {
            Text("Provider")
        } footer: {
            Text("Any OpenAI-compatible endpoint. OpenRouter by default. The key is stored in the iOS keychain and never leaves this device except to the endpoint above.")
        }
    }

    private var defaultsSection: some View {
        Section {
            Button {
                showModelPicker = true
            } label: {
                HStack {
                    Text("Default model")
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(draft.defaultModel)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }

            NavigationLink {
                Form {
                    Section {
                        TextEditor(text: $draft.systemPrompt)
                            .frame(minHeight: 200)
                    } footer: {
                        Text("Used by every chat that does not set its own, and that is not inside a project with one.")
                    }
                }
                .navigationTitle("System prompt")
                .navigationBarTitleDisplayMode(.inline)
            } label: {
                HStack {
                    Text("System prompt")
                    Spacer()
                    Text(draft.systemPrompt.isEmpty ? "None" : "Set")
                        .foregroundStyle(.secondary)
                }
            }
        } header: {
            Text("Defaults for new chats")
        }
    }

    private var generationSection: some View {
        Section {
            Toggle("Stream answers", isOn: $draft.streamResponses)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Temperature")
                    Spacer()
                    Text(String(format: "%.2f", draft.temperature))
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
                Slider(value: $draft.temperature, in: 0...2, step: 0.05)
            }

            Stepper(
                draft.maxTokens > 0 ? "Max tokens: \(draft.maxTokens)" : "Max tokens: provider default",
                value: $draft.maxTokens,
                in: 0...32_000,
                step: 256
            )

            Picker("Context budget", selection: $draft.contextLimit) {
                Text("32k").tag(32_000)
                Text("64k").tag(64_000)
                Text("128k").tag(128_000)
                Text("200k").tag(200_000)
                Text("400k").tag(400_000)
                Text("1M").tag(1_000_000)
            }
        } header: {
            Text("Generation")
        } footer: {
            Text("The context budget only drives the meter in the chat toolbar. It is a local estimate, not the provider's counter.")
        }
    }

    private var dataSection: some View {
        Section {
            Picker("Keep history for", selection: $draft.historyRetentionDays) {
                Text("Forever").tag(0)
                Text("7 days").tag(7)
                Text("30 days").tag(30)
                Text("90 days").tag(90)
            }

            HStack {
                Text("Stored")
                Spacer()
                Text("\(store.conversations.count) chats · \(store.totalMessageCount) messages")
                    .foregroundStyle(.secondary)
                    .font(.footnote)
            }

            Button("Delete all chats", role: .destructive) {
                showDeleteAll = true
            }
        } header: {
            Text("Data")
        } footer: {
            Text("Pinned chats are never pruned by the retention setting.")
        }
    }

    private var accountSection: some View {
        Section("Account") {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.accentColor.opacity(0.18))
                        .frame(width: 38, height: 38)
                    Text(auth.account?.initials ?? "?")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(auth.account?.displayName ?? "Not signed in")
                        .font(.subheadline.weight(.medium))
                    if let email = auth.account?.email, !email.isEmpty {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if auth.account?.provider == .local {
                        Text("Local only — no account attached")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Button("Sign out", role: .destructive) {
                auth.signOut()
                dismiss()
            }
        }
    }

    private var aboutSection: some View {
        Section {
            HStack {
                Text("Version")
                Spacer()
                Text(appVersion)
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("About")
        } footer: {
            Text("Chat On Steroids for iOS. Chats, attachments and the API key stay on this device.")
        }
    }

    private var appVersion: String {
        let short = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "\(short) (\(build))"
    }

    private func testConnection() async {
        store.setAPIKey(apiKeyField)
        testState = .running
        do {
            let client = ChatClient(settings: draft, apiKey: apiKeyField)
            let models = try await client.availableModels()
            testState = .ok("\(models.count) models")
        } catch {
            let description = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            testState = .failed(description)
        }
    }
}
