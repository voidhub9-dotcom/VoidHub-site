import PhotosUI
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct ComposerView: View {
    @Bindable var viewModel: ChatViewModel

    @State private var photoItems: [PhotosPickerItem] = []
    @State private var showFileImporter = false
    @State private var isLoadingAttachment = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            Divider()

            if !viewModel.pendingAttachments.isEmpty || isLoadingAttachment {
                pendingStrip
            }

            HStack(alignment: .bottom, spacing: 10) {
                Button {
                    showFileImporter = true
                } label: {
                    Image(systemName: "paperclip")
                        .font(.system(size: 19, weight: .medium))
                        .frame(width: 34, height: 34)
                        .foregroundStyle(.secondary)
                }

                PhotosPicker(selection: $photoItems, maxSelectionCount: 4, matching: .images) {
                    Image(systemName: "photo")
                        .font(.system(size: 19, weight: .medium))
                        .frame(width: 34, height: 34)
                        .foregroundStyle(.secondary)
                }

                TextField("Message", text: $viewModel.draft, axis: .vertical)
                    .lineLimit(1...6)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .focused($isFocused)
                    .submitLabel(.send)

                if viewModel.isStreaming {
                    Button {
                        viewModel.stop()
                    } label: {
                        Image(systemName: "stop.circle.fill")
                            .font(.system(size: 30))
                            .foregroundStyle(.red)
                    }
                    .transition(.scale.combined(with: .opacity))
                } else {
                    Button {
                        isFocused = false
                        viewModel.send()
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 30))
                            .foregroundStyle(viewModel.canSend ? Color.accentColor : Color.secondary.opacity(0.45))
                    }
                    .disabled(!viewModel.canSend)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .background(.bar)
        .animation(.easeInOut(duration: 0.15), value: viewModel.isStreaming)
        .onChange(of: photoItems) { _, newItems in
            guard !newItems.isEmpty else { return }
            loadPhotos(newItems)
        }
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [.image, .plainText, .sourceCode, .json, .commaSeparatedText, .xml],
            allowsMultipleSelection: true
        ) { result in
            handleFileImport(result)
        }
    }

    private var pendingStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(viewModel.pendingAttachments) { attachment in
                    HStack(spacing: 6) {
                        if attachment.kind == .image, let image = decoded(attachment) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 30, height: 30)
                                .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                        } else {
                            Image(systemName: "doc.text.fill")
                                .foregroundStyle(.secondary)
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            Text(attachment.name)
                                .font(.caption.weight(.medium))
                                .lineLimit(1)
                            Text(attachment.displaySize)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Button {
                            viewModel.removeAttachment(id: attachment.id)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color(uiColor: .secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

                if isLoadingAttachment {
                    ProgressView()
                        .padding(.horizontal, 12)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)
        }
    }

    private func decoded(_ attachment: Attachment) -> UIImage? {
        guard let data = Data(base64Encoded: attachment.payload) else { return nil }
        return UIImage(data: data)
    }

    private func loadPhotos(_ items: [PhotosPickerItem]) {
        isLoadingAttachment = true
        Task {
            var index = 1
            for item in items {
                guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
                let name = items.count > 1 ? "photo-\(index).jpg" : "photo.jpg"
                index += 1
                if let attachment = AttachmentBuilder.image(from: data, name: name) {
                    viewModel.addAttachment(attachment)
                }
            }
            photoItems = []
            isLoadingAttachment = false
        }
    }

    private func handleFileImport(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result else { return }
        isLoadingAttachment = true
        Task {
            for url in urls {
                // Files handed over by the document picker live outside the sandbox
                // until the scope is opened.
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }

                guard let data = try? Data(contentsOf: url) else { continue }
                let type = UTType(filenameExtension: url.pathExtension)
                if let attachment = AttachmentBuilder.make(from: data, name: url.lastPathComponent, type: type) {
                    viewModel.addAttachment(attachment)
                }
            }
            isLoadingAttachment = false
        }
    }
}
