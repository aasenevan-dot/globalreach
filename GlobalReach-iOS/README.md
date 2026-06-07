# GlobalReach for iOS

A native iPhone app that wraps the live [GlobalReach CRM](https://globalreach-kph0.onrender.com)
in a polished native shell — SwiftUI tab bar, branded launch screen, offline
handling, tap-to-call, pull-to-refresh, and haptics.

The web app itself runs unchanged inside a `WKWebView`; this project adds the
native chrome around it.

---

## Requirements

- **Xcode 15 or newer** (Xcode 16 recommended)
- **iOS 16.0+** target device or simulator
- An **Apple ID** (free) for signing — required to run on a physical iPhone
- No package managers. Pure Swift / SwiftUI, no SPM, CocoaPods, or Carthage.

---

## Open & run

1. **Open the project**
   ```
   open GlobalReach-iOS/GlobalReach.xcodeproj
   ```
   (or `File ▸ Open…` in Xcode and select `GlobalReach.xcodeproj`)

2. **Set your signing team**
   - Select the **GlobalReach** target ▸ **Signing & Capabilities** tab.
   - Under **Team**, choose your Apple ID / team.
   - Xcode will auto-manage the provisioning profile for bundle id
     `com.globalreach.crm`. If that id is taken, change it to something unique
     like `com.yourname.globalreach` (both here and it will update everywhere).

3. **Pick a destination**
   - **Simulator:** choose any iPhone simulator and press **▶︎ Run** (`⌘R`).
   - **Your iPhone:** plug it in (or use wireless debugging), select it from the
     device menu, then **Run**. The first run will ask you to trust the
     developer certificate on the device:
     **Settings ▸ General ▸ VPN & Device Management ▸ (your Apple ID) ▸ Trust**.

4. The app launches to the **red → teal gradient splash**, waits for the Render
   server (free tier can cold-start for up to ~30s on first load), then drops
   you into the CRM with the native tab bar at the bottom.

---

## What's included

| Feature | Where |
|---|---|
| `WKWebView` loading the live CRM | `WebViewModel.swift`, `WebView.swift` |
| Native tab bar → hash routes (`/#/`, `/#/leads`, `/#/pipeline`, `/#/inbox`, `/#/settings`) | `TabBar.swift`, `AppTab.swift` |
| Branded launch screen (gradient + "GlobalReach") | `LaunchScreen.storyboard`, `Assets.xcassets/LaunchBackground` |
| Animated splash / loading state for cold starts | `SplashView.swift` |
| Thin top progress bar on navigations | `LoadingBar.swift` |
| Offline "No connection" screen + Retry | `OfflineView.swift` |
| `tel:` / `sms:` / `mailto:` open natively | `WebViewModel.swift` (`decidePolicyFor`) |
| Pull-to-refresh & swipe-back gesture | `WebViewModel.swift` |
| Haptic feedback on tab switches | `Haptics.swift` |
| Push notification entitlement + permission prompt (placeholder) | `GlobalReachApp.swift`, `GlobalReach.entitlements` |
| App icon ("GR" on red→teal) at all required sizes | `Assets.xcassets/AppIcon.appiconset` |

**Brand:** the app is red (`#ef4444`) → teal (`#14b8a6`). There is intentionally
**no blue anywhere** — the accent color, tab selection, spinners, and refresh
control are all teal.

---

## How the tabs work

The web app is a single-page app using hash routing (`wouter` /
`useHashLocation`). Rather than reload the page on every tab tap (which would
re-trigger the cold start), the app keeps **one** web view alive and switches
routes by setting `window.location.hash`. Tab state stays in sync when you
navigate inside the web app, too.

| Tab | Route |
|---|---|
| Dashboard | `/#/` |
| Leads | `/#/leads` |
| Pipeline | `/#/pipeline` |
| Inbox | `/#/inbox` |
| More | `/#/settings` |

---

## Push notifications

The app requests notification permission on first launch and registers with
APNs. There is **no push server yet**, so the device token is just logged to the
Xcode console (see `AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken`
in `GlobalReachApp.swift`). When a backend exists, POST that token to it.

The entitlement (`aps-environment`) is set to `development`. For TestFlight /
App Store builds, Xcode will switch this to `production` automatically when you
archive with a distribution profile, provided the **Push Notifications**
capability is enabled for your App ID in the Apple Developer portal.

---

## Notes & customization

- **Change the URL:** edit `WebViewModel.host` / `baseURL` in `WebViewModel.swift`.
- **Change tabs or routes:** edit `AppTab.swift`.
- **Regenerate the icon:** the icon and launch gradient were generated from
  `scripts/gen_assets.swift` (run with `swift gen_assets.swift <iconDir> <launchDir>`).
- **App Store icon alpha:** the bundled `icon-1024.png` is fully opaque. If App
  Store validation flags an alpha channel, flatten it (e.g. in Preview:
  *Export* without alpha) before submitting.
