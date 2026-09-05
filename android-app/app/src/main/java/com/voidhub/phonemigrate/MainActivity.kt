package com.voidhub.phonemigrate

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.voidhub.phonemigrate.navigation.AppNavGraph
import com.voidhub.phonemigrate.permissions.PermissionUtils
import com.voidhub.phonemigrate.service.rememberTransferService
import com.voidhub.phonemigrate.ui.theme.PhoneMigrateTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PhoneMigrateTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    val notificationPermissionLauncher = rememberLauncherForActivityResult(
                        ActivityResultContracts.RequestPermission(),
                    ) { /* Notification is a nice-to-have; the transfer runs either way. */ }

                    LaunchedEffect(Unit) {
                        val notificationPermission = PermissionUtils.notificationPermission()
                        if (notificationPermission.isNotEmpty() && !PermissionUtils.hasAll(this@MainActivity, notificationPermission)) {
                            notificationPermissionLauncher.launch(notificationPermission.first())
                        }
                    }

                    val navController = rememberNavController()
                    val serviceState = rememberTransferService()
                    val deviceName = remember { deviceDisplayName() }

                    AppNavGraph(
                        navController = navController,
                        transferService = serviceState.value,
                        deviceName = deviceName,
                    )
                }
            }
        }
    }

    private fun deviceDisplayName(): String {
        val manufacturer = Build.MANUFACTURER.orEmpty()
        val model = Build.MODEL.orEmpty()
        return if (model.startsWith(manufacturer, ignoreCase = true)) model else "$manufacturer $model".trim()
    }
}
