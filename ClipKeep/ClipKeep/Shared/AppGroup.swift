//
//  AppGroup.swift
//  ClipKeep
//
//  Where the app and the keyboard extension meet.
//
//  The keyboard runs in its own process with its own sandbox. The only way it
//  can see clips the main app captured is through an App Group container both
//  targets are entitled to. Three things about that are worth knowing before
//  reading the rest of this file:
//
//   1. iOS only lets a keyboard extension touch shared containers when the
//      user has turned on "Allow Full Access" for it. Without that the
//      keyboard is fully sandboxed -- it can draw its UI, but every lookup
//      here returns nil and it will find no clips. SetupStepsView walks the
//      user through switching it on, and the keyboard says so on screen
//      rather than just appearing broken.
//
//   2. The entitlement is applied at *signing* time. An unsigned build, or
//      one re-signed without the group, has no container at all. So every
//      accessor here degrades to the app's own Application Support directory
//      instead of trapping: the app stays completely usable standalone, and
//      only app <-> keyboard sharing stops working.
//
//   3. If you change `identifier` you must change it in BOTH entitlements
//      files (ClipKeep.entitlements and ClipKeepKeyboard.entitlements) to
//      match, or the two targets end up entitled to different containers and
//      silently stop seeing each other.
//

import Foundation
import os

enum AppGroup {

    /// Must match the `com.apple.security.application-groups` value in both
    /// targets' entitlements. Sideloading tools that rewrite bundle IDs
    /// generally rewrite this too; if yours doesn't, change it here and in
    /// both .entitlements files together.
    static let identifier = "group.com.clipkeep.app"

    private static let logger = Logger(subsystem: "com.clipkeep.app", category: "AppGroup")

    /// The shared container, or nil when this build isn't entitled to it
    /// (unsigned build, re-signed without the group, or a keyboard extension
    /// running without Full Access).
    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }

    /// Whether shared storage is actually reachable from this process right
    /// now. The keyboard uses this to explain itself instead of showing an
    /// empty list that looks like a bug.
    static var isAvailable: Bool {
        containerURL != nil
    }

    /// Shared preferences, falling back to this process's own standard
    /// defaults when the group isn't reachable. The fallback keeps settings
    /// working locally; it just means the keyboard won't observe changes the
    /// app makes (and vice versa).
    static var defaults: UserDefaults {
        UserDefaults(suiteName: identifier) ?? .standard
    }

    /// True when `defaults` is genuinely the shared suite rather than the
    /// per-process fallback.
    static var hasSharedDefaults: Bool {
        UserDefaults(suiteName: identifier) != nil
    }

    /// Storage root for clip data: the shared container when available, and
    /// the process's own Application Support directory when it isn't.
    ///
    /// Returns the parent directory only -- PersistenceStore appends its own
    /// "ClipKeep" folder, so the two cases produce the same layout under
    /// different roots and migration between them is a straight move.
    static func storageParentDirectory(fileManager: FileManager = .default) -> URL {
        if let container = containerURL {
            return container
        }
        logger.notice("App Group container unavailable; falling back to local Application Support")
        return fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
    }

    /// The app-local directory clip data lived in before the App Group move.
    /// Kept so an existing install's history migrates forward instead of
    /// looking like it was wiped.
    static func legacyStorageDirectory(fileManager: FileManager = .default) -> URL {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        return appSupport.appendingPathComponent("ClipKeep", isDirectory: true)
    }
}
