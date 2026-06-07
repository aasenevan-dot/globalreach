import SwiftUI

struct ContentView: View {
    @StateObject private var model = WebViewModel()

    var body: some View {
        ZStack {
            // Content area: web view + thin loading bar, then the native tab bar.
            VStack(spacing: 0) {
                ZStack(alignment: .top) {
                    WebView(model: model)
                        .ignoresSafeArea(edges: .top)

                    if model.isLoading && !model.isFirstLoad {
                        LoadingBar(progress: model.progress)
                    }
                }

                TabBar(selected: $model.selectedTab) { tab in
                    guard tab != model.selectedTab || model.didFail else {
                        // Re-tapping the active tab scrolls/refreshes the route.
                        Haptics.tabSelection()
                        model.select(tab)
                        return
                    }
                    Haptics.tabSelection()
                    model.select(tab)
                }
            }

            // Offline state takes over the whole screen.
            if model.didFail {
                OfflineView {
                    model.retry()
                }
                .transition(.opacity)
            }

            // Branded splash over everything until first load completes.
            if model.isFirstLoad && !model.didFail {
                SplashView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: model.isFirstLoad)
        .animation(.easeInOut(duration: 0.35), value: model.didFail)
        .onAppear { model.loadInitial() }
    }
}

#Preview {
    ContentView()
}
