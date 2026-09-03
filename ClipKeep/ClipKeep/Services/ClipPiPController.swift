//
//  ClipPiPController.swift
//  ClipKeep
//
//  A floating, always-on-top window showing your most recent clips, using
//  Picture in Picture.
//
//  HOW THIS WORKS, AND WHAT IT COSTS
//
//  iOS has no "floating widget" API for third-party apps. The only way to
//  keep any of your own content on screen above other apps is Picture in
//  Picture, and PiP is a *video* feature: the system shows the contents of an
//  AVSampleBufferDisplayLayer. So this renders the clip list to images on a
//  timer, wraps each frame in a CMSampleBuffer, and feeds it to that layer.
//  The window is genuinely live, and genuinely a video, which means:
//
//   * It is not interactive. Taps inside a PiP window go to the system's own
//     controls, never to app content. You can read your clips from it and tap
//     the restore button to come back to ClipKeep; you cannot tap a clip in
//     the floating window itself. That is the platform's design, not a
//     shortcut taken here.
//
//   * It needs an active audio session and the `audio` background mode, or
//     iOS stops the PiP window the moment the app is backgrounded -- which is
//     the only moment it is useful. The session is configured with
//     `.mixWithOthers` specifically so starting it does not pause music or a
//     podcast you already have playing.
//
//   * It is started deliberately, never automatically, because of the two
//     points above.
//
//  Frames are rendered at 2 fps. Nothing in a clipboard list moves, so a
//  video frame rate would burn battery to display an identical picture.
//

import AVFoundation
import AVKit
import UIKit
import SwiftUI
import os

@MainActor
final class ClipPiPController: NSObject, ObservableObject {

    enum Status: Equatable {
        case idle
        case unsupported
        case starting
        case running
        case failed(String)
    }

    @Published private(set) var status: Status = .idle

    /// Pixel size of each rendered frame. Portrait, and small: PiP scales the
    /// window down anyway, and every extra pixel is work done twice a second.
    private static let renderSize = CGSize(width: 360, height: 480)
    private static let frameInterval: TimeInterval = 0.5
    /// More than this and the text is unreadable at PiP's window size.
    private static let maxVisibleClips = 7

    private let displayLayer = AVSampleBufferDisplayLayer()
    private let playbackDelegate = PiPPlaybackDelegate()
    private var pipController: AVPictureInPictureController?
    private var renderTimer: Timer?
    private var frameCount: Int64 = 0
    private var items: [ClipMetadata] = []

    private let logger = Logger(subsystem: "com.clipkeep.app", category: "PiP")

    var isSupported: Bool { AVPictureInPictureController.isPictureInPictureSupported() }

    /// The layer must be in the view hierarchy for PiP to accept it, even
    /// though the on-screen copy is incidental -- the app shows its own
    /// SwiftUI list instead. PiPHostView parents it offscreen-sized.
    var hostedLayer: AVSampleBufferDisplayLayer { displayLayer }

    override init() {
        super.init()
        displayLayer.videoGravity = .resizeAspect
        if !isSupported {
            status = .unsupported
        }
    }

    // MARK: - Control

    func start(with clips: [ClipMetadata]) {
        guard isSupported else {
            status = .unsupported
            return
        }
        guard status != .running, status != .starting else { return }

        status = .starting
        items = Array(clips.prefix(Self.maxVisibleClips))

        do {
            // .mixWithOthers keeps whatever the user is already listening to
            // playing. Without it, activating a .playback session stops their
            // music -- a rude thing for a clipboard app to do.
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .moviePlayback, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            logger.error("Audio session setup failed: \(error.localizedDescription, privacy: .public)")
            status = .failed("Couldn't start the audio session Picture in Picture requires: \(error.localizedDescription)")
            return
        }

        // A frame has to be in the layer before PiP will agree to start.
        renderFrame()

        let source = AVPictureInPictureController.ContentSource(
            sampleBufferDisplayLayer: displayLayer,
            playbackDelegate: playbackDelegate
        )
        let controller = AVPictureInPictureController(contentSource: source)
        controller.delegate = self
        // The system's play/pause and skip controls do nothing for a live
        // list; hiding them avoids offering buttons that no-op.
        controller.requiresLinearPlayback = true
        pipController = controller

        startRendering()
        controller.startPictureInPicture()
    }

    func stop() {
        pipController?.stopPictureInPicture()
        teardown()
    }

    /// Feeds new clips to an already-running window.
    func update(with clips: [ClipMetadata]) {
        items = Array(clips.prefix(Self.maxVisibleClips))
    }

    private func teardown() {
        renderTimer?.invalidate()
        renderTimer = nil
        pipController = nil
        // Deactivating lets other apps resume full control of audio routing.
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
        if status != .unsupported {
            status = .idle
        }
    }

    // MARK: - Rendering

