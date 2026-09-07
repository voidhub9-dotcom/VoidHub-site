import SwiftUI

struct SignInView: View {
    @Environment(AuthController.self) private var auth

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.10, green: 0.08, blue: 0.20),
                    Color(red: 0.34, green: 0.17, blue: 0.59),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 26, style: .continuous)
                            .fill(.white.opacity(0.12))
                            .frame(width: 96, height: 96)
                        Image(systemName: "bolt.horizontal.fill")
                            .font(.system(size: 44, weight: .semibold))
                            .foregroundStyle(.white)
                    }

                    Text("Chat On Steroids")
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)

                    Text("A fast chat client with projects, streaming answers and local history that stays on your phone.")
                        .font(.callout)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white.opacity(0.75))
                        .padding(.horizontal, 32)
                }

                Spacer()

                VStack(spacing: 12) {
                    if auth.isGoogleAvailable {
                        Button {
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
                            .background(.white)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .disabled(auth.isWorking)
                    } else {
                        VStack(spacing: 6) {
                            Label("Google sign-in is not configured", systemImage: "info.circle")
                                .font(.footnote.weight(.medium))
                                .foregroundStyle(.white.opacity(0.9))
                            Text("Add GOOGLE_CLIENT_ID and GOOGLE_REVERSED_CLIENT_ID in project.yml and rebuild to switch it on.")
                                .font(.caption)
                                .multilineTextAlignment(.center)
                                .foregroundStyle(.white.opacity(0.6))
                        }
                        .padding(.vertical, 8)
                    }

                    Button {
                        auth.continueLocally()
                    } label: {
                        Text("Continue without an account")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .background(.white.opacity(0.14))
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .disabled(auth.isWorking)

                    if auth.isWorking {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, 4)
                    }

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.white)
                            .padding(12)
                            .frame(maxWidth: .infinity)
                            .background(.red.opacity(0.35))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    Text("Your chats and API key never leave this device.")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.55))
                        .padding(.top, 6)
                }
                .padding(.horizontal, 28)
                .padding(.bottom, 40)
            }
        }
    }
}
