//
//  EmptyStateView.swift
//  ClipKeep
//
//  Shown when there is no history yet, or when a search has no matches.
//  Written by hand (rather than ContentUnavailableView) so ClipKeep keeps
//  working on iOS versions below 17.
//

import SwiftUI

struct EmptyStateView: View {
    let symbolName: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: symbolName)
                .font(.system(size: 34, weight: .medium))
                .foregroundStyle(.secondary)
                .frame(width: 88, height: 88)
                .adaptiveGlassCircle()
                .padding(.bottom, 4)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    EmptyStateView(
        symbolName: "clipboard",
        title: "No Clips Yet",
        message: "Copy something anywhere on your device, then come back to ClipKeep to see it here."
    )
}
