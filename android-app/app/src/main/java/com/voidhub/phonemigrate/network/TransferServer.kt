package com.voidhub.phonemigrate.network

import com.voidhub.phonemigrate.collectors.CollectedItem
import com.voidhub.phonemigrate.data.model.TransferManifest
import com.voidhub.phonemigrate.data.model.TransferPhase
import com.voidhub.phonemigrate.data.model.TransferProgress
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.IOException
import java.net.ServerSocket
import java.net.SocketException

/**
 * Runs on the sending phone. Opens one socket, waits for the phone that scanned the QR
 * code to connect, authenticates it with the token from that code, then streams every
 * collected item to it, encrypted, one at a time with an acknowledgement in between.
 */
class TransferServer(
    private val token: String,
    private val deviceName: String,
) {
    @Volatile private var serverSocket: ServerSocket? = null
    @Volatile private var activeSocket: java.net.Socket? = null
    @Volatile private var cancelled = false

    suspend fun listen(): Int = withContext(Dispatchers.IO) {
        val socket = ServerSocket(0)
        serverSocket = socket
        socket.localPort
    }

    suspend fun acceptAndSend(
        collectedItems: List<CollectedItem>,
        onProgress: (TransferProgress) -> Unit,
    ): TransferProgress = withContext(Dispatchers.IO) {
        val listening = serverSocket ?: error("Call listen() before acceptAndSend()")
        onProgress(TransferProgress(phase = TransferPhase.WAITING_FOR_PEER, statusMessage = "Waiting for the other phone to scan the code…"))

        val socket = try {
            listening.accept()
        } catch (e: SocketException) {
            return@withContext TransferProgress(phase = TransferPhase.CANCELLED, statusMessage = "Cancelled")
        }
        activeSocket = socket
        socket.soTimeout = Protocol.SOCKET_TIMEOUT_MS

        try {
            socket.use { s ->
                val input = DataInputStream(BufferedInputStream(s.getInputStream()))
                val output = DataOutputStream(BufferedOutputStream(s.getOutputStream()))
                return@withContext runSession(input, output, collectedItems, onProgress)
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
        input: DataInputStream,
        output: DataOutputStream,
        collectedItems: List<CollectedItem>,
        onProgress: (TransferProgress) -> Unit,
    ): TransferProgress {
        onProgress(TransferProgress(phase = TransferPhase.HANDSHAKE, statusMessage = "Verifying connection…"))

        val hello = FrameIO.readControlOrThrow(input, "handshake") as? ControlMessage.Hello
            ?: throw IOException("Expected a hello message")
        if (hello.token != token) {
            FrameIO.writeControl(output, ControlMessage.HelloAck(accepted = false, deviceName = deviceName, reason = "Token mismatch"))
            throw SecurityException("The connecting phone did not present a matching code")
        }
        FrameIO.writeControl(output, ControlMessage.HelloAck(accepted = true, deviceName = deviceName))

        val manifest = TransferManifest(deviceName = deviceName, items = collectedItems.map { it.manifestItem })
        FrameIO.writeControl(output, ControlMessage.ManifestMessage(manifest))
        val manifestAck = FrameIO.readControlOrThrow(input, "manifest acknowledgement") as? ControlMessage.ManifestAck
            ?: throw IOException("Expected a manifest acknowledgement")
        if (!manifestAck.accepted) throw IOException("The other phone rejected the manifest: ${manifestAck.reason}")

        val key = CryptoUtil.deriveKey(token)
        val byId = collectedItems.associateBy { it.manifestItem.id }
        val accumulator = TransferAccumulator(manifest.items)
        val failed = mutableListOf<String>()

        for (manifestItem in manifest.items) {
            if (cancelled) {
                FrameIO.writeControl(output, ControlMessage.Cancel("Cancelled by sender"))
                return accumulator.snapshot(TransferPhase.CANCELLED, "Cancelled")
            }

            val collected = byId.getValue(manifestItem.id)
            val chunkCount = if (manifestItem.sizeBytes == 0L) {
                0
            } else {
                ((manifestItem.sizeBytes + Protocol.CHUNK_SIZE - 1) / Protocol.CHUNK_SIZE).toInt()
            }
            FrameIO.writeControl(output, ControlMessage.ItemStart(manifestItem.id, chunkCount))

            val hasher = StreamingSha256()
            collected.openStream().use { itemInput ->
                val buffer = ByteArray(Protocol.CHUNK_SIZE)
                while (true) {
                    val read = itemInput.read(buffer)
                    if (read <= 0) break
                    hasher.update(buffer, 0, read)
                    val plaintext = if (read == buffer.size) buffer else buffer.copyOf(read)
                    FrameIO.writeFrame(output, CryptoUtil.encrypt(key, plaintext))
                    accumulator.addBytes(manifestItem.category, read.toLong())
                    if (accumulator.shouldEmit()) {
                        onProgress(accumulator.snapshot(TransferPhase.TRANSFERRING, "Sending ${manifestItem.displayName}", manifestItem.displayName, failed))
                    }
                }
            }
            FrameIO.writeControl(output, ControlMessage.ItemComplete(manifestItem.id, hasher.hexDigest()))

            val ack = FrameIO.readControlOrThrow(input, "acknowledgement for ${manifestItem.displayName}") as? ControlMessage.ItemAck
            if (ack == null || !ack.success) {
                failed += manifestItem.displayName
            }
            accumulator.markItemDone(manifestItem.category)
            onProgress(accumulator.snapshot(TransferPhase.TRANSFERRING, "Sending ${manifestItem.displayName}", manifestItem.displayName, failed))
        }

        FrameIO.writeControl(output, ControlMessage.Done)
        val result = accumulator.snapshot(TransferPhase.COMPLETED, "Transfer complete", itemsFailed = failed)
        onProgress(result)
        return result
    }

    fun cancel() {
        cancelled = true
        runCatching { activeSocket?.close() }
        runCatching { serverSocket?.close() }
    }
}
