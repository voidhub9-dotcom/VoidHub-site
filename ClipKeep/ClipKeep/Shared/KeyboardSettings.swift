//
//  KeyboardSettings.swift
//  ClipKeep
//
//  Settings the keyboard extension reads and the main app writes, stored in
//  the shared App Group defaults so a change made in the app's Preview tab
//  shows up the next time the keyboard is opened.
//
//  Also carries the keyboard's "heartbeat": the extension stamps the shared
//  defaults every time it loads. That stamp is the app's only reliable way to
//  know the keyboard is actually installed and working -- iOS gives a
//  containing app no API to query whether its own keyboard is enabled, and
//  the old trick of reading the private `AppleKeyboards` default stopped
//  being dependable years ago. Since writing the stamp requires shared-
//  container access, and shared-container access requires Full Access, the
//  presence of a recent stamp proves both halves of the setup at once.
//

import Foundation
import CoreGraphics

/// How the keyboard paints itself, independent of the host app's appearance.
enum KeyboardAppearanceStyle: String, CaseIterable, Identifiable, Codable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}

/// What a tap on a clip row does in the keyboard.
enum KeyboardInsertBehavior: String, CaseIterable, Identifiable, Codable {
    /// Type the clip's text into the field (the common case).
    case insertText
    /// Put the clip on the system pasteboard so the user pastes it manually.
    /// Needed for images, which cannot be "typed" into a text field at all.
    case copyToPasteboard

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .insertText: return "Insert Text"
        case .copyToPasteboard: return "Copy to Clipboard"
        }
    }
}

enum KeyboardSettings {

    // Bounds chosen against the system keyboard's own portrait height (about
    // 216pt on most iPhones): low enough that the keyboard never dwarfs the
    // field being typed into, tall enough to show a useful number of clips.
    static let minHeight: CGFloat = 216
    static let maxHeight: CGFloat = 380
    static let defaultHeight: CGFloat = 280

    private enum Keys {
        static let height = "clipkeep.keyboard.height"
        static let appearance = "clipkeep.keyboard.appearance"
        static let insertBehavior = "clipkeep.keyboard.insertBehavior"
        static let favoritesOnly = "clipkeep.keyboard.favoritesOnly"
        static let hapticsEnabled = "clipkeep.keyboard.haptics"
        static let lastLaunchedAt = "clipkeep.keyboard.lastLaunchedAt"
        static let lastKnownFullAccess = "clipkeep.keyboard.lastKnownFullAccess"
    }

    // MARK: - Values

    static var height: CGFloat {
        get {
            let stored = AppGroup.defaults.double(forKey: Keys.height)
            guard stored > 0 else { return defaultHeight }
            return min(max(CGFloat(stored), minHeight), maxHeight)
        }
        set {
            let clamped = min(max(newValue, minHeight), maxHeight)
            AppGroup.defaults.set(Double(clamped), forKey: Keys.height)
        }
    }

    static var appearance: KeyboardAppearanceStyle {
        get {
            guard let raw = AppGroup.defaults.string(forKey: Keys.appearance),
                  let value = KeyboardAppearanceStyle(rawValue: raw) else { return .system }
            return value
        }
        set { AppGroup.defaults.set(newValue.rawValue, forKey: Keys.appearance) }
    }

    static var insertBehavior: KeyboardInsertBehavior {
        get {
            guard let raw = AppGroup.defaults.string(forKey: Keys.insertBehavior),
                  let value = KeyboardInsertBehavior(rawValue: raw) else { return .insertText }
            return value
        }
        set { AppGroup.defaults.set(newValue.rawValue, forKey: Keys.insertBehavior) }
    }

    static var favoritesOnly: Bool {
        get { AppGroup.defaults.bool(forKey: Keys.favoritesOnly) }
        set { AppGroup.defaults.set(newValue, forKey: Keys.favoritesOnly) }
    }

    static var hapticsEnabled: Bool {
        get {
            // Default on: absence of the key means "never set", not "off".
            guard AppGroup.defaults.object(forKey: Keys.hapticsEnabled) != nil else { return true }
            return AppGroup.defaults.bool(forKey: Keys.hapticsEnabled)
        }
        set { AppGroup.defaults.set(newValue, forKey: Keys.hapticsEnabled) }
    }

    // MARK: - Keyboard heartbeat

    /// Called by the extension every time it loads. Only succeeds when the
    /// keyboard has Full Access, which is exactly what makes it a usable
    /// signal for the app.
    static func recordKeyboardLaunch(hasFullAccess: Bool) {
        AppGroup.defaults.set(Date(), forKey: Keys.lastLaunchedAt)
        AppGroup.defaults.set(hasFullAccess, forKey: Keys.lastKnownFullAccess)
    }

    /// When the keyboard extension last reported for duty, or nil if it never
    /// has from a context that could write here.
    static var lastKeyboardLaunch: Date? {
        AppGroup.defaults.object(forKey: Keys.lastLaunchedAt) as? Date
    }

    static var lastKnownFullAccess: Bool {
        AppGroup.defaults.bool(forKey: Keys.lastKnownFullAccess)
    }

    /// Best available answer to "is the keyboard set up and working?".
    ///
    /// A heartbeat can only be written from a keyboard that has Full Access
    /// and a reachable shared container, so its presence confirms the whole
    /// chain. Its absence is genuinely ambiguous -- not installed, installed
    /// without Full Access, or installed but never opened yet -- which is why
    /// the setup screen presents this as "not confirmed yet" rather than
    /// asserting the keyboard is missing.
    static var isKeyboardConfirmedWorking: Bool {
        lastKeyboardLaunch != nil && lastKnownFullAccess && AppGroup.isAvailable
    }
}
