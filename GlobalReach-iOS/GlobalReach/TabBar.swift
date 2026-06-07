import SwiftUI

/// Custom native bottom tab bar. Built by hand (rather than `TabView`) so we
/// can guarantee brand colors (teal selection, never blue), fire haptics, and
/// drive a single shared web view via hash navigation.
struct TabBar: View {
    @Binding var selected: AppTab
    var onSelect: (AppTab) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                Button {
                    onSelect(tab)
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.systemImage)
                            .font(.system(size: 20, weight: .semibold))
                            .symbolRenderingMode(.hierarchical)
                        Text(tab.title)
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(selected == tab ? Brand.teal : Color.secondary)
                    .frame(maxWidth: .infinity)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 8)
        .background(
            ZStack(alignment: .top) {
                Color(.systemBackground)
                Rectangle()
                    .fill(Color(.separator).opacity(0.5))
                    .frame(height: 0.5)
            }
            .ignoresSafeArea(edges: .bottom)
        )
    }
}
