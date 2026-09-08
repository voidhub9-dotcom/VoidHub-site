import SwiftUI

struct AppearanceSettingsView: View {
    @Binding var settings: AppSettings

    var body: some View {
        Form {
            Section("Theme") {
                Picker("Appearance", selection: $settings.theme) {
                    ForEach(AppTheme.allCases) { theme in
                        Text(theme.label).tag(theme)
                    }
                }
                .pickerStyle(.segmented)
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: settings.theme)

            Section {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 54), spacing: 14)], spacing: 14) {
                    ForEach(AccentPalette.allCases) { palette in
                        Button {
                            Haptics.selection()
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                                settings.accent = palette
                            }
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(palette.color)
                                    .frame(width: 40, height: 40)
                                    .shadow(color: palette.color.opacity(0.45), radius: 6, y: 2)
                                if settings.accent == palette {
                                    Circle()
                                        .strokeBorder(Color.primary.opacity(0.85), lineWidth: 2.5)
                                        .frame(width: 50, height: 50)
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundStyle(.white)
                                }
                            }
                            .frame(height: 54)
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(palette.label)
                    }
                }
                .padding(.vertical, 4)
            } header: {
                Text("Accent")
            } footer: {
                Text("Colours the app and the light behind it.")
            }

            Section {
                Picker("Message bubbles", selection: $settings.bubbleStyle) {
                    ForEach(BubbleStyle.allCases) { style in
                        Text(style.label).tag(style)
                    }
                }

                Picker("Text size", selection: $settings.fontScale) {
                    ForEach(FontScale.allCases) { scale in
                        Text(scale.label).tag(scale)
                    }
                }
            } footer: {
                Text("Standard text size follows whatever you set in iOS Settings.")
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: settings.bubbleStyle)

            Section {
                Toggle("Glass surfaces", isOn: $settings.glassEffects.animation(.spring(response: 0.32, dampingFraction: 0.78)))
                Toggle("Animated background", isOn: $settings.animatedBackground.animation(.spring(response: 0.32, dampingFraction: 0.78)))
                    .disabled(!settings.glassEffects)
            } header: {
                Text("Effects")
            } footer: {
                Text("Turning glass off replaces every translucent surface with a solid one. Both stop automatically when Reduce Motion is on.")
            }

            Section {
                previewCard
            } header: {
                Text("Preview")
            }
            .animation(.easeInOut(duration: 0.25), value: settings.glassEffects)
            .animation(.easeInOut(duration: 0.25), value: settings.animatedBackground)
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var previewCard: some View {
        ZStack {
            AuroraBackground(
                palette: settings.accent,
                enabled: settings.glassEffects && settings.animatedBackground
            )
            .frame(height: 190)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Spacer(minLength: 40)
                    Text("How does this look?")
                        .padding(.horizontal, 13)
                        .padding(.vertical, 9)
                        .foregroundStyle(.white)
                        .background(
                            LinearGradient(
                                colors: [settings.accent.color, settings.accent.color.opacity(0.82)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                        )
                }

                HStack {
                    Group {
                        switch settings.bubbleStyle {
                        case .glass:
                            Text("Like this.")
                                .padding(.horizontal, 13)
                                .padding(.vertical, 9)
                                .glassSurface(cornerRadius: 16, enabled: settings.glassEffects)
                        case .solid:
                            Text("Like this.")
                                .padding(.horizontal, 13)
                                .padding(.vertical, 9)
                                .background(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .fill(Color(uiColor: .secondarySystemBackground))
                                )
                        case .minimal:
                            Text("Like this.")
                        }
                    }
                    Spacer(minLength: 40)
                }
            }
            .font(.subheadline)
            .padding(14)
        }
        .frame(height: 190)
        .listRowInsets(EdgeInsets())
    }
}
