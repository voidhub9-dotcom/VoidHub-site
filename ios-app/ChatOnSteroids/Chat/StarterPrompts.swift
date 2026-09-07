import SwiftUI

/// Suggestions on an empty chat. A blank composer is the hardest part of any chat
/// app to start from; four concrete openers beat a blinking cursor.
struct StarterPromptsView: View {
    var glass: Bool
    var onPick: (String) -> Void

    private static let prompts: [(icon: String, title: String, prompt: String)] = [
        (
            "curlybraces",
            "Explain this code",
            "Explain what this code does, then point out anything that looks wrong:\n\n"
        ),
        (
            "ladybug",
            "Debug an error",
            "I'm getting this error and I don't understand it. What's causing it and how do I fix it?\n\n"
        ),
        (
            "text.alignleft",
            "Summarise something",
            "Summarise the following in a few tight bullet points, keeping any numbers exact:\n\n"
        ),
        (
            "lightbulb",
            "Plan a build",
            "I want to build the following. Give me a concrete plan, the tradeoffs, and what to do first:\n\n"
        ),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Try one of these")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.leading, 4)

            ForEach(Array(Self.prompts.enumerated()), id: \.offset) { index, item in
                Button {
                    Haptics.tap()
                    onPick(item.prompt)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: item.icon)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Color.accentColor)
                            .frame(width: 30, height: 30)
                            .background(Color.accentColor.opacity(0.14), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                        Text(item.title)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.primary)
                        Spacer(minLength: 6)
                        Image(systemName: "arrow.up.left")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .glassSurface(cornerRadius: 14, enabled: glass)
                }
                .buttonStyle(.plain)
                .springEntrance(delay: 0.05 * Double(index))
            }
        }
    }
}
