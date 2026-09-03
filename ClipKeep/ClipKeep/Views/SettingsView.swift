//
//  SettingsView.swift
//  ClipKeep
//

import Foundation
import SwiftUI
import UIKit

struct SettingsView: View {
    @EnvironmentObject private var clipboardManager: ClipboardManager
    @Environment(\.dismiss) private var dismiss

    @State private var showClearAllConfirmation = false
    @State private var showSetupSteps = false

    private static let retentionOptions: [(label: String, days: Int)] = [
        ("Never", 0),
        ("1 Day", 1),
        ("3 Days", 3),
        ("7 Days", 7),
        ("30 Days", 30)
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Stepper(value: $clipboardManager.maxHistoryItems, in: 20...2000, step: 10) {
                        VStack(alignment: .leading) {
                            Text("Keep Up To")
                            Text("\(clipboardManager.maxHistoryItems) clips")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Picker("Auto-Delete After", selection: $clipboardManager.retentionDays) {
                        ForEach(Self.retentionOptions, id: \.days) { option in
                            Text(option.label).tag(option.days)
                        }
                    }
                } header: {
                    Text("History Limits")
                } footer: {
                    Text("Pinned clips are never removed by these limits. Oldest unpinned clips are deleted first once the limit is reached.")
                }

                Section {
                    LabeledContent("Clips Stored", value: "\(clipboardManager.items.count)")
                    LabeledContent("Storage Used", value: ByteCountFormatter.string(fromByteCount: Int64(clipboardManager.totalStorageBytes), countStyle: .file))
                } header: {
                    Text("Storage")
                }

                Section {
                    Button(role: .destructive) {
                        showClearAllConfirmation = true
                    } label: {
                        Text("Clear All History")
                    }
                    .disabled(clipboardManager.items.isEmpty)
                }

                Section {
                    Text("ClipKeep checks the clipboard when the app is open or you switch back to it. Apple does not allow any app, including ClipKeep, to watch the clipboard silently in the background -- this is a system privacy protection, not a limitation of this app. The first time in a session that ClipKeep reads something you copied elsewhere, iOS may show its own \"Allow Paste\" prompt; that also comes from the system.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    Button {
                        openSystemSettings()
                    } label: {
                        Label("Open ClipKeep in Settings", systemImage: "gearshape.2")
                    }
                } header: {
                    Text("How Capture Works")
                } footer: {
                    Text("iOS keeps its own \"Paste from Other Apps\" permission per app, separate from anything in here. Setting it to Allow in the Settings app stops the confirmation prompt from reappearing each time.")
                }

                Section {
                    LabeledContent("Status", value: KeyboardSettings.isKeyboardConfirmedWorking ? "Working" : "Not confirmed")
                    Button {
                        showSetupSteps = true
                    } label: {
                        Label("Setup steps", systemImage: "list.number")
                    }
                } header: {
                    Text("ClipKeep Keyboard")
                } footer: {
                    Text("The keyboard puts your clips inside every app with a text field. It needs Allow Full Access to read them -- iOS blocks keyboards from shared app data otherwise. \"Working\" appears once the keyboard has opened at least once with that switched on.")
                }

                Section {
                    LabeledContent("Version", value: appVersionString)
                } header: {
                    Text("About")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showSetupSteps) {
                SetupStepsView()
            }
            .confirmationDialog(
                "Delete all clip history? Pinned clips will be deleted too. This can't be undone.",
                isPresented: $showClearAllConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete Everything", role: .destructive) {
                    clipboardManager.clearAllHistory()
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private var appVersionString: String {
        let shortVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(shortVersion) (\(buildNumber))"
    }

    /// Deep-links to ClipKeep's own page in the Settings app, where iOS
    /// exposes the per-app "Paste from Other Apps" toggle. There is no
    /// SwiftUI/UIKit API to read or set that permission directly -- Apple
    /// deliberately keeps it a user-controlled system setting -- so the
    /// most ClipKeep can do is take you straight to it.
    private func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

#Preview {
    SettingsView()
        .environmentObject(ClipboardManager())
}
