package com.voidhub.phonemigrate.service

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/** Binds [TransferForegroundService] for the composition's lifetime and exposes the live instance. */
@Composable
fun rememberTransferService(): State<TransferForegroundService?> {
    val context = LocalContext.current
    val serviceState = remember { mutableStateOf<TransferForegroundService?>(null) }

    DisposableEffect(Unit) {
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                serviceState.value = (binder as? TransferForegroundService.LocalBinder)?.getService()
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                serviceState.value = null
            }
        }
        val intent = Intent(context, TransferForegroundService::class.java)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)

        onDispose {
            context.unbindService(connection)
        }
    }

    return serviceState
}
