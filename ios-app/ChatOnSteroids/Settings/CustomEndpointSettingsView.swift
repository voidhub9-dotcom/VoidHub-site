import SwiftUI

/// Everything that lets this app reach a server that doesn't match either built-in
/// provider exactly: a different path, a different auth scheme, headers or query
/// parameters a specific gateway insists on, or no authentication at all.
struct CustomEndpointSettingsView: View {
    @Binding var settings: AppSettings

    private var defaultPath: String {
        settings.provider == .anthropic ? "/v1/messages" : "/chat/completions"
    }

    var body: some View {
        Form {
            Section {
                Toggle("Require an API key", isOn: $settings.requireAPIKey)
            } footer: {
                Text("Turn off for a local server with no authentication at all, like Ollama or LM Studio.")
            }

            Section {
                TextField("Default: \(defaultPath)", text: $settings.customPath)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.system(.body, design: .monospaced))
            } header: {
                Text("Request path override")
            } footer: {
                Text("Replaces \(defaultPath) with this path on the base URL above. Leave empty to use the default. The model-list lookup is unaffected.")
            }

            Section {
                TextField("Header name — leave empty for the default", text: $settings.authHeaderName)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.system(.body, design: .monospaced))
                TextField("Value prefix, e.g. \"Bearer \" — optional", text: $settings.authValuePrefix)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.system(.body, design: .monospaced))
            } header: {
                Text("Auth header override")
            } footer: {
                Text(authOverrideFooter)
            }

            Section {
                KeyValueListEditor(
                    items: $settings.extraHeaders,
                    namePlaceholder: "Header",
                    addLabel: "Add header"
                )
            } header: {
                Text("Extra headers")
            } footer: {
                Text("Sent on every request to this endpoint, on top of the auth header above.")
            }

            Section {
                KeyValueListEditor(
                    items: $settings.extraQueryItems,
                    namePlaceholder: "Parameter",
                    addLabel: "Add query parameter"
                )
            } header: {
                Text("Extra query parameters")
            } footer: {
                Text("Appended to the request URL — e.g. Azure OpenAI's required api-version.")
            }
        }
        .navigationTitle("Custom endpoint")
        .navigationBarTitleDisplayMode(.inline)
        .animation(.easeInOut(duration: 0.2), value: settings.requireAPIKey)
    }

    private var authOverrideFooter: String {
        if settings.provider == .anthropic {
            return "Sends the key as \"<header>: <prefix><key>\" instead of x-api-key/Bearer auto-detection. Leave the header name empty to keep that behaviour."
        }
        return "Sends the key as \"<header>: <prefix><key>\" instead of \"Authorization: Bearer <key>\". Leave the header name empty to keep the default."
    }
}
