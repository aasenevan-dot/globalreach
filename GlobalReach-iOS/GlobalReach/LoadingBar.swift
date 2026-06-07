import SwiftUI

/// Thin determinate progress bar shown at the top of the content area during
/// subsequent navigations (after the initial splash). Tinted in brand teal.
struct LoadingBar: View {
    var progress: Double

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Color.clear
                Rectangle()
                    .fill(Brand.gradient)
                    .frame(width: max(0, min(1, progress)) * geo.size.width)
                    .animation(.easeOut(duration: 0.25), value: progress)
            }
        }
        .frame(height: 2.5)
    }
}