    private func startRendering() {
        renderTimer?.invalidate()
        let timer = Timer.scheduledTimer(withTimeInterval: Self.frameInterval, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.renderFrame()
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        renderTimer = timer
    }

    private func renderFrame() {
        guard let pixelBuffer = makePixelBuffer() else { return }
        guard let sampleBuffer = makeSampleBuffer(from: pixelBuffer) else { return }

        if displayLayer.status == .failed {
            displayLayer.flush()
        }
        displayLayer.enqueue(sampleBuffer)
    }

    /// Renders the SwiftUI frame content into a BGRA pixel buffer.
    private func makePixelBuffer() -> CVPixelBuffer? {
        let content = PiPFrameView(items: items)
            .frame(width: Self.renderSize.width, height: Self.renderSize.height)

        let renderer = ImageRenderer(content: content)
        // Scale 1: renderSize is already in pixels, and PiP does its own
        // scaling to the window, so rendering at @3x would triple the cost
        // for no visible gain.
        renderer.scale = 1
        guard let cgImage = renderer.cgImage else { return nil }

        let attributes: [CFString: Any] = [
            kCVPixelBufferCGImageCompatibilityKey: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey: true,
            kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary
        ]

        var pixelBuffer: CVPixelBuffer?
        let result = CVPixelBufferCreate(
            kCFAllocatorDefault,
            Int(Self.renderSize.width),
            Int(Self.renderSize.height),
            kCVPixelFormatType_32BGRA,
            attributes as CFDictionary,
            &pixelBuffer
        )
        guard result == kCVReturnSuccess, let buffer = pixelBuffer else {
            logger.error("CVPixelBufferCreate failed with status \(result)")
            return nil
        }

        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

        guard let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: Int(Self.renderSize.width),
            height: Int(Self.renderSize.height),
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
        ) else {
            return nil
        }

        context.draw(cgImage, in: CGRect(origin: .zero, size: Self.renderSize))
        return buffer
    }

    private func makeSampleBuffer(from pixelBuffer: CVPixelBuffer) -> CMSampleBuffer? {
        var formatDescription: CMFormatDescription?
        let formatStatus = CMVideoFormatDescriptionCreateForImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescriptionOut: &formatDescription
        )
        guard formatStatus == noErr, let format = formatDescription else { return nil }

        let scale = CMTimeScale(1.0 / Self.frameInterval)
        var timing = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: scale),
            presentationTimeStamp: CMTime(value: frameCount, timescale: scale),
            decodeTimeStamp: .invalid
        )
        frameCount += 1

        var sampleBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescription: format,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        )
        guard status == noErr else { return nil }
        return sampleBuffer
    }
}

// MARK: - PiP delegates

extension ClipPiPController: AVPictureInPictureControllerDelegate {

    nonisolated func pictureInPictureControllerDidStartPictureInPicture(_ controller: AVPictureInPictureController) {
        Task { @MainActor in self.status = .running }
    }

    nonisolated func pictureInPictureController(
        _ controller: AVPictureInPictureController,
        failedToStartPictureInPictureWithError error: Error
    ) {
        Task { @MainActor in
            self.logger.error("PiP failed to start: \(error.localizedDescription, privacy: .public)")
            self.status = .failed(error.localizedDescription)
            self.teardown()
        }
    }

    nonisolated func pictureInPictureControllerDidStopPictureInPicture(_ controller: AVPictureInPictureController) {
        Task { @MainActor in self.teardown() }
    }
}

/// Kept separate from the controller, and deliberately not main-actor bound,
/// so an @objc delegate conformance never has to argue with actor isolation.
/// Every method here is a constant answer: the "video" is a live feed with no
/// timeline to seek and nothing to pause.
private final class PiPPlaybackDelegate: NSObject, AVPictureInPictureSampleBufferPlaybackDelegate {

    func pictureInPictureController(_ controller: AVPictureInPictureController, setPlaying playing: Bool) {}

    func pictureInPictureControllerTimeRangeForPlayback(_ controller: AVPictureInPictureController) -> CMTimeRange {
        // An infinite range marks this as a live stream, which makes the
        // system hide its scrubber rather than showing a broken one.
        CMTimeRange(start: .negativeInfinity, duration: .positiveInfinity)
    }

    func pictureInPictureControllerIsPlaybackPaused(_ controller: AVPictureInPictureController) -> Bool {
        false
    }

    func pictureInPictureController(
        _ controller: AVPictureInPictureController,
        didTransitionToRenderSize newRenderSize: CMVideoDimensions
    ) {}

    func pictureInPictureController(
        _ controller: AVPictureInPictureController,
        skipByInterval skipInterval: CMTime,
        completion completionHandler: @escaping () -> Void
    ) {
        completionHandler()
    }
}

// MARK: - Rendered frame content

/// What the floating window actually shows. Bigger type and heavier contrast
/// than the in-app list: PiP shrinks this to roughly a third of its rendered
/// size, and anything subtle disappears at that scale.
private struct PiPFrameView: View {
    let items: [ClipMetadata]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: "clipboard.fill")
                Text("ClipKeep")
                    .fontWeight(.bold)
                Spacer()
            }
            .font(.system(size: 20))
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.accentColor)

            if items.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "tray")
                        .font(.system(size: 34, weight: .light))
                    Text("No clips yet")
                        .font(.system(size: 18, weight: .medium))
                }
                .foregroundStyle(.white.opacity(0.6))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(items) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: item.kind.symbolName)
                                .font(.system(size: 15))
                                .foregroundStyle(Color.accentColor)
                                .frame(width: 20)
                            Text(item.previewText)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(.white)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    Spacer(minLength: 0)
                }
                .padding(12)
            }
        }
        .background(Color.black)
    }
}
