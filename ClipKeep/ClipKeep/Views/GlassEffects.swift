//
//  GlassEffects.swift
//  ClipKeep
//
//  A small adaptive layer over Apple's Liquid Glass APIs (iOS 26+). Those
//  APIs -- `Glass`, `.glassEffect(_:in:)`, `GlassEffectContainer`, and the
//  `.glass` / `.glassProminent` button styles -- have no back-deployment
//  story, so a project with a deployment target below iOS 26 (this one
//  targets 17.0, to keep running on older phones) has to branch on
//  `#available` at every call site. Centralizing that here means the actual
//  view code only ever says "give me glass" once, instead of repeating the
//  same `if #available` five times across the app.
//
//  On iOS 26 and later this renders real Liquid Glass. On everything from
//  17 up to 25 it falls back to `.ultraThinMaterial` (available since
//  iOS 15), which is the closest first-party equivalent -- a translucent,
//  blurred surface -- and keeps the same visual rhythm (soft depth, content
//  showing through) even without the new material's live specular
//  highlights.
//

import SwiftUI

extension View {
    /// Applies a glass (or material, pre-iOS 26) background in the given
    /// shape. Intended for small, chrome-like surfaces -- badges, chips,
    /// floating buttons -- not for large content backgrounds; Apple's own
    /// guidance reserves Liquid Glass for the navigation/controls layer
    /// that floats above content, not the content itself.
    ///
    /// Takes a concrete `InsettableShape` rather than a type-erased `AnyShape`:
    /// the fallback path strokes the outline with `strokeBorder`, which only
    /// exists on `InsettableShape` (it insets by half the line width so the
    /// hairline sits fully inside the fill). `AnyShape` erases that capability
    /// away, so it can't be used here.
    @ViewBuilder
    func adaptiveGlassBackground<S: InsettableShape>(
        in shape: S,
        tint: Color? = nil,
        interactive: Bool = false
    ) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(glassStyle(tint: tint, interactive: interactive), in: shape)
        } else {
            self
                .background(.ultraThinMaterial, in: shape)
                .overlay(shape.strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5))
        }
    }

    /// Convenience overload for the common case of a circular glass badge.
    @ViewBuilder
    func adaptiveGlassCircle(tint: Color? = nil, interactive: Bool = false) -> some View {
        adaptiveGlassBackground(in: Circle(), tint: tint, interactive: interactive)
    }
}

@available(iOS 26.0, *)
private func glassStyle(tint: Color?, interactive: Bool) -> Glass {
    var glass = Glass.regular
    if let tint {
        glass = glass.tint(tint)
    }
    if interactive {
        glass = glass.interactive()
    }
    return glass
}

/// A circular icon button rendered as Liquid Glass on iOS 26+, or a plain
/// material-backed circle on earlier versions. Used for the small secondary
/// actions (pin, delete) that sit alongside a prominent primary action in a
/// floating bottom bar -- the same layout pattern Photos and Files use for
/// their detail-view action bars.
struct GlassIconButton: View {
    let systemName: String
    let accessibilityLabel: String
    let tint: Color
    var role: ButtonRole?
    let action: () -> Void

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                Button(role: role, action: action) {
                    icon
                }
                .buttonStyle(.glass)
            } else {
                Button(role: role, action: action) {
                    icon
                        .adaptiveGlassCircle()
                }
                .buttonStyle(.plain)
            }
        }
        .accessibilityLabel(accessibilityLabel)
    }

    private var icon: some View {
        Image(systemName: systemName)
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 44, height: 44)
            .contentShape(Circle())
    }
}
