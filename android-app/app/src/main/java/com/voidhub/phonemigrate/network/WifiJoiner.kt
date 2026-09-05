package com.voidhub.phonemigrate.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiConfiguration
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import androidx.annotation.RequiresApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class WifiJoinException(message: String) : Exception(message)

/**
 * Joins the sender's local-only hotspot and binds this process's network traffic to it,
 * so sockets opened afterwards go over that hotspot even if the phone also has mobile
 * data or another Wi-Fi network active. [release] must be called once the transfer is done
 * to hand default routing back to the system.
 */
class WifiJoiner(private val context: Context) {

    private val connectivityManager: ConnectivityManager
        get() = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val wifiManager: WifiManager
        get() = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    private var modernCallback: ConnectivityManager.NetworkCallback? = null
    private var legacyNetworkId: Int? = null

    suspend fun join(ssid: String, password: String, timeoutMs: Long = 20_000): Network {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            joinModern(ssid, password, timeoutMs)
        } else {
            joinLegacy(ssid, password, timeoutMs)
        }
    }

    fun release() {
        modernCallback?.let { runCatching { connectivityManager.unregisterNetworkCallback(it) } }
        modernCallback = null
        runCatching { connectivityManager.bindProcessToNetwork(null) }
        legacyNetworkId?.let { id ->
            runCatching {
                wifiManager.disableNetwork(id)
                wifiManager.removeNetwork(id)
            }
        }
        legacyNetworkId = null
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private suspend fun joinModern(ssid: String, password: String, timeoutMs: Long): Network =
        suspendCancellableCoroutine { continuation ->
            val specifier = WifiNetworkSpecifier.Builder()
                .setSsid(ssid)
                .setWpa2Passphrase(password)
                .build()

            val request = NetworkRequest.Builder()
                .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .setNetworkSpecifier(specifier)
                .build()

            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    connectivityManager.bindProcessToNetwork(network)
                    if (continuation.isActive) continuation.resume(network)
                }

                override fun onUnavailable() {
                    if (continuation.isActive) {
                        continuation.resumeWithException(WifiJoinException("Could not join $ssid"))
                    }
                }
            }
            modernCallback = callback
            connectivityManager.requestNetwork(request, callback, timeoutMs.toInt())

            continuation.invokeOnCancellation {
                runCatching { connectivityManager.unregisterNetworkCallback(callback) }
            }
        }

    @Suppress("DEPRECATION")
    private suspend fun joinLegacy(ssid: String, password: String, timeoutMs: Long): Network {
        val config = WifiConfiguration().apply {
            SSID = "\"$ssid\""
            preSharedKey = "\"$password\""
            allowedAuthAlgorithms.clear()
        }
        val netId = wifiManager.addNetwork(config)
        if (netId == -1) throw WifiJoinException("Could not register network config for $ssid")
        legacyNetworkId = netId

        wifiManager.disconnect()
        wifiManager.enableNetwork(netId, true)
        wifiManager.reconnect()

        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val currentSsid = wifiManager.connectionInfo?.ssid?.trim('"')
            if (currentSsid == ssid) {
                val network = connectivityManager.allNetworks.firstOrNull { net ->
                    val caps = connectivityManager.getNetworkCapabilities(net)
                    caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
                }
                if (network != null) {
                    connectivityManager.bindProcessToNetwork(network)
                    return network
                }
            }
            delay(300)
        }
        throw WifiJoinException("Timed out joining $ssid")
    }
}
