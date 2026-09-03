//
//  KeyboardPreviewView.swift
//  ClipKeep
//
//  Try the keyboard, and tune it, without leaving the app.
//
//  The preview below is not a mock-up of the keyboard -- it is the keyboard.
//  KeyboardRootView is compiled into both targets, so this renders the same
//  view the extension hosts, against the same clip store, with the side
//  effects rerouted from a real UITextDocumentProxy to the demo field above
//  it. Anything that looks wrong here looks wrong on a real keyboard too,
//  which makes this the fastest way to check a height or style change.
//

import SwiftUI
import UIKit

struct KeyboardPreviewView: View {

    @StateObject private var store = KeyboardClipStore()

    @State private var demoText: String = ""
    @State private var height: CGFloat = KeyboardSettings.height
    @State private var appearance: KeyboardAppearanceStyle = KeyboardSettings.appearance
    @State private var insertBehavior: KeyboardInsertBehavior = KeyboardSettings.insertBehavior
    @State private var hapticsEnabled: Bool = KeyboardSettings.hapticsEnabled
    @State private var showSetupSteps = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Type something and select it to copy…", text: $demoText, axis: .vertical)
                        .lineLimit(2...4)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if !demoText.isEmpty {
                        Button("Clear", role: .destructive) { demoText = "" }
                            .font(.footnote)
                    }
                } header: {
                    Text("Try Your Keyboard")
                } footer: {
                    Text("Tapping a clip in the preview below types it into this field, exactly as it would in any other app.")
                }

                Section {
                    Picker("Appearance", selection: $appearance) {
                        ForEach(KeyboardAppearanceStyle.allCases) { style in
                            Text(style.displayName).tag(style)
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        LabeledContent("Height", value: "\(Int(height)) pt")
                        Slider(
                            value: $height,
                            in: KeyboardSettings.minHeight...KeyboardSettings.maxHeight,
                            step: 4
                        )
                    }

                    Picker("Tapping a Clip", selection: $insertBehavior) {
                        ForEach(KeyboardInsertBehavior.allCases) { behavior in
                            Text(behavior.displayName).tag(behavior)
                        }
                    }

                    Toggle("Haptic Feedback", isOn: $hapticsEnabled)
                } header: {
                    Text("Keyboard Style")
                } footer: {
                    Text("Images always go to the clipboard rather than being typed -- there is no text form of a screenshot. Haptics need Full Access, which the keyboard already requires.")
                }

                Section {
                    keyboardPreview
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                } header: {
                    Text("Live Preview")
                } footer: {
                    Text(previewFooter)
                }

                Section {
                    Button {
                        showSetupSteps = true
                    } label: {
                        Label("Setup steps", systemImage: "list.number")
                    }
                }
            }
            .navigationTitle("Keyboard Preview")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showSetupSteps) {
                SetupStepsView()
            }
            .onAppear {
                store.reload(hasFullAccess: true)
            }
            // Each setting writes straight through to the shared defaults, so
            // the extension picks it up the next time it loads -- there is no
            // "save" step to forget.
            .onChange(of: height) { _, newValue in KeyboardSettings.height = newValue }
            .onChange(of: appearance) { _, newValue in KeyboardSettings.appearance = newValue }
            .onChange(of: insertBehavior) { _, newValue in KeyboardSettings.insertBehavior = newValue }
            .onChange(of: hapticsEnabled) { _, newValue in KeyboardSettings.hapticsEnabled = newValue }
        }
    }

    private var previewFooter: String {
        if KeyboardSettings.isKeyboardConfirmedWorking {
            return "The ClipKeep keyboard has checked in with Full Access, so it can read these clips on a real keyboard too."
        }
        return "This preview always has access because it runs inside the app. The real keyboard needs Full Access as well — see Setup steps."
    }

    private var keyboardPreview: some View {
        KeyboardRootView(
            store: store,
            actions: previewActions,
            // The app itself always has access to its own container, so the
            // preview shows the working state rather than the locked one.
            hasFullAccess: true
        )
        .frame(height: height)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5)
        )
        .environment(\.colorScheme, resolvedColorScheme)
        .padding(.vertical, 8)
    }

    /// Mirrors what KeyboardViewController does with `overrideUserInterfaceStyle`,
    /// so the preview honours the same Appearance setting.
    private var resolvedColorScheme: ColorScheme {
        switch appearance {
        case .light: return .light
        case .dark: return .dark
        case .system: return UITraitCollection.current.userInterfaceStyle == .dark ? .dark : .light
        }
    }

    private var previewActions: KeyboardActions {
        KeyboardActions(
            insertText: { text in demoText.append(text) },
            deleteBackward: { if !demoText.isEmpty { demoText.removeLast() } },
            insertNewline: { demoText.append("\n") },
            copyToPasteboard: { metadata in
                store.copyToPasteboard(metadata, hasFullAccess: true) ? .copied : .failed
            },
            // No globe key in the preview: there is no other keyboard to
            // advance to from inside the app.
            advanceToNextInputMode: nil,
            playInputFeedback: {
                guard hapticsEnabled else { return }
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        )
    }
}

#Preview {
    KeyboardPreviewView()
}
