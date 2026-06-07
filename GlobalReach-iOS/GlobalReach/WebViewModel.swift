import SwiftUI
import WebKit

/// Owns the single shared `WKWebView` for the whole app and publishes its
/// loading / error / navigation state to SwiftUI.
///
/// We keep ONE web view alive for the entire session and switch tabs by
/// changing the SPA's hash route (`location.hash = "/leads"`) instead of
/// reloading. That avoids re-triggering the Render cold start every time the
/// user taps a tab and preserves in-app state.
@MainActor
final class WebViewModel: NSObject, ObservableObject {

    static let host = "globalreach-kph0.onrender.com"
    static let baseURL = URL(string: "https://\(host)/#/")!

    /// True until the very first page finishes loading (drives the splash screen).
    @Published var isFirstLoad = true
    /// True whenever a navigation is in flight (drives the loading spinner).
    @Published var isLoading = false
    /// Fractional load progress, 0...1.
    @Published var progress: Double = 0
    /// Set when a navigation fails (no connection, server unreachable).
    @Published var didFail = false
    /// The currently selected native tab, kept in sync with the web hash route.
    @Published var selectedTab: AppTab = .dashboard

    private var progressObservation: NSKeyValueObservation?
    private var suppressTabSync = false

    lazy var webView: WKWebView = {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true   // swipe-back
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.backgroundColor = .systemBackground
        webView.isOpaque = true
        if #available(iOS 16.4, *) { webView.isInspectable = true }

        // Pull to refresh.
        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(Brand.teal)   // never blue
        refresh.addTarget(self, action: #selector(handleRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
            Task { @MainActor in self?.progress = webView.estimatedProgress }
        }
        return webView
    }()

    func loadInitial() {
        guard webView.url == nil else { return }
        didFail = false
        isLoading = true
        webView.load(URLRequest(url: Self.baseURL))
    }

    func retry() {
        didFail = false
        isLoading = true
        if webView.url == nil {
            webView.load(URLRequest(url: Self.baseURL))
        } else {
            webView.reload()
        }
    }

    /// Switch the SPA route for a tab without reloading the page.
    func select(_ tab: AppTab) {
        selectedTab = tab
        let js = "window.location.hash = '#\(tab.hashPath)';"
        if webView.url == nil {
            // First navigation before the page exists: load full URL with hash.
            let url = URL(string: "https://\(Self.host)/#\(tab.hashPath)")!
            webView.load(URLRequest(url: url))
        } else {
            webView.evaluateJavaScript(js)
        }
    }

    @objc private func handleRefresh(_ sender: UIRefreshControl) {
        webView.reload()
    }

    /// Map the current URL hash back onto a tab so the bar stays in sync when
    /// the user navigates inside the web app.
    private func syncTabFromURL() {
        guard let fragment = webView.url?.fragment else { return }
        // fragment looks like "/leads" or "/leads/123"
        let path = fragment.hasPrefix("/") ? fragment : "/\(fragment)"
        if let tab = AppTab.allCases.first(where: { tab in
            tab.hashPath == "/" ? path == "/" : path == tab.hashPath || path.hasPrefix(tab.hashPath + "/")
        }), tab != selectedTab {
            suppressTabSync = true
            selectedTab = tab
            suppressTabSync = false
        }
    }
}

extension WebViewModel: WKNavigationDelegate {
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow); return
        }

        // Native handling for tap-to-call / tap-to-text / email links.
        let scheme = (url.scheme ?? "").lowercased()
        if ["tel", "sms", "facetime", "facetime-audio", "mailto"].contains(scheme) {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        // Open links to other hosts (and target=_blank) in the system browser
        // so users aren't trapped on an external site without navigation chrome.
        if scheme == "http" || scheme == "https" {
            let isExternalHost = url.host != nil && url.host != Self.host
            let opensNewWindow = navigationAction.targetFrame == nil
            if isExternalHost || opensNewWindow {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
        }

        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true
        didFail = false
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
        isFirstLoad = false
        didFail = false
        webView.scrollView.refreshControl?.endRefreshing()
        syncTabFromURL()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handleFailure(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handleFailure(error)
    }

    private func handleFailure(_ error: Error) {
        isLoading = false
        webView.scrollView.refreshControl?.endRefreshing()
        // Code -999 (NSURLErrorCancelled) just means a navigation was superseded.
        if (error as NSError).code == NSURLErrorCancelled { return }
        didFail = true
    }
}

extension WebViewModel: WKUIDelegate {
    /// Handle JS `window.open` / target=_blank by loading in the same web view.
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if url.host == Self.host {
                webView.load(navigationAction.request)
            } else {
                UIApplication.shared.open(url)
            }
        }
        return nil
    }
}
