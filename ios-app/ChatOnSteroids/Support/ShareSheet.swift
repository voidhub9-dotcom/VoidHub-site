import SwiftUI
import UIKit

/// UIActivityViewController for SwiftUI. Used for exporting a conversation or a
/// full backup — the system sheet is the only route that reaches Files, Mail and
/// every other destination without the app implementing each one.
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

/// A file the share sheet is currently presenting. Identifiable so it can drive
/// `.sheet(item:)` directly.
struct SharePayload: Identifiable {
    let id = UUID()
    let url: URL
}
