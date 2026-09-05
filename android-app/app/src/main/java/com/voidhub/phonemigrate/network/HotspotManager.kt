package com.voidhub.phonemigrate.network

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class HotspotCredentials(val ssid: String, val password: String)

class HotspotStartException(reasonCode: Int) : Exception("Local hotspot failed to start (reason=$reasonCode)")

/**
 * Wraps [WifiManager.startLocalOnlyHotspot]: the sender's phone briefly becomes its own
 * Wi-Fi access point so the two phones can talk without either needing an existing network.
 * Must be started and stopped from the same process lifetime — the reservation is held
 * for as long as this manager is alive.
 */
class HotspotManager(private val context: Context) {

    private var reservation: WifiManager.LocalOnlyHotspotReservation? = null
    private val wifiManager: WifiManager
        get() = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    suspend fun start(): HotspotCredentials = suspendCancellableCoroutine { continuation ->
        val handler = Handler(Looper.getMainLooper())
        val callback = object : WifiManager.LocalOnlyHotspotCallback() {
            override fun onStarted(newReservation: WifiManager.LocalOnlyHotspotReservation) {
                reservation = newReservation
                val credentials = extractCredentials(newReservation)
                if (credentials == null) {
                    continuation.resumeWithException(IllegalStateException("Hotspot started without SSID/password"))
                } else {
                    continuation.resume(credentials)
                }
            }

            override fun onStopped() {
                reservation = null
            }

            override fun onFailed(reason: Int) {
                reservation = null
                continuation.resumeWithException(HotspotStartException(reason))
            }
        }
        wifiManager.startLocalOnlyHotspot(callback, handler)

        continuation.invokeOnCancellation {
            reservation?.close()
            reservation = null
        }
    }

    fun stop() {
        reservation?.close()
        reservation = null
    }

    @Suppress("DEPRECATION")
    private fun extractCredentials(reservation: WifiManager.LocalOnlyHotspotReservation): HotspotCredentials? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val config = reservation.softApConfiguration
            val ssid = config.ssid ?: return null
            val password = config.passphrase ?: return null
            HotspotCredentials(ssid, password)
        } else {
            val config = reservation.wifiConfiguration ?: return null
            val ssid = config.SSID?.trim('"') ?: return null
            val password = config.preSharedKey?.trim('"') ?: return null
            HotspotCredentials(ssid, password)
        }
    }
}
