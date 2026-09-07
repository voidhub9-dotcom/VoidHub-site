import SwiftUI

/// The "working on it" state before any tokens arrive: three dots breathing out of
/// phase, on a material pill.
struct ThinkingIndicator: View {
    var glass: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Color.accentColor.opacity(0.85))
                    .frame(width: 7, height: 7)
                    .scaleEffect(scale(for: index))
                    .animation(
                        reduceMotion
                            ? nil
                            : .easeInOut(duration: 0.55).repeatForever().delay(Double(index) * 0.16),
                        value: phase
                    )
            }
            Text("Thinking")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.leading, 2)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .glassSurface(cornerRadius: Theme.bubbleCorner, enabled: glass)
        .onAppear { phase = 1 }
    }

    private func scale(for index: Int) -> CGFloat {
        guard !reduceMotion else { return 1 }
        return phase == 0 ? 0.6 : 1.15
    }
}

/// A blinking block caret appended to the answer while it streams, so a pause in
/// the token flow still reads as "live" rather than "finished".
struct StreamingCaret: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var visible = true

    var body: some View {
        RoundedRectangle(cornerRadius: 1.5, style: .continuous)
            .fill(Color.accentColor)
            .frame(width: 8, height: 16)
            .opacity(visible ? 1 : 0.15)
            .animation(
                reduceMotion ? nil : .easeInOut(duration: 0.55).repeatForever(autoreverses: true),
                value: visible
            )
            .onAppear { visible = false }
            .accessibilityHidden(true)
    }
}

/// Floating glass pill that appears when the transcript is scrolled away from the
/// newest message.
struct ScrollToBottomButton: View {
    var glass: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "arrow.down")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.accentColor)
                .frame(width: 38, height: 38)
                .glassSurface(cornerRadius: 19, enabled: glass, strokeOpacity: 0.28)
                .shadow(color: .black.opacity(0.16), radius: 8, y: 3)
        }
        .buttonStyle(.plain)
        .transition(.scale.combined(with: .opacity))
        .accessibilityLabel("Scroll to newest message")
    }
}
