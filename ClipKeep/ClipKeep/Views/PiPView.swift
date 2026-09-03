//
//  PiPView.swift
//  ClipKeep
//
//  The PIP tab: put your recent clips in a floating window that stays on top
//  of other apps.
//
//  The screen is honest about the two things people are surprised by, up
//  front rather than after they try it: the floating window can be read but
//  not tapped (iOS routes touches in a PiP window to its own controls), and
//  it only survives leaving the app because of an active audio session, which
//  ClipKeep configures to mix rather than interrupt whatever you are already
//  playing. See ClipPiPController for why there is no other way to do this.
//

import SwiftUI
import UIKit
import AVFoundation
import AVKit

struct PiPView: View {

    @EnvironmentObject private var clipboardManager: ClipboardManager
    @StateObject private var pip = ClipPiPController()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    statusRow
                } header: {
                    Text("Status")
                }

                Section {
                    if pip.isSupported {
                        Button {
                            toggle()
                        } label: {
                            Label(
                                isRunning ? "Stop Floating Window" : "Start Floating Window",
                                systemImage: isRunning ? "pip.exit" : "pip.enter"
                            )
                        }
                        .disabled(pip.status == .starting)
                    } else {
                        Label("Picture in Picture isn't available on this device", systemImage: "xmark.circle")
                            .foregroundStyle(.secondary)
                    }
                } footer: {
                    Text("Start it, then swipe to another app — the window follows you there. Swipe up from the window or tap its restore button to come back.")
                }

                Section {
                    // The layer has to live in the view hierarchy for PiP to
                    // accept it, so it is shown here at a useful size rather
                    // than hidden away at 1×1 like most implementations do.
                    PiPLayerHost(layer: pip.hostedLayer)
                        .frame(height: 220)
                        .frame(maxWidth: .infinity)
                        .background(Color.black, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                        .padding(.vertical, 8)
                } header: {
                    Text("What the Window Shows")
                } footer: {
                    Text("Blank until you start it. This is the exact video feed the floating window plays — your newest clips, refreshed twice a second.")
                }

                Section {
                    Label("The floating window can be read, not tapped. iOS sends every touch inside a Picture in Picture window to its own controls, so no app can put buttons in one.", systemImage: "hand.tap")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Label("Starting it activates an audio session, which is what keeps the window alive once you leave ClipKeep. It is set to mix, so your music keeps playing.", systemImage: "speaker.wave.2")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Worth Knowing")
                }
            }
            .navigationTitle("Floating Window")
            .navigationBarTitleDisplayMode(.inline)
        }
        // Keep a running window in step with new captures without restarting
        // it -- the controller swaps the frame content, not the session.
        .onChange(of: clipboardManager.items) { _, newItems in
            guard isRunning else { return }
            pip.update(with: newItems)
        }
    }

    private var isRunning: Bool {
        pip.status == .running || pip.status == .starting
    }

    private func toggle() {
        if isRunning {
            pip.stop()
        } else {
            pip.start(with: clipboardManager.items)
        }
    }

    @ViewBuilder
    private var statusRow: some View {
        switch pip.status {
        case .idle:
            Label("Ready", systemImage: "circle.dashed")
        case .unsupported:
            Label("Not supported on this device", systemImage: "xmark.circle")
                .foregroundStyle(.secondary)
        case .starting:
            Label("Starting…", systemImage: "hourglass")
        case .running:
            Label("Floating window is active", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .failed(let message):
            VStack(alignment: .leading, spacing: 4) {
                Label("Couldn't start", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

/// Parents the controller's `AVSampleBufferDisplayLayer` in the view
/// hierarchy. PiP refuses a layer that isn't in a window, so this is load
/// bearing rather than decorative.
private struct PiPLayerHost: UIViewRepresentable {
    let layer: AVSampleBufferDisplayLayer

    func makeUIView(context: Context) -> LayerHostingView {
        let view = LayerHostingView()
        view.backgroundColor = .black
        view.hostedLayer = layer
        view.layer.addSublayer(layer)
        return view
    }

    func updateUIView(_ uiView: LayerHostingView, context: Context) {
        uiView.setNeedsLayout()
    }
}

final class LayerHostingView: UIView {
    var hostedLayer: CALayer?

    override func layoutSubviews() {
        super.layoutSubviews()
        // No implicit animation: the layer would otherwise slide into place
        // on every rotation and list reflow.
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        hostedLayer?.frame = bounds
        CATransaction.commit()
    }
}
