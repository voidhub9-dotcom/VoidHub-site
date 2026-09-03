//
//  KeyboardViewController.swift
//  ClipKeepKeyboard
//
//  The custom keyboard: your clip history, available inside every app that
//  has a text field, without switching away to go copy something.
//
//  Two constraints shape everything in here, and both come from iOS rather
//  than from this code:
//
//   * Full Access. Until the user turns it on, a keyboard extension cannot
//     read App Group containers and cannot touch UIPasteboard. That means no
//     clips and no copying -- so the UI states that plainly instead of
//     rendering an empty list. SetupStepsView in the app walks them through
//     it.
//
//   * Memory. Extensions are killed at a far lower memory ceiling than apps.
//     The index is small, so it loads freely, but clip payloads are only read
//     when a row is tapped, and anything above `maxKeyboardPayloadBytes` is
//     refused outright with an explanation -- a large image copied here would
//     take the keyboard down mid-tap, which reads to the user as a crash.
//

import UIKit
import SwiftUI

final class KeyboardViewController: UIInputViewController {

    /// Ceiling for a payload the keyboard will load into memory. Well under
    /// the extension memory limit, leaving room for the pasteboard's own copy
    /// of the same bytes during the handoff.
    private static let maxKeyboardPayloadBytes = 8 * 1024 * 1024

    private let store = KeyboardClipStore()
    private var hostingController: UIHostingController<KeyboardRootView>?
    private var heightConstraint: NSLayoutConstraint?

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        // Doubles as the app's proof that the keyboard is installed AND has
        // Full Access: without both, this write goes nowhere the app can read.
        KeyboardSettings.recordKeyboardLaunch(hasFullAccess: hasFullAccess)

        view.backgroundColor = .clear
        applyAppearanceOverride()
        installHostingController()
        applyHeight()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Settings and clips can both have changed in the app since the last
        // time this keyboard was on screen, and an extension is torn down and
        // rebuilt often enough that this is the natural refresh point.
        applyAppearanceOverride()
        applyHeight()
        store.reload(hasFullAccess: hasFullAccess)
        refreshRootView()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        applyHeight()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        // The host field's appearance is the only reliable hint about the
        // surrounding context's colour scheme, and it can change between
        // fields within the same app.
        applyAppearanceOverride()
    }

    // MARK: - Setup

    private func installHostingController() {
        let controller = UIHostingController(rootView: makeRootView())
        controller.view.backgroundColor = .clear
        controller.view.translatesAutoresizingMaskIntoConstraints = false

        addChild(controller)
        view.addSubview(controller.view)
        NSLayoutConstraint.activate([
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        controller.didMove(toParent: self)

        hostingController = controller
    }

    private func makeRootView() -> KeyboardRootView {
        KeyboardRootView(
            store: store,
            actions: makeActions(),
            hasFullAccess: hasFullAccess
        )
    }

    private func refreshRootView() {
        hostingController?.rootView = makeRootView()
    }

    /// Applies the height the user picked in the app's Preview tab.
    ///
    /// Priority 999 rather than required: the system owns the final say on
    /// keyboard geometry (rotation, Split View, hardware keyboard attached),
    /// and a required constraint that disagrees with it produces console-
    /// spamming conflicts and an unpredictable layout.
    private func applyHeight() {
        let target = KeyboardSettings.height
        if let heightConstraint {
            guard heightConstraint.constant != target else { return }
            heightConstraint.constant = target
        } else {
            let constraint = NSLayoutConstraint(
                item: view!,
                attribute: .height,
                relatedBy: .equal,
                toItem: nil,
                attribute: .notAnAttribute,
                multiplier: 1,
                constant: target
            )
            constraint.priority = UILayoutPriority(999)
            view.addConstraint(constraint)
            heightConstraint = constraint
        }
    }

    private func applyAppearanceOverride() {
        switch KeyboardSettings.appearance {
        case .system:
            // Follow the host app's keyboard appearance, which is what the
            // surrounding text field asked for. Compared rather than switched
            // because UITextInputTraits members are @optional in ObjC and
            // surface differently across SDK versions; `==` compiles whether
            // this arrives as UIKeyboardAppearance or an Optional of it.
            let appearance = textDocumentProxy.keyboardAppearance
            if appearance == .dark {
                overrideUserInterfaceStyle = .dark
            } else if appearance == .light {
                overrideUserInterfaceStyle = .light
            } else {
                overrideUserInterfaceStyle = .unspecified
            }
        case .light:
            overrideUserInterfaceStyle = .light
        case .dark:
            overrideUserInterfaceStyle = .dark
        }
    }

    // MARK: - Actions handed to the SwiftUI layer

    private func makeActions() -> KeyboardActions {
        KeyboardActions(
            insertText: { [weak self] text in
                self?.textDocumentProxy.insertText(text)
            },
            deleteBackward: { [weak self] in
                self?.textDocumentProxy.deleteBackward()
            },
            insertNewline: { [weak self] in
                self?.textDocumentProxy.insertText("\n")
            },
            copyToPasteboard: { [weak self] metadata in
                guard let self else { return .failed }
                guard self.hasFullAccess else { return .needsFullAccess }
                guard metadata.approximateByteCount <= Self.maxKeyboardPayloadBytes else { return .tooLarge }
                return self.store.copyToPasteboard(metadata, hasFullAccess: true) ? .copied : .failed
            },
            // iOS hides the globe key when ClipKeep is the only third-party
            // keyboard installed, and shipping a key that switches to nothing
            // is worse than shipping no key.
            advanceToNextInputMode: needsInputModeSwitchKey
                ? { [weak self] in self?.advanceToNextInputMode() }
                : nil,
            playInputFeedback: { [weak self] in
                self?.playInputFeedback()
            }
        )
    }

    /// Haptic tap on each key press. Requires Full Access -- the haptic
    /// engine is off-limits to a sandboxed keyboard -- so it is simply
    /// skipped rather than guarded at every call site.
    private func playInputFeedback() {
        guard hasFullAccess, KeyboardSettings.hapticsEnabled else { return }
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
}
