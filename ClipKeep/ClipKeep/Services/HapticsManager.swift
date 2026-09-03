//
//  HapticsManager.swift
//  ClipKeep
//
//  Thin wrapper around UIKit's feedback generators. Centralized so call
//  sites read as intent ("confirm", "warn") rather than juggling generator
//  types, and so generators are prepared ahead of time to avoid the small
//  latency spike UIKit incurs on first use.
//

import UIKit

@MainActor
final class HapticsManager {

    static let shared = HapticsManager()

    private let notificationGenerator = UINotificationFeedbackGenerator()
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let lightImpactGenerator = UIImpactFeedbackGenerator(style: .light)

    private init() {
        notificationGenerator.prepare()
        selectionGenerator.prepare()
        lightImpactGenerator.prepare()
    }

    /// A clip was copied back to the pasteboard successfully.
    func confirmSuccess() {
        notificationGenerator.notificationOccurred(.success)
        notificationGenerator.prepare()
    }

    /// A destructive or failing action occurred (delete, clear-all, read error).
    func confirmWarning() {
        notificationGenerator.notificationOccurred(.warning)
        notificationGenerator.prepare()
    }

    /// Lightweight tap feedback for row selection / pin toggles.
    func selectionChanged() {
        selectionGenerator.selectionChanged()
        selectionGenerator.prepare()
    }

    /// Very light feedback for minor UI interactions (swipe reveal, etc.).
    func lightImpact() {
        lightImpactGenerator.impactOccurred()
        lightImpactGenerator.prepare()
    }
}
