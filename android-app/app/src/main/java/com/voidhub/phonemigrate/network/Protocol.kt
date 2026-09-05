package com.voidhub.phonemigrate.network

import com.voidhub.phonemigrate.data.model.TransferManifest
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.IOException

/** Wire constants shared by [com.voidhub.phonemigrate.network.TransferServer] and [com.voidhub.phonemigrate.network.TransferClient]. */
object Protocol {
    const val CHUNK_SIZE = 256 * 1024
    const val MAX_CONTROL_FRAME = 1 * 1024 * 1024
    const val MAX_DATA_FRAME = CHUNK_SIZE + 1024 // chunk plus AES-GCM nonce/tag overhead
    const val SOCKET_TIMEOUT_MS = 20_000
    const val HANDSHAKE_TIMEOUT_MS = 10_000

    val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
}

@Serializable
sealed class ControlMessage {
    @Serializable
    @SerialName("hello")
    data class Hello(val token: String, val deviceName: String) : ControlMessage()

    @Serializable
    @SerialName("hello_ack")
    data class HelloAck(val accepted: Boolean, val deviceName: String, val reason: String? = null) : ControlMessage()

    @Serializable
    @SerialName("manifest")
    data class ManifestMessage(val manifest: TransferManifest) : ControlMessage()

    @Serializable
    @SerialName("manifest_ack")
    data class ManifestAck(val accepted: Boolean, val reason: String? = null) : ControlMessage()

    @Serializable
    @SerialName("item_start")
    data class ItemStart(val itemId: String, val chunkCount: Int) : ControlMessage()

    @Serializable
    @SerialName("item_complete")
    data class ItemComplete(val itemId: String, val sha256: String) : ControlMessage()

    @Serializable
    @SerialName("item_ack")
    data class ItemAck(val itemId: String, val success: Boolean, val error: String? = null) : ControlMessage()

    @Serializable
    @SerialName("done")
    data object Done : ControlMessage()

    @Serializable
    @SerialName("cancel")
    data class Cancel(val reason: String) : ControlMessage()

    @Serializable
    @SerialName("error")
    data class Error(val message: String) : ControlMessage()
}

/** Length-prefixed frame I/O: a 4-byte big-endian size header followed by that many bytes. */
object FrameIO {

    @Throws(IOException::class)
    fun writeFrame(out: DataOutputStream, bytes: ByteArray) {
        out.writeInt(bytes.size)
        out.write(bytes)
        out.flush()
    }

    @Throws(IOException::class)
    fun readFrame(input: DataInputStream, maxSize: Int): ByteArray {
        val size = input.readInt()
        if (size < 0 || size > maxSize) {
            throw IOException("Refusing to read frame of size $size (limit $maxSize)")
        }
        val buffer = ByteArray(size)
        input.readFully(buffer)
        return buffer
    }

    fun writeControl(out: DataOutputStream, message: ControlMessage) {
        val bytes = Protocol.json.encodeToString(ControlMessage.serializer(), message)
            .toByteArray(Charsets.UTF_8)
        writeFrame(out, bytes)
    }

    fun readControl(input: DataInputStream): ControlMessage {
        val bytes = readFrame(input, Protocol.MAX_CONTROL_FRAME)
        val text = String(bytes, Charsets.UTF_8)
        return Protocol.json.decodeFromString(ControlMessage.serializer(), text)
    }

    /** Same as [readControl] but wraps a raw stream close/reset mid-read into a clearer error. */
    fun readControlOrThrow(input: DataInputStream, context: String): ControlMessage = try {
        readControl(input)
    } catch (e: EOFException) {
        throw IOException("Connection closed while waiting for $context", e)
    }
}
