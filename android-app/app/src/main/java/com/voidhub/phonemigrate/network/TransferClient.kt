package com.voidhub.phonemigrate.network

import android.content.Context
import android.net.Uri
import com.voidhub.phonemigrate.data.model.TransferPhase
import com.voidhub.phonemigrate.data.model.TransferProgress
import com.voidhub.phonemigrate.writers.WriterRegistry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Runs on the receiving phone, right after it scans the sender's QR code and joins its
 * hotspot. Connects to the advertised host:port, authenticates with the token from the
 * QR payload, then pulls down and writes every item the sender streams.
 */
class TransferClient {
    @Volatile private var activeSocket: Socket? = null
    @Volatile private var cancelled = false

    suspend fun connectAndReceive(
        context: Context,
        host: String,
        port: Int,
        token: String,
        deviceName: String,
        filesTreeUri: Uri?,
        onProgress: (TransferProgress) -> Unit,
    ): TransferProgress = withContext(Dispatchers.IO) {
        onProgress(TransferProgress(phase = TransferPhase.CONNECTING, statusMessage = "Connecting to the other phone…"))
        val socket = Socket()
        activeSocket = socket
        try {
            socket.connect(InetSocketAddress(host, port), Protocol.HANDSHAKE_TIMEOUT_MS)
            socket.soTimeout = Protocol.SOCKET_TIMEOUT_MS
            socket.use { s ->
                val input = DataInputStream(BufferedInputStream(s.getInputStream()))
                val output = DataOutputStream(BufferedOutputStream(s.getOutputStream()))
                return@withContext runSession(context, input, output, token, deviceName, filesTreeUri, onProgress)
            }
        } catch (e: IOException) {
            if (cancelled) {
                val result = TransferProgress(phase = TransferPhase.CANCELLED, statusMessage = "Cancelled")
                onProgress(result)
                return@withContext result
            }
            val message = e.message ?: "Connection error"
            onProgress(TransferProgress(phase = TransferPhase.FAILED, statusMessage = "Transfer failed", errorMessage = message))
            return@withContext TransferProgress(phase = TransferPhase.FAILED, errorMessage = message)
        }
    }

    private fun runSession(
        context: Context,
        input: DataInputStream,
        output: DataOutputStream,
        token: String,
        deviceName: String,
        filesTreeUri: Uri?,
        onProgress: (TransferProgress) -> Unit,
    ): TransferProgress {
        onProgress(TransferProgress(phase = TransferPhase.HANDSHAKE, statusMessage = "Verifying connection…"))
        FrameIO.writeControl(output, ControlMessage.Hello(token, deviceName))

        val ack = FrameIO.readControlOrThrow(input, "handshake acknowledgement") as? ControlMessage.HelloAck
            ?: throw IOException("Expected a handshake acknowledgement")
        if (!ack.accepted) throw SecurityException("The other phone rejected this connection: ${ack.reason}")

        val manifestMessage = FrameIO.readControlOrThrow(input, "manifest") as? ControlMessage.ManifestMessage
            ?: throw IOException("Expected a manifest")
        val manifest = manifestMessage.manifest
        FrameIO.writeControl(output, ControlMessage.ManifestAck(accepted = true))

        val key = CryptoUtil.deriveKey(token)
        val accumulator = TransferAccumulator(manifest.items)
        val itemsById = manifest.items.associateBy { it.id }
        val failed = mutableListOf<String>()

        while (true) {
            if (cancelled) {
                return accumulator.snapshot(TransferPhase.CANCELLED, "Cancelled")
            }
            when (val next = FrameIO.readControlOrThrow(input, "next item or completion")) {
                is ControlMessage.Done -> {
                    val result = accumulator.snapshot(TransferPhase.COMPLETED, "Transfer complete", itemsFailed = failed)
                    onProgress(result)
                    return result
                }
                is ControlMessage.Cancel -> {
                    return accumulator.snapshot(TransferPhase.CANCELLED, next.reason)
                }
                is ControlMessage.ItemStart -> {
                    receiveItem(context, input, output, key, itemsById, next, filesTreeUri, accumulator, failed, onProgress)
                }
                else -> throw IOException("Unexpected message from sender: $next")
            }
        }
    }

    private fun receiveItem(
        context: Context,
        input: DataInputStream,
        output: DataOutputStream,
        key: javax.crypto.spec.SecretKeySpec,
        itemsById: Map<String, com.voidhub.phonemigrate.data.model.ManifestItem>,
        start: ControlMessage.ItemStart,
        filesTreeUri: Uri?,
        accumulator: TransferAccumulator,
        failed: MutableList<String>,
        onProgress: (TransferProgress) -> Unit,
    ) {
        val manifestItem = itemsById[start.itemId] ?: throw IOException("Sender referenced an unknown item ${start.itemId}")
        val hasher = StreamingSha256()
        var success: Boolean
        var errorText: String? = null
        var chunksConsumed = 0
        var completeConsumed = false

        // Failing to open the sink (e.g. no destination folder picked for a FILES item) must
        // not desync the wire protocol — the sender is still going to stream exactly
        // start.chunkCount frames plus a completion message for this item either way.
        val sink = try {
            WriterRegistry.forCategory(manifestItem.category).beginItem(context, manifestItem, filesTreeUri)
        } catch (e: Exception) {
            errorText = e.message ?: "Could not prepare a destination for this item"
            null
        }

        try {
            while (chunksConsumed < start.chunkCount) {
                val frame = FrameIO.readFrame(input, Protocol.MAX_DATA_FRAME)
                chunksConsumed++
                val plaintext = CryptoUtil.decrypt(key, frame)
                if (sink != null) {
                    sink.write(plaintext, plaintext.size)
                    hasher.update(plaintext)
                }
                accumulator.addBytes(manifestItem.category, plaintext.size.toLong())
                if (accumulator.shouldEmit()) {
                    onProgress(accumulator.snapshot(TransferPhase.TRANSFERRING, "Receiving ${manifestItem.displayName}", manifestItem.displayName, failed))
                }
            }
            val complete = FrameIO.readControlOrThrow(input, "completion for ${manifestItem.displayName}") as? ControlMessage.ItemComplete
                ?: throw IOException("Expected item completion for ${manifestItem.displayName}")
            completeConsumed = true

            success = when {
                sink == null -> false
                complete.sha256 != hasher.hexDigest() -> {
                    sink.abort()
                    errorText = "Checksum mismatch"
                    false
                }
                else -> {
                    sink.commit()
                    true
                }
            }
        } catch (e: Exception) {
            runCatching { sink?.abort() }
            success = false
            if (errorText == null) errorText = e.message ?: "Transfer error"
            // Drain whatever the sender still has in flight for this item so the next
            // ItemStart/Done we read lines up with what the sender actually sends next.
            runCatching {
                while (chunksConsumed < start.chunkCount) {
                    FrameIO.readFrame(input, Protocol.MAX_DATA_FRAME)
                    chunksConsumed++
                }
                if (!completeConsumed) {
                    FrameIO.readControlOrThrow(input, "drained completion for ${manifestItem.displayName}")
                }
            }
        }

        if (!success) failed += manifestItem.displayName
        accumulator.markItemDone(manifestItem.category)
        FrameIO.writeControl(output, ControlMessage.ItemAck(manifestItem.id, success, errorText))
        onProgress(accumulator.snapshot(TransferPhase.TRANSFERRING, "Receiving ${manifestItem.displayName}", manifestItem.displayName, failed))
    }

    fun cancel() {
        cancelled = true
        runCatching { activeSocket?.close() }
    }
}
