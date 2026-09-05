package com.voidhub.phonemigrate.network

import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * AES-256-GCM helpers for the transfer session. The session key is derived from the
 * one-time token embedded in the QR code, so it never touches the network directly —
 * only someone who scanned the QR (or is on the sender's freshly created hotspot with
 * the token) can decrypt anything.
 */
object CryptoUtil {
    private const val TRANSFORM = "AES/GCM/NoPadding"
    private const val GCM_TAG_BITS = 128
    private const val NONCE_BYTES = 12
    private const val TOKEN_BYTES = 32

    private val secureRandom = SecureRandom()

    fun randomToken(): String {
        val bytes = ByteArray(TOKEN_BYTES)
        secureRandom.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun deriveKey(token: String): SecretKeySpec {
        val digest = MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8))
        return SecretKeySpec(digest, "AES")
    }

    /** Encrypts [plaintext], returning `nonce (12 bytes) || ciphertext+tag`. */
    fun encrypt(key: SecretKeySpec, plaintext: ByteArray): ByteArray {
        val nonce = ByteArray(NONCE_BYTES).also { secureRandom.nextBytes(it) }
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, nonce))
        return nonce + cipher.doFinal(plaintext)
    }

    /** Reverses [encrypt]. Throws if the frame is malformed or the tag doesn't verify. */
    fun decrypt(key: SecretKeySpec, framed: ByteArray): ByteArray {
        require(framed.size > NONCE_BYTES) { "Encrypted frame too short" }
        val nonce = framed.copyOfRange(0, NONCE_BYTES)
        val ciphertext = framed.copyOfRange(NONCE_BYTES, framed.size)
        val cipher = Cipher.getInstance(TRANSFORM)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, nonce))
        return cipher.doFinal(ciphertext)
    }

    fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
}

/** Incremental SHA-256 for hashing a file while it streams, without buffering it whole. */
class StreamingSha256 {
    private val digest = MessageDigest.getInstance("SHA-256")

    fun update(bytes: ByteArray, offset: Int = 0, length: Int = bytes.size) {
        digest.update(bytes, offset, length)
    }

    fun hexDigest(): String = digest.digest().joinToString("") { "%02x".format(it) }
}
