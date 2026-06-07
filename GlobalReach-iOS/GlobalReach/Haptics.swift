import UIKit

/// Lightweight wrapper around UIKit haptic generators.
enum Haptics {
    /// Fired when the user switches tabs.
    static func tabSelection() {
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }

    /// Fired on a successful (re)load, e.g. after a retry from the offline screen.
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
    }

    /// Light tap for general affordances.
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.prepare()
        generator.impactOccurred()
    }
}
