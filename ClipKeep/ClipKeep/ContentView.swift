//
//  ContentView.swift
//  ClipKeep
//
//  Three tabs, matching the three ways ClipKeep is used: browse the history,
//  set up and try the keyboard, and put the list in a floating window.
//

import Foundation
import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            ClipListView()
                .tabItem {
                    Label("Clipboard", systemImage: "doc.on.clipboard")
                }

            KeyboardPreviewView()
                .tabItem {
                    Label("Preview", systemImage: "keyboard")
                }

            PiPView()
                .tabItem {
                    Label("PIP", systemImage: "pip")
                }
        }
    }
}

/// The clip history itself -- what used to be the whole app.
struct ClipListView: View {
    @EnvironmentObject private var clipboardManager: ClipboardManager
    @State private var searchText = ""
    @State private var showSettings = false
    @State private var showSetupSteps = false
    @State private var detailTarget: ClipMetadata?
    /// Snapshotted rather than read inline so the banner doesn't re-evaluate
    /// shared defaults on every redraw of the list.
    @State private var keyboardConfirmed = KeyboardSettings.isKeyboardConfirmedWorking

    private var pinnedItems: [ClipMetadata] {
        filteredItems.filter(\.isPinned)
    }

    private var recentItems: [ClipMetadata] {
        filteredItems.filter { !$0.isPinned }
    }

    private var filteredItems: [ClipMetadata] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return clipboardManager.items
        }
        return clipboardManager.items.filter {
            $0.previewText.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if clipboardManager.items.isEmpty {
                    EmptyStateView(
                        symbolName: "clipboard",
                        title: "No Clips Yet",
                        message: "Copy something anywhere on your device, then come back to ClipKeep -- it will show up here automatically the next time you open the app."
                    )
                } else if filteredItems.isEmpty {
                    EmptyStateView(
                        symbolName: "magnifyingglass",
                        title: "No Matches",
                        message: "Nothing in your history matches \"\(searchText)\"."
                    )
                } else {
                    list
                }
            }
            .navigationTitle("ClipKeep")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Search your clips")
            .navigationDestination(item: $detailTarget) { metadata in
                ClipDetailView(metadata: metadata)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showSetupSteps) {
                SetupStepsView()
            }
            .clipKeepToast($clipboardManager.toastMessage)
        }
        .onAppear {
            clipboardManager.handleDidBecomeActive()
            keyboardConfirmed = KeyboardSettings.isKeyboardConfirmedWorking
        }
    }

    private var list: some View {
        List {
            if !keyboardConfirmed {
                Section {
                    setupPrompt
                }
            }
            if !pinnedItems.isEmpty {
                Section("Pinned") {
                    ForEach(pinnedItems) { metadata in
                        row(for: metadata)
                    }
                }
            }
            if !recentItems.isEmpty {
                if pinnedItems.isEmpty {
                    ForEach(recentItems) { metadata in
                        row(for: metadata)
                    }
                } else {
                    Section("Recent") {
                        ForEach(recentItems) { metadata in
                            row(for: metadata)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    /// Shown until the keyboard extension checks in for the first time, then
    /// gone for good. Enabling a keyboard is a seven-step trip through
    /// Settings that nobody discovers on their own.
    private var setupPrompt: some View {
        Button {
            showSetupSteps = true
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "keyboard.badge.ellipsis")
                    .font(.title3)
                    .foregroundStyle(Color.accentColor)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Use clips in any app")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text("Set up the ClipKeep keyboard")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
        }
        .buttonStyle(.plain)
    }

    private func row(for metadata: ClipMetadata) -> some View {
        ClipRowView(metadata: metadata)
            .contentShape(Rectangle())
            .onTapGesture {
                detailTarget = metadata
            }
            .swipeActions(edge: .leading, allowsFullSwipe: true) {
                Button {
                    clipboardManager.copyBack(metadata)
                } label: {
                    Label("Copy", systemImage: "doc.on.clipboard")
                }
                .tint(.accentColor)
            }
            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                Button(role: .destructive) {
                    clipboardManager.delete(metadata)
                } label: {
                    Label("Delete", systemImage: "trash")
                }
                Button {
                    clipboardManager.togglePinned(metadata)
                } label: {
                    Label(metadata.isPinned ? "Unpin" : "Pin", systemImage: metadata.isPinned ? "pin.slash" : "pin")
                }
                .tint(.orange)
            }
            .contextMenu {
                Button {
                    clipboardManager.copyBack(metadata)
                } label: {
                    Label("Copy to Clipboard", systemImage: "doc.on.clipboard")
                }
                Button {
                    clipboardManager.togglePinned(metadata)
                } label: {
                    Label(metadata.isPinned ? "Unpin" : "Pin", systemImage: metadata.isPinned ? "pin.slash" : "pin")
                }
                Button(role: .destructive) {
                    clipboardManager.delete(metadata)
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
    }
}

#Preview {
    ContentView()
        .environmentObject(ClipboardManager())
}
