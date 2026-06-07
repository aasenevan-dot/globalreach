import SwiftUI

/// Shown when a navigation fails (no connection / server unreachable).
struct OfflineView: View {
    var onRetry: () -> Void
    @State private var isRetrying = false

    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()

            VStack(spacing: 24) {
                ZStack {
                    Circle()
                        .fill(Brand.gradient)
                        .frame(width: 96, height: 96)
                        .opacity(0.15)
                    Image(systemName: "wifi.slash")
                        .font(.system(size: 40, weight: .semibold))
                        .foregroundStyle(Brand.red)
                }

                VStack(spacing: 8) {
                    Text("No connection")
                        .font(.title2.weight(.bold))
                    Text("We couldn't reach GlobalReach. Check your internet connection and try again.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                Button {
                    isRetrying = true
                    Haptics.impact(.medium)
                    onRetry()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { isRetrying = false }
                } label: {
                    HStack(spacing: 8) {
                        if isRetrying {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                        Text(isRetrying ? "Retrying…" : "Retry")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: 220)
                    .padding(.vertical, 14)
                    .background(Brand.gradient)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .disabled(isRetrying)
            }
        }
    }
}

#Preview {
    OfflineView(onRetry: {})
}
