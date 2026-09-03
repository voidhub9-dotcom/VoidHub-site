//
//  SetupStepsView.swift
//  ClipKeep
//
//  Walks through enabling the ClipKeep keyboard, because iOS gives an app no
//  way to do any of it programmatically. There is no API to install a
//  keyboard, no API to grant Full Access, and no API to even *ask* -- the
//  switches live in Settings and only the user can flip them. All this screen
//  can do is take them to the right page and show exactly what to tap.
//
//  The illustrations are drawn here in SwiftUI rather than shipped as
//  screenshots: drawn mocks stay correct when iOS restyles Settings, cost a
//  few hundred bytes instead of a few hundred kilobytes, and are ours to
//  ship.
//
//  Progress detection is deliberately one-directional. `isKeyboardConfirmedWorking`
//  can only become true by the keyboard extension writing into the shared
//  container, which requires both installation and Full Access -- so a
//  confirmation is trustworthy, while its absence is genuinely ambiguous (not
//  installed / no Full Access / installed but never opened). The copy says
//  "not confirmed yet" instead of claiming the keyboard is missing.
//

import SwiftUI
import UIKit

struct SetupStepsView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var isConfirmed = KeyboardSettings.isKeyboardConfirmedWorking
    @State private var lastLaunch = KeyboardSettings.lastKeyboardLaunch

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    statusCard

                    step(
                        number: 1,
                        title: "Open Keyboard settings",
                        detail: "Settings › General › Keyboard › Keyboards. The button below jumps to ClipKeep's page in Settings; General › Keyboard is one level up from there."
                    ) {
                        MockPhone {
                            MockSettingsRow(title: "Keyboards", trailing: "3", showsChevron: true)
                            MockSettingsRow(title: "Text Replacement", showsChevron: true)
                        }
                    }

                    step(
                        number: 2,
                        title: "Choose Add New Keyboard…",
                        detail: "It sits under the list of keyboards you already have."
                    ) {
                        MockPhone(title: "Keyboards") {
                            MockSettingsRow(title: "English (US)", showsChevron: true)
                            MockSettingsRow(title: "Emoji")
                            MockSettingsRow(title: "Add New Keyboard…", showsChevron: true, isHighlighted: true)
                        }
                    }

                    step(
                        number: 3,
                        title: "Add ClipKeep",
                        detail: "It appears under THIRD-PARTY KEYBOARDS, below the suggested system ones."
                    ) {
                        MockPhone(title: "Add New Keyboard") {
                            MockSectionHeader("Suggested Keyboards")
                            MockSettingsRow(title: "English (UK)")
                            MockSectionHeader("Third-Party Keyboards")
                            MockSettingsRow(title: "ClipKeep", isHighlighted: true)
                        }
                    }

                    step(
                        number: 4,
                        title: "Tap ClipKeep in the list",
                        detail: "Back on the Keyboards screen it now appears as its own row. Open it."
                    ) {
                        MockPhone(title: "Keyboards") {
                            MockSettingsRow(title: "English (US)", showsChevron: true)
                            MockSettingsRow(title: "Emoji")
                            MockSettingsRow(title: "ClipKeep", subtitle: "English", showsChevron: true, isHighlighted: true)
                        }
                    }

                    step(
                        number: 5,
                        title: "Turn on Allow Full Access",
                        detail: "This is the one that matters. iOS blocks keyboards from reading shared app data until it is on, so without it ClipKeep's keyboard opens to an empty list."
                    ) {
                        MockPhone {
                            MockToggleRow(title: "Allow Full Access", isOn: true)
                        }
                    }

                    step(
                        number: 6,
                        title: "Tap Allow on the system warning",
                        detail: "iOS shows this alert for every third-party keyboard. ClipKeep contains no networking code at all -- nothing it reads leaves your device -- but the warning is the system's, shown regardless of what the keyboard does."
                    ) {
                        MockAlert(
                            title: "Allow Full Access for \"ClipKeep\" Keyboards?",
                            message: "Full access allows the developer of this keyboard to transmit anything you type.",
                            confirmTitle: "Allow"
                        )
                    }

                    step(
                        number: 7,
                        title: "Use it anywhere",
                        detail: "In any text field, press and hold the globe key and pick ClipKeep. Tap a clip to insert it."
                    ) {
                        MockPhone {
                            MockSettingsRow(title: "🌐  Hold to switch keyboards")
                        }
                    }

                    Button {
                        openSystemSettings()
                    } label: {
                        Label("Open ClipKeep in Settings", systemImage: "gearshape.2")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Setup steps")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            // Re-checked on return from Settings: the keyboard may have been
            // enabled and opened while this screen sat in the background.
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                refreshStatus()
            }
            .onAppear(perform: refreshStatus)
        }
    }

    // MARK: - Status

    /// True when this build was signed without the App Group entitlement,
    /// which is the norm for sideloaded builds: App Groups require a paid
    /// Apple Developer account, so free-Apple-ID signing strips them.
    private var isStandalone: Bool { !AppGroup.isAvailable }

    private var statusCard: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: statusSymbol)
                .font(.system(size: 26))
                .foregroundStyle(statusColor)

            VStack(alignment: .leading, spacing: 3) {
                Text(statusTitle)
                    .font(.headline)
                Text(statusDetail)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var statusSymbol: String {
        if isConfirmed { return "checkmark.circle.fill" }
        return isStandalone ? "keyboard.badge.ellipsis" : "hourglass.circle.fill"
    }

    private var statusColor: Color {
        if isConfirmed { return .green }
        return isStandalone ? .blue : .orange
    }

    private var statusTitle: String {
        if isConfirmed { return "Keyboard is working" }
        return isStandalone ? "Keyboard runs on its own" : "Not confirmed yet"
    }

    private var statusDetail: String {
        if isConfirmed {
            if let lastLaunch {
                return "ClipKeep's keyboard last reported in at \(lastLaunch.formatted(date: .abbreviated, time: .shortened)) with Full Access on."
            }
            return "ClipKeep's keyboard has Full Access and can read your clips."
        }
        if isStandalone {
            return "This build was signed without ClipKeep's App Group, which sideloading with a free Apple ID cannot provide. The keyboard still works: it keeps its own history and captures what you copy directly. That history is separate from this list, and the app can't confirm the keyboard's status for the same reason."
        }
        return "Finish the steps below, then open the ClipKeep keyboard once in any app. This card updates by itself when it checks in."
    }

    private func refreshStatus() {
        isConfirmed = KeyboardSettings.isKeyboardConfirmedWorking
        lastLaunch = KeyboardSettings.lastKeyboardLaunch
    }

    // MARK: - Step scaffolding

    private func step<Illustration: View>(
        number: Int,
        title: String,
        detail: String,
        @ViewBuilder illustration: () -> Illustration
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("\(number)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(Color.accentColor, in: Circle())
                Text(title)
                    .font(.headline)
            }
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            illustration()
        }
    }

    private func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

