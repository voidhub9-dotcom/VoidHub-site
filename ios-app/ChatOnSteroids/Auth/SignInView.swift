import SwiftUI

struct SignInView: View {
    @Environment(AuthController.self) private var auth
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var glow = false

    var body: some View {
        ZStack {
            AuroraBackground(palette: .violet, enabled: true)

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.28))
                            .frame(width: 132, height: 132)
                            .blur(radius: 26)
                            .scaleEffect(glow ? 1.12 : 0.92)
                            .animation(
                                reduceMotion ? nil : .easeInOut(duration: 3.2).repeatForever(autoreverses: true),
                                value: glow
                            )

                        Image(systemName: "bolt.horizontal.fill")
                            .font(.system(size: 42, weight: .semibold))
                            .foregroundStyle(Color.accentColor)
                            .frame(width: 96, height: 96)
                            .glassSurface(cornerRadius: 26, strokeOpacity: 0.3)
                    }
                    .springEntrance()

                    Text("Chat On Steroids")
                        .font(.largeTitle.bold())
                        .springEntrance(delay: 0.06)

                    Text("A fast chat client with projects, streaming answers and local history that stays on your phone.")
                        .font(.callout)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 32)
                        .springEntrance(delay: 0.12)
                }

                Spacer()

                VStack(spacing: 12) {
                    if auth.isGoogleAvailable {
                        Button {
                            Haptics.tap()
                            Task { await auth.signInWithGoogle() }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "g.circle.fill")
                                    .font(.title3)
                                Text("Continue with Google")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(.white, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                            .foregroundStyle(.black)
                        }
                        .disabled(auth.isWorking)
                    } else {
                        VStack(spacing: 6) {
                            Label("Google sign-in is not configured", systemImage: "info.circle")
                                .font(.footnote.weight(.medium))
                            Text("Add GOOGLE_CLIENT_ID and GOOGLE_REVERSED_CLIENT_ID in project.yml and rebuild to switch it on.")
                                .font(.caption)
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.secondary)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity)
                        .glassSurface(cornerRadius: 14)
                    }

                    Button {
                        Haptics.success()
                        auth.continueLocally()
                    } label: {
                        Text("Continue without an account")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .glassSurface(cornerRadius: 15, strokeOpacity: 0.26)
                    }
                    .disabled(auth.isWorking)

                    if auth.isWorking {
                        ProgressView().padding(.top, 4)
                    }

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .multilineTextAlignment(.center)
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(.red.opacity(0.22), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .springEntrance()
                    }

                    Text("Your chats and API key never leave this device.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 6)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 40)
                .springEntrance(delay: 0.18)
            }
        }
        .onAppear { glow = true }
    }
}
