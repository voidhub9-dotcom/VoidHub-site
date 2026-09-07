import SwiftUI

struct RootView: View {
    @Environment(AuthController.self) private var auth

    var body: some View {
        Group {
            if auth.isAuthenticated {
                ConversationListView()
            } else {
                SignInView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: auth.isAuthenticated)
    }
}
