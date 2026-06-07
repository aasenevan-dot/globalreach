import SwiftUI
import UserNotifications
import UIKit

@main
struct GlobalReachApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        // Force teal accent on any system controls; no blue anywhere.
        UIView.appearance().tintColor = UIColor(Brand.teal)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .tint(Brand.teal)
                .preferredColorScheme(nil) // respect system light/dark
        }
    }
}

/// Handles push-notification registration. This is a placeholder: there is no
/// push server yet, so we register for remote notifications and log the token.
/// Wire `didRegisterForRemoteNotificationsWithDeviceToken` up to a backend when
/// one exists.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        requestPushAuthorization()
        return true
    }

    /// Ask the user for notification permission, then register with APNs.
    private func requestPushAuthorization() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error {
                print("[Push] Authorization error: \(error.localizedDescription)")
            }
            print("[Push] Permission granted: \(granted)")
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        // TODO: POST this token to the GlobalReach backend once push is implemented.
        print("[Push] APNs device token: \(token)")
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Push] Failed to register: \(error.localizedDescription)")
    }

    // Show notifications while the app is in the foreground.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }
}
