import PhotosUI
import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct ComposerView: View {
    @Bindable var viewModel: ChatViewModel
    var glass: Bool = true

    @State private var photoItems: [PhotosPickerItem] = []
    @State private var showFileImporter = false
    @State private var isLoadingAttachment = false
    @State private var sendPulse = false
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            if !viewModel.pendingAttachments.isEmpty || isLoadingAttachment {
                pendingStrip
            }

            HStack(alignment: .bottom, spacing: 8) {
                Button {
                    Haptics.tap()
                    showFileImporter = true
                } label: {
                    Image(systemName: "paperclip")
                        .font(.system(size: 18, weight: .medium))
                        .frame(width: 34, height: 34)
                        .foregroundStyle(.secondary)
                }

                PhotosPicker(selection: $photoItems, maxSelectionCount: 4, matching: .images) {
                    Image(systemName: "photo")
                        .font(.system(size: 18, weight: .medium))
                        .frame(width: 34, height: 34)
                        .foregroundStyle(.secondary)
                }

                TextField("Message", text: $viewModel.draft, axis: .vertical)
                    .lineLimit(1...6)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .glassSurface(cornerRadius: 20, enabled: glass)
                    .focused($isFocused)

                sendButton
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .background(alignment: .top) {
            if glass {
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .ignoresSafeArea(edges: .bottom)
                    .overlay(alignment: .top) {
                        Divider().opacity(0.5)
                    }
            } else {
                Rectangle()
                    .fill(Color(uiColor: .systemBackground))
                    .ignoresSafeArea(edges: .bottom)
                    .overlay(alignment: .top) { Divider() }
            }
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.75), value: viewModel.isStreaming)
        .animation(.spring(response: 0.34, dampingFraction: 0.8), value: viewModel.pendingAttachments.count)
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

    @ViewBuilder
    private var sendButton: some View {
        if viewModel.isStreaming {
            Button {
                Haptics.warning()
                viewModel.stop()
            } label: {
                Image(systemName: "stop.circle.fill")
                    .font(.system(size: 31))
                    .foregroundStyle(.red)
                    .symbolEffect(.pulse, options: .repeating)
            }
            .transition(.scale.combined(with: .opacity))
        } else {
            Button {
                isFocused = false
                sendPulse = true
                viewModel.send()
                Task {
                    try? await Task.sleep(nanoseconds: 180_000_000)
                    sendPulse = false
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 31))
                    .foregroundStyle(viewModel.canSend ? Color.accentColor : Color.secondary.opacity(0.4))
                    .scaleEffect(sendPulse ? 0.82 : 1)
                    .animation(.spring(response: 0.25, dampingFraction: 0.5), value: sendPulse)
            }
            .disabled(!viewModel.canSend)
            .transition(.scale.combined(with: .opacity))
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
                            Haptics.tap()
                            viewModel.removeAttachment(id: attachment.id)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .glassSurface(cornerRadius: 10, enabled: glass)
                    .springEntrance()
                }

                if isLoadingAttachment {
                    ProgressView().padding(.horizontal, 12)
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
            Haptics.tap()
        }
    }

    private func handleFileImport(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result else { return }
        isLoadingAttachment = true
        Task {
            for url in urls {
                // Files from the document picker live outside the sandbox until the
                // security scope is opened.
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }

                guard let data = try? Data(contentsOf: url) else { continue }
                let type = UTType(filenameExtension: url.pathExtension)
                if let attachment = AttachmentBuilder.make(from: data, name: url.lastPathComponent, type: type) {
                    viewModel.addAttachment(attachment)
                }
            }
            isLoadingAttachment = false
            Haptics.tap()
        }
    }
}
