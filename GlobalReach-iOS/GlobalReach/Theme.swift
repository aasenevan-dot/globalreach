import SwiftUI

/// Central brand palette. GlobalReach brand is a red → teal gradient.
/// There is intentionally NO blue anywhere in this app.
enum Brand {
    /// #ef4444
    static let red = Color(red: 0xef / 255, green: 0x44 / 255, blue: 0x44 / 255)
    /// #14b8a6
    static let teal = Color(red: 0x14 / 255, green: 0xb8 / 255, blue: 0xa6 / 255)

    /// Diagonal brand gradient used by the launch / loading screens and the icon.
    static let gradient = LinearGradient(
        colors: [red, teal],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Vertical brand gradient (matches the native launch background image).
    static let verticalGradient = LinearGradient(
        colors: [red, teal],
        startPoint: .top,
        endPoint: .bottom
    )

    /// Accent used for interactive native chrome (tab selection, spinners).
    /// Teal — never blue.
    static let accent = teal
}
