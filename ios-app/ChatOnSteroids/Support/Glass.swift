import SwiftUI

/// A slow-drifting wash of coloured light behind the app.
///
/// Three blurred blobs on a very long, out-of-phase animation, sitting under a
/// material layer. Deliberately not `MeshGradient` — that is iOS 18, and this ships
/// to iOS 17. The motion is slow enough to read as ambient rather than busy, and
/// it stops entirely when Reduce Motion is on or glass is switched off.
struct AuroraBackground: View {
    var palette: AccentPalette
    var enabled: Bool = true

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var colorScheme
    @State private var drift = false

    private var blobs: [Color] {
        let (second, third) = palette.auroraCompanions
        return [palette.color, second, third]
    }

    var body: some View {
        ZStack {
            baseFill

            if enabled {
                GeometryReader { proxy in
                    let side = max(proxy.size.width, proxy.size.height)
                    ZStack {
                        blob(blobs[0], size: side * 0.95)
                            .offset(
                                x: drift ? -side * 0.22 : side * 0.18,
                                y: drift ? -side * 0.30 : -side * 0.12
                            )
                        blob(blobs[1], size: side * 0.85)
                            .offset(
                                x: drift ? side * 0.28 : -side * 0.16,
                                y: drift ? side * 0.10 : side * 0.32
                            )
                        blob(blobs[2], size: side * 0.75)
                            .offset(
                                x: drift ? -side * 0.10 : side * 0.24,
                                y: drift ? side * 0.34 : side * 0.06
                            )
                    }
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .blur(radius: 70)
                }
                .ignoresSafeArea()
                .opacity(colorScheme == .dark ? 0.55 : 0.38)
                .animation(motion, value: drift)
                .onAppear {
                    guard !reduceMotion else { return }
                    drift = true
                }
            }
        }
        .ignoresSafeArea()
    }

    private var motion: Animation? {
        reduceMotion ? nil : .easeInOut(duration: 26).repeatForever(autoreverses: true)
    }

    private var baseFill: some View {
        Color(uiColor: .systemBackground)
    }

    private func blob(_ color: Color, size: CGFloat) -> some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [color.opacity(0.95), color.opacity(0.0)],
                    center: .center,
                    startRadius: 0,
                    endRadius: size / 2
                )
            )
            .frame(width: size, height: size)
    }
}

// MARK: - Surfaces

extension View {
    /// A translucent card. Falls back to an opaque fill when glass is switched off,
    /// so the setting is a real choice rather than a cosmetic one.
    @ViewBuilder
    func glassSurface(cornerRadius: CGFloat = Theme.cardCorner, enabled: Bool = true, strokeOpacity: Double = 0.16) -> some View {
        if enabled {
            self
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [.white.opacity(strokeOpacity), .white.opacity(strokeOpacity * 0.25)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.8
                        )
                )
        } else {
            self
                .background(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color(uiColor: .secondarySystemBackground))
                )
        }
    }

    /// Scales and fades content in on first appearance with a spring.
    func springEntrance(delay: Double = 0) -> some View {
        modifier(SpringEntrance(delay: delay))
    }
}

private struct SpringEntrance: ViewModifier {
    let delay: Double

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .scaleEffect(shown ? 1 : 0.94, anchor: .bottom)
            .offset(y: shown ? 0 : 10)
            .onAppear {
                guard !reduceMotion else {
                    shown = true
                    return
                }
                withAnimation(.spring(response: 0.42, dampingFraction: 0.78).delay(delay)) {
                    shown = true
                }
            }
    }
}

