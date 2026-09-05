package com.voidhub.phonemigrate.ui.screens.send

import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.voidhub.phonemigrate.data.model.ConnectionInfo
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.TransferProgress
import com.voidhub.phonemigrate.service.TransferForegroundService
import com.voidhub.phonemigrate.ui.screens.common.TransferStatusContent
import kotlinx.coroutines.flow.MutableStateFlow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SendTransferScreen(
    service: TransferForegroundService?,
    categories: Set<DataCategory>,
    filesTreeUri: Uri?,
    deviceName: String,
    onDone: () -> Unit,
) {
    var connectionInfo by remember { mutableStateOf<ConnectionInfo?>(null) }
    var started by rememberSaveable { mutableStateOf(false) }
    val fallbackFlow = remember { MutableStateFlow(TransferProgress()) }
    val progress by (service?.progress ?: fallbackFlow).collectAsState()

    LaunchedEffect(service) {
        if (service != null && !started) {
            started = true
            service.startSend(categories.toList(), filesTreeUri, deviceName) { info ->
                connectionInfo = info
            }
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Sending") }) },
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            TransferStatusContent(
                progress = progress,
                qrPayload = connectionInfo?.let { ConnectionInfo.encode(it) },
                waitingInstructions = "On your new phone, open PhoneMigrate, tap \"Receive on this phone\", and scan this code. Keep both phones close and awake.",
                onCancel = {
                    service?.cancel()
                    onDone()
                },
                onDone = onDone,
            )
        }
    }
}
