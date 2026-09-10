import SwiftUI

/// A list of editable name/value rows with add and swipe-to-delete — shared by the
/// extra-headers and extra-query-parameters editors.
struct KeyValueListEditor: View {
    @Binding var items: [CustomHeader]
    var namePlaceholder: String = "Name"
    var valuePlaceholder: String = "Value"
    var addLabel: String

    var body: some View {
        ForEach($items) { $item in
            HStack(spacing: 10) {
                TextField(namePlaceholder, text: $item.name)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.system(.body, design: .monospaced))
                Divider()
                TextField(valuePlaceholder, text: $item.value)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.system(.body, design: .monospaced))
            }
        }
        .onDelete { offsets in
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                items.remove(atOffsets: offsets)
            }
        }

        Button {
            Haptics.tap()
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                items.append(CustomHeader())
            }
        } label: {
            Label(addLabel, systemImage: "plus.circle.fill")
        }
    }
}
