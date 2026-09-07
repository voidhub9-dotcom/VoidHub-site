import SwiftUI

enum Theme {
    static let projectColors: [Color] = [
        Color(red: 0.43, green: 0.39, blue: 0.90),
        Color(red: 0.00, green: 0.64, blue: 0.60),
        Color(red: 0.85, green: 0.44, blue: 0.20),
        Color(red: 0.83, green: 0.28, blue: 0.48),
        Color(red: 0.25, green: 0.55, blue: 0.85),
        Color(red: 0.40, green: 0.66, blue: 0.28),
    ]

    static func projectColor(_ index: Int) -> Color {
        guard !projectColors.isEmpty else { return .accentColor }
        let safe = ((index % projectColors.count) + projectColors.count) % projectColors.count
        return projectColors[safe]
    }

    static let bubbleCorner: CGFloat = 18
    static let cardCorner: CGFloat = 16
}

extension Color {
    static let userBubble = Color.accentColor
    static let assistantBubble = Color(uiColor: .secondarySystemBackground)
    static let codeBackground = Color(uiColor: .tertiarySystemBackground)
}