// MARK: - Drawn mocks

/// A miniature Settings-style pane, used to show what each step looks like
/// without shipping screenshots.
private struct MockPhone<Content: View>: View {
    var title: String?
    var content: Content

    init(title: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(spacing: 0) {
            if let title {
                HStack {
                    Image(systemName: "chevron.left")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                    Spacer()
                    Text(title)
                        .font(.caption.weight(.semibold))
                    Spacer()
                    Image(systemName: "chevron.left").font(.caption2).opacity(0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                Divider()
            }
            VStack(spacing: 0) {
                content
            }
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5)
        )
    }
}

private struct MockSectionHeader: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.top, 10)
            .padding(.bottom, 4)
    }
}

private struct MockSettingsRow: View {
    let title: String
    var subtitle: String?
    var trailing: String?
    var showsChevron: Bool = false
    var isHighlighted: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(isHighlighted ? Color.white : Color.primary)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundStyle(isHighlighted ? Color.white.opacity(0.8) : Color.secondary)
                }
            }
            Spacer(minLength: 0)
            if let trailing {
                Text(trailing)
                    .font(.subheadline)
                    .foregroundStyle(isHighlighted ? Color.white.opacity(0.8) : Color.secondary)
            }
            if showsChevron {
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(isHighlighted ? Color.white.opacity(0.8) : Color.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(isHighlighted ? Color.accentColor : Color.clear)
    }
}

private struct MockToggleRow: View {
    let title: String
    let isOn: Bool

    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
            Spacer()
            Capsule()
                .fill(isOn ? Color.green : Color(uiColor: .systemGray4))
                .frame(width: 40, height: 24)
                .overlay(alignment: isOn ? .trailing : .leading) {
                    Circle()
                        .fill(.white)
                        .padding(2)
                        .shadow(radius: 1, y: 0.5)
                }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

private struct MockAlert: View {
    let title: String
    let message: String
    let confirmTitle: String

    var body: some View {
        VStack(spacing: 10) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .multilineTextAlignment(.center)
            Text(message)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Divider()
            HStack(spacing: 0) {
                Text("Don't Allow")
                    .font(.footnote)
                    .foregroundStyle(Color.accentColor)
                    .frame(maxWidth: .infinity)
                Divider().frame(height: 22)
                Text(confirmTitle)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Color.accentColor)
                    .frame(maxWidth: .infinity)
                    .background(Color.accentColor.opacity(0.12))
            }
        }
        .padding(14)
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 0.5)
        )
    }
}

#Preview {
    SetupStepsView()
}
