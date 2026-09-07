import SwiftUI

@main
struct ChatOnSteroidsApp: App {
    @State private var store = ChatStore()
    @State private var auth = AuthController()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(auth)
                .tint(store.settings.accent.color)
                .preferredColorScheme(store.settings.theme.colorScheme)
                .modifier(FontScaleModifier(scale: store.settings.fontScale))
                .onAppear { Haptics.enabled = store.settings.hapticsEnabled }
                .onChange(of: store.settings.hapticsEnabled) { _, enabled in
                    Haptics.enabled = enabled
                }
        }
        .onChange(of: scenePhase) { _, phase in
            // The debounced save would otherwise be cut short by suspension.
            if phase != .active {
                store.flush()
            }
        }
    }
}

/// Applies a text-size override only when the user actually picked one — the
/// standard setting must leave the system's own Dynamic Type choice alone.
private struct FontScaleModifier: ViewModifier {
    let scale: FontScale

    func body(content: Content) -> some View {
        if scale == .standard {
            content
        } else {
            content.dynamicTypeSize(scale.dynamicTypeSize)
        }
    }
}
