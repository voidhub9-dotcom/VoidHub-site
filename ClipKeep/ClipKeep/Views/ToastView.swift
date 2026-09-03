//
//  ToastView.swift
//  ClipKeep
//
//  A brief, self-dismissing confirmation banner (e.g. "Copied to
//  Clipboard"). Attach with the `.clipKeepToast(_:)` view modifier bound to
//  an `Optional<ToastMessage>` published property.
//

import Foundation
import SwiftUI

struct ToastMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
    let symbolName: String
}

private struct ToastView: View {
    let message: ToastMessage

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: message.symbolName)
                .imageScale(.medium)
            Text(message.text)
                .font(.subheadline.weight(.semibold))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .adaptiveGlassBackground(in: Capsule())
        .shadow(color: .black.opacity(0.15), radius: 8, y: 3)
        .accessibilityElement(children: .combine)
    }
}

private struct ToastModifier: ViewModifier {
    @Binding var toast: ToastMessage?
    let duration: TimeInterval

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let toast {
                ToastView(message: toast)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: toast.id) {
                        try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
                        guard !Task.isCancelled else { return }
                        withAnimation(.easeOut(duration: 0.25)) {
                            self.toast = nil
                        }
                    }
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: toast)
    }
}

extension View {
    /// Shows a transient confirmation banner whenever `message` becomes
    /// non-nil, then clears it automatically after `duration` seconds.
    func clipKeepToast(_ message: Binding<ToastMessage?>, duration: TimeInterval = 1.6) -> some View {
        modifier(ToastModifier(toast: message, duration: duration))
    }
}
