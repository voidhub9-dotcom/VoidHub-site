import SwiftUI

enum AppTheme: String, Codable, Sendable, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

enum AccentPalette: String, Codable, Sendable, CaseIterable, Identifiable {
    case violet
    case teal
    case ocean
    case rose
    case ember
    case moss

    var id: String { rawValue }

    var label: String {
        switch self {
        case .violet: return "Violet"
        case .teal: return "Teal"
        case .ocean: return "Ocean"
        case .rose: return "Rose"
        case .ember: return "Ember"
        case .moss: return "Moss"
        }
    }

    var color: Color {
        switch self {
        case .violet: return Color(red: 0.49, green: 0.36, blue: 0.94)
        case .teal: return Color(red: 0.05, green: 0.68, blue: 0.64)
        case .ocean: return Color(red: 0.18, green: 0.52, blue: 0.92)
        case .rose: return Color(red: 0.90, green: 0.31, blue: 0.52)
        case .ember: return Color(red: 0.94, green: 0.48, blue: 0.18)
        case .moss: return Color(red: 0.35, green: 0.66, blue: 0.32)
        }
    }

    /// The second and third stops of the aurora wash behind the app.
    var auroraCompanions: (Color, Color) {
        switch self {
        case .violet: return (Color(red: 0.24, green: 0.42, blue: 0.95), Color(red: 0.85, green: 0.30, blue: 0.72))
        case .teal: return (Color(red: 0.16, green: 0.52, blue: 0.72), Color(red: 0.40, green: 0.80, blue: 0.55))
        case .ocean: return (Color(red: 0.36, green: 0.30, blue: 0.90), Color(red: 0.20, green: 0.74, blue: 0.86))
        case .rose: return (Color(red: 0.62, green: 0.26, blue: 0.78), Color(red: 0.96, green: 0.55, blue: 0.38))
        case .ember: return (Color(red: 0.86, green: 0.26, blue: 0.36), Color(red: 0.96, green: 0.74, blue: 0.24))
        case .moss: return (Color(red: 0.18, green: 0.55, blue: 0.44), Color(red: 0.72, green: 0.78, blue: 0.28))
        }
    }
}

enum BubbleStyle: String, Codable, Sendable, CaseIterable, Identifiable {
    /// Solid accent for the user, system fill for the assistant.
    case solid
    /// Translucent material on both sides — the glassy look.
    case glass
    /// No bubble on the assistant side at all; text sits on the background.
    case minimal

    var id: String { rawValue }

    var label: String {
        switch self {
        case .solid: return "Solid"
        case .glass: return "Glass"
        case .minimal: return "Minimal"
        }
    }
}

enum FontScale: String, Codable, Sendable, CaseIterable, Identifiable {
    case compact
    case standard
    case large

    var id: String { rawValue }

    var label: String {
        switch self {
        case .compact: return "Compact"
        case .standard: return "Standard"
        case .large: return "Large"
        }
    }

    var dynamicTypeSize: DynamicTypeSize {
        switch self {
        case .compact: return .small
        case .standard: return .medium
        case .large: return .xLarge
        }
    }
}
