//
//  ContentView.swift
//  ClipKeep
//

import Foundation
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var clipboardManager: ClipboardManager
    @State private var searchText = ""
    @State private var showSettings = false
    @State private var detailTarget: ClipMetadata?

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
            .clipKeepToast($clipboardManager.toastMessage)
        }
        .onAppear {
            clipboardManager.handleDidBecomeActive()
        }
    }

    private var list: some View {
        List {
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
