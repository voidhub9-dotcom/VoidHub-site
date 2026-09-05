package com.voidhub.phonemigrate.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Everything the receiving phone needs, packed into the QR code shown by the sender:
 * which local Wi-Fi network to join, where to open a socket, and the one-time token
 * that both authenticates the connection and seeds the session's encryption key.
 */
@Serializable
data class ConnectionInfo(
    val ssid: String,
    val password: String,
    val host: String,
    val port: Int,
    val token: String,
    val protocolVersion: Int = PROTOCOL_VERSION,
) {
    fun toQrPayload(): String = json.encodeToString(this)

    companion object {
        const val PROTOCOL_VERSION = 1
        private const val MAGIC_PREFIX = "PHONEMIGRATE1:"

        private val json = Json { ignoreUnknownKeys = true }

        fun encode(info: ConnectionInfo): String = MAGIC_PREFIX + info.toQrPayload()

        /** Returns null if [raw] isn't a payload this app produced. */
        fun decode(raw: String): ConnectionInfo? {
            if (!raw.startsWith(MAGIC_PREFIX)) return null
            return runCatching {
                json.decodeFromString<ConnectionInfo>(raw.removePrefix(MAGIC_PREFIX))
            }.getOrNull()
        }
    }
}
