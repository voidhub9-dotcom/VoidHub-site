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
        }
        .onChange(of: scenePhase) { _, phase in
            // The debounced save would otherwise be cut short by suspension.
            if phase != .active {
                store.flush()
            }
        }
    }
}
