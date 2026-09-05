package com.voidhub.phonemigrate.network

import java.net.Inet4Address
import java.net.NetworkInterface

object NetworkUtils {

    /**
     * Best-effort local IPv4 address to advertise as the transfer server's host.
     * Prefers the common local-only-hotspot subnets so the sender doesn't accidentally
     * advertise an address on a different, unrelated interface.
     */
    fun findLocalIpv4Address(): String? {
        val preferredPrefixes = listOf("192.168.49.", "192.168.43.")
        val candidates = runCatching {
            NetworkInterface.getNetworkInterfaces().asSequence()
                .filter { it.isUp && !it.isLoopback }
                .flatMap { it.inetAddresses.asSequence() }
                .filterIsInstance<Inet4Address>()
                .map { it.hostAddress ?: "" }
                .filter { it.isNotBlank() }
                .toList()
        }.getOrDefault(emptyList())

        preferredPrefixes.forEach { prefix ->
            candidates.firstOrNull { it.startsWith(prefix) }?.let { return it }
        }
        return candidates.firstOrNull { it.startsWith("192.168.") }
            ?: candidates.firstOrNull()
    }
}
