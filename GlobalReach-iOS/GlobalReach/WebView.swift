import SwiftUI
import WebKit

/// Thin SwiftUI wrapper that hosts the model's shared `WKWebView`.
struct WebView: UIViewRepresentable {
    let model: WebViewModel

    func makeUIView(context: Context) -> WKWebView {
        model.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // State is driven imperatively through the model; nothing to push here.
    }
}
