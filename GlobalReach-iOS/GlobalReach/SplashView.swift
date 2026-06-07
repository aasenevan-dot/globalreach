import SwiftUI

/// Full-screen branded splash shown over the web view until the first page
/// finishes loading. Render's free tier can cold-start for ~30s, so after a
/// few seconds we surface a friendly "waking up the server" message.
struct SplashView: View {
    @State private var animate = false
    @State private var elapsed = 0

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Brand.gradient
                .ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                Text("GlobalReach")
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.18), radius: 8, y: 2)
                    .scaleEffect(animate ? 1.0 : 0.92)
                    .opacity(animate ? 1 : 0.6)
                    .animation(.spring(response: 0.7, dampingFraction: 0.6), value: animate)

                Spacer()

                VStack(spacing: 12) {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                        .scaleEffect(1.2)

                    Text(message)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white.opacity(0.9))
                        .multilineTextAlignment(.center)
                        .transition(.opacity)
                        .id(message)
                        .animation(.easeInOut, value: message)
                }
                .padding(.bottom, 64)
            }
            .padding(.horizontal, 32)
        }
        .onAppear { animate = true }
        .onReceive(timer) { _ in elapsed += 1 }
    }

    private var message: String {
        switch elapsed {
        case 0..<5:   return "Loading…"
        case 5..<12:  return "Waking up the server…\nThis can take up to 30 seconds."
        default:      return "Almost there — thanks for your patience."
        }
    }
}

#Preview {
    SplashView()
}
