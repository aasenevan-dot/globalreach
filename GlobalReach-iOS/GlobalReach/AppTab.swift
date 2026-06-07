import Foundation

/// The five native tabs and the SPA hash route each one maps to.
enum AppTab: String, CaseIterable, Identifiable {
    case dashboard
    case leads
    case pipeline
    case inbox
    case more

    var id: String { rawValue }

    /// Hash route within the GlobalReach web app (used after the `#`).
    var hashPath: String {
        switch self {
        case .dashboard: return "/"
        case .leads:     return "/leads"
        case .pipeline:  return "/pipeline"
        case .inbox:     return "/inbox"
        case .more:      return "/settings"
        }
    }

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .leads:     return "Leads"
        case .pipeline:  return "Pipeline"
        case .inbox:     return "Inbox"
        case .more:      return "More"
        }
    }

    /// SF Symbol for the tab.
    var systemImage: String {
        switch self {
        case .dashboard: return "square.grid.2x2.fill"
        case .leads:     return "person.2.fill"
        case .pipeline:  return "chart.bar.fill"
        case .inbox:     return "tray.fill"
        case .more:      return "ellipsis.circle.fill"
        }
    }
}
