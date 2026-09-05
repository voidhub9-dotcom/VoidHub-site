package com.voidhub.phonemigrate.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Notification
import android.app.Service
import android.content.Intent
import android.net.Uri
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.voidhub.phonemigrate.R
import com.voidhub.phonemigrate.collectors.CollectorRegistry
import com.voidhub.phonemigrate.data.model.ConnectionInfo
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.TransferPhase
import com.voidhub.phonemigrate.data.model.TransferProgress
import com.voidhub.phonemigrate.network.CryptoUtil
import com.voidhub.phonemigrate.network.HotspotManager
import com.voidhub.phonemigrate.network.NetworkUtils
import com.voidhub.phonemigrate.network.TransferClient
import com.voidhub.phonemigrate.network.TransferServer
import com.voidhub.phonemigrate.network.WifiJoiner
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Holds the sending or receiving transfer session so it survives the host activity
 * backgrounding, and surfaces a progress notification while it runs. The app binds to
 * this rather than starting it detached, so [progress] can be observed directly.
 */
class TransferForegroundService : Service() {

    private val binder = LocalBinder()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var job: Job? = null

    private val _progress = MutableStateFlow(TransferProgress())
    val progress: StateFlow<TransferProgress> = _progress.asStateFlow()

    private var hotspotManager: HotspotManager? = null
    private var wifiJoiner: WifiJoiner? = null
    private var transferServer: TransferServer? = null
    private var transferClient: TransferClient? = null

    inner class LocalBinder : Binder() {
        fun getService(): TransferForegroundService = this@TransferForegroundService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    fun startSend(
        categories: List<DataCategory>,
        filesTreeUri: Uri?,
        deviceName: String,
        onConnectionReady: (ConnectionInfo) -> Unit,
    ) {
        if (job?.isActive == true) return
        _progress.value = TransferProgress()
        job = serviceScope.launch {
            startForeground(NOTIFICATION_ID, buildNotification("Starting…", 0))
            try {
                _progress.value = TransferProgress(phase = TransferPhase.PREPARING, statusMessage = "Gathering your data…")
                val items = withContext(Dispatchers.IO) {
                    categories.flatMap { CollectorRegistry.forCategory(it).collect(applicationContext, filesTreeUri) }
                }
                if (items.isEmpty()) {
                    _progress.value = TransferProgress(
                        phase = TransferPhase.FAILED,
                        errorMessage = "Nothing was found for the categories you selected",
                    )
                    return@launch
                }

                val hotspot = HotspotManager(applicationContext).also { hotspotManager = it }
                val credentials = hotspot.start()

                val token = CryptoUtil.randomToken()
                val server = TransferServer(token, deviceName).also { transferServer = it }
                val port = server.listen()
                val host = NetworkUtils.findLocalIpv4Address() ?: "192.168.49.1"

                onConnectionReady(ConnectionInfo(credentials.ssid, credentials.password, host, port, token))

                val result = server.acceptAndSend(items) { progress ->
                    _progress.value = progress
                    updateNotification(progress)
                }
                _progress.value = result
            } catch (e: Exception) {
                _progress.value = TransferProgress(phase = TransferPhase.FAILED, errorMessage = e.message ?: "Transfer failed")
            } finally {
                hotspotManager?.stop()
                hotspotManager = null
                finishForeground()
            }
        }
    }

    fun startReceive(
        connectionInfo: ConnectionInfo,
        filesTreeUri: Uri?,
        deviceName: String,
    ) {
        if (job?.isActive == true) return
        _progress.value = TransferProgress()
        job = serviceScope.launch {
            startForeground(NOTIFICATION_ID, buildNotification("Starting…", 0))
            try {
                _progress.value = TransferProgress(phase = TransferPhase.CONNECTING, statusMessage = "Joining the other phone's network…")
                val joiner = WifiJoiner(applicationContext).also { wifiJoiner = it }
                joiner.join(connectionInfo.ssid, connectionInfo.password)

                val client = TransferClient().also { transferClient = it }
                val result = client.connectAndReceive(
                    context = applicationContext,
                    host = connectionInfo.host,
                    port = connectionInfo.port,
                    token = connectionInfo.token,
                    deviceName = deviceName,
                    filesTreeUri = filesTreeUri,
                ) { progress ->
                    _progress.value = progress
                    updateNotification(progress)
                }
                _progress.value = result
            } catch (e: Exception) {
                _progress.value = TransferProgress(phase = TransferPhase.FAILED, errorMessage = e.message ?: "Transfer failed")
            } finally {
                wifiJoiner?.release()
                wifiJoiner = null
                finishForeground()
            }
        }
    }

    fun cancel() {
        transferServer?.cancel()
        transferClient?.cancel()
        job?.cancel()
    }

    private fun finishForeground() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun updateNotification(progress: TransferProgress) {
        val notification = buildNotification(progress.statusMessage, (progress.overallFraction * 100).toInt())
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotification(text: String, percent: Int): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_transfer_title))
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setProgress(100, percent, false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_transfer),
                NotificationManager.IMPORTANCE_LOW,
            )
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        job?.cancel()
        hotspotManager?.stop()
        wifiJoiner?.release()
        serviceScope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL_ID = "transfer_channel"
        private const val NOTIFICATION_ID = 42
    }
}
