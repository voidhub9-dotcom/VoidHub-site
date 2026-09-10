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
    @State private var showResetSettings = false
    @State private var share: SharePayload?
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
                appearanceSection
                defaultsSection
                generationSection
                behaviourSection
                dataSection
                accountSection
                aboutSection
            }
            .animation(.easeInOut(duration: 0.2), value: draft.provider)
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
            .sheet(item: $share) { payload in
                ShareSheet(items: [payload.url])
            }
            .onAppear {
                guard !loaded else { return }
                draft = store.settings
                apiKeyField = store.apiKey(for: store.settings.provider)
                loaded = true
            }
            .onChange(of: draft) { _, newValue in
                store.updateSettings(newValue)
            }
            .alert("Delete all chats?", isPresented: $showDeleteAll) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    store.deleteAllConversations()
                    Haptics.warning()
                }
            } message: {
                Text("This removes every conversation stored on this device. It cannot be undone.")
            }
            .alert("Reset settings?", isPresented: $showResetSettings) {
                Button("Cancel", role: .cancel) {}
                Button("Reset", role: .destructive) {
                    // Chats, projects and saved keys are deliberately untouched.
                    draft = AppSettings()
                    store.updateSettings(draft)
                    Haptics.warning()
                }
            } message: {
                Text("Puts every setting back to its default. Your chats and API keys are kept.")
            }
        }
    }

    // MARK: - Sections

    /// Changing provider has to run through `switchProvider` (which moves the URL
    /// and model defaults) and swap in that provider's stored key, so the picker
    /// binds through here rather than straight at the property.
    private var providerBinding: Binding<ProviderKind> {
        Binding(
            get: { draft.provider },
            set: { newValue in
                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                    draft.switchProvider(to: newValue)
                }
                apiKeyField = store.apiKey(for: newValue)
                testState = .idle
                Haptics.selection()
            }
        )
    }

    private var providerSection: some View {
        Section {
            Picker("API format", selection: providerBinding) {
                ForEach(ProviderKind.allCases) { kind in
                    Text(kind.label).tag(kind)
                }
            }
            .pickerStyle(.segmented)

            Text(draft.provider.detail)
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField("Base URL", text: $draft.baseURL)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)

            SecureField(draft.requireAPIKey ? "API key" : "API key (optional)", text: $apiKeyField)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .onSubmit { store.setAPIKey(apiKeyField, for: draft.provider) }

            Button("Save key") {
                store.setAPIKey(apiKeyField, for: draft.provider)
            }
            .disabled(apiKeyField == store.apiKey(for: draft.provider))

            if draft.provider == .anthropic {
                Picker("Send key as", selection: $draft.anthropicAuthStyle) {
                    ForEach(AnthropicAuthStyle.allCases) { style in
                        Text(style.label).tag(style)
                    }
                }
            }

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

            NavigationLink {
                CustomEndpointSettingsView(settings: $draft)
            } label: {
                HStack {
                    Text("Custom endpoint")
                    Spacer()
                    if let summary = customEndpointSummary {
                        Text(summary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        } header: {
            Text("Provider")
        } footer: {
            if draft.provider == .anthropic {
                Text("Requests go to \(draft.normalizedBaseURL)/v1/messages. \"Automatic\" sends sk-ant-… keys as x-api-key and anything else as a bearer token, which is what gateways expect. The key is stored in the iOS keychain.")
            } else {
                Text("Any OpenAI-compatible endpoint. OpenRouter by default. The key is stored in the iOS keychain and never leaves this device except to the endpoint above.")
            }
        }
    }

    private var appearanceSection: some View {
        Section {
            NavigationLink {
                AppearanceSettingsView(settings: $draft)
            } label: {
                HStack(spacing: 12) {
                    Circle()
                        .fill(draft.accent.color)
                        .frame(width: 22, height: 22)
                        .overlay(Circle().strokeBorder(.white.opacity(0.4), lineWidth: 1))
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Appearance")
                        Text("\(draft.theme.label) · \(draft.accent.label) · \(draft.bubbleStyle.label)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var behaviourSection: some View {
        Section {
            Toggle("Haptic feedback", isOn: $draft.hapticsEnabled)
            Toggle("Starter prompts on empty chats", isOn: $draft.starterPromptsEnabled)
            Toggle("Show token estimate per message", isOn: $draft.showMessageTokens)
            Toggle("Show timestamps", isOn: $draft.showTimestamps)
        } header: {
            Text("Behaviour")
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

            // Current Claude models reject sampling parameters outright, so the
            // slider is hidden rather than silently turning every send into a 400.
            if draft.provider == .openAICompatible {
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
            }

            Stepper(
                maxTokensLabel,
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
            if draft.provider == .anthropic {
                Text("Claude models set their own sampling and reject a temperature, so that control is hidden here. The context budget only drives the meter in the chat toolbar — a local estimate, not the provider's counter.")
            } else {
                Text("The context budget only drives the meter in the chat toolbar. It is a local estimate, not the provider's counter.")
            }
        }
    }

    /// Nil when nothing has been customized, so the row stays quiet by default.
    private var customEndpointSummary: String? {
        var parts: [String] = []
        if !draft.customPath.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { parts.append("custom path") }
        if draft.hasAuthOverride { parts.append("custom auth") }
        if !draft.extraHeaders.isEmpty { parts.append("\(draft.extraHeaders.count) header\(draft.extraHeaders.count == 1 ? "" : "s")") }
        if !draft.extraQueryItems.isEmpty { parts.append("\(draft.extraQueryItems.count) param\(draft.extraQueryItems.count == 1 ? "" : "s")") }
        if !draft.requireAPIKey { parts.append("no key required") }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private var maxTokensLabel: String {
        if draft.maxTokens > 0 { return "Max tokens: \(draft.maxTokens)" }
        // Anthropic requires the field, so "provider default" would be a lie there.
        return draft.provider == .anthropic
            ? "Max tokens: \(draft.anthropicMaxTokens)"
            : "Max tokens: provider default"
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

            Button {
                exportBackup()
            } label: {
                Label("Export a backup", systemImage: "square.and.arrow.up")
            }
            .disabled(store.conversations.isEmpty && store.projects.isEmpty)

            Button("Reset settings", role: .destructive) {
                showResetSettings = true
            }

            Button("Delete all chats", role: .destructive) {
                showDeleteAll = true
            }
        } header: {
            Text("Data")
        } footer: {
            Text("The backup is a JSON file of every chat and project. Pinned chats are never pruned by the retention setting.")
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

    private func exportBackup() {
        guard let data = ConversationExport.backupJSON(
            conversations: store.conversations,
            projects: store.projects
        ) else { return }
        let stamp = ISO8601DateFormatter().string(from: Date()).prefix(10)
        guard let url = ConversationExport.temporaryFile(
            named: "chat-on-steroids-backup-\(stamp).json",
            data: data
        ) else { return }
        share = SharePayload(url: url)
    }

    private func testConnection() async {
        store.setAPIKey(apiKeyField, for: draft.provider)
        testState = .running
        do {
            let client = ClientFactory.make(settings: draft, apiKey: apiKeyField)
            let detail = try await client.probe(model: draft.defaultModel)
            testState = .ok(detail)
            Haptics.success()
        } catch {
            let description = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            testState = .failed(description)
            Haptics.error()
        }
    }
}
