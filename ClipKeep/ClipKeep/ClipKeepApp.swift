//
//  ClipKeepApp.swift
//  ClipKeep
//
//  A local, on-device clipboard history manager. Copy something anywhere on
//  your phone, open ClipKeep, and everything you copied is there, byte for
//  byte, ready to paste back exactly as it was copied.
//

import SwiftUI

@main
struct ClipKeepApp: App {
    @StateObject private var clipboardManager = ClipboardManager()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(clipboardManager)
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .active:
                clipboardManager.handleDidBecomeActive()
            case .inactive, .background:
                clipboardManager.handleDidResignActive()
            @unknown default:
                break
            }
        }
    }
}
