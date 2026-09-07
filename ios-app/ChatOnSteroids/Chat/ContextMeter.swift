import SwiftUI

/// The desktop app shows a small ring for estimated context use. Same idea here,
/// with the same honesty: it is a local estimate, not the provider's counter.
struct ContextMeter: View {
    let fraction: Double
    let tokens: Int
    let limit: Int

    @State private var showDetail = false

    private var tint: Color {
        switch fraction {
        case ..<0.65: return .accentColor
        case ..<0.85: return .orange
        default: return .red
        }
    }

    var body: some View {
        Button {
            showDetail.toggle()
        } label: {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(0.25), lineWidth: 3)
                Circle()
                    .trim(from: 0, to: max(0.001, fraction))
                    .stroke(tint, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeOut(duration: 0.25), value: fraction)
            }
            .frame(width: 21, height: 21)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Estimated context use")
        .popover(isPresented: $showDetail) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Estimated context")
                    .font(.headline)
                Text("\(TokenEstimator.format(tokens)) of \(TokenEstimator.format(limit)) tokens")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("A local estimate from message length, not the provider's own counter. Change the budget in Settings.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
            .frame(width: 260)
            .presentationCompactAdaptation(.popover)
        }
    }
}
