package com.voidhub.phonemigrate.ui.screens.receive

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.voidhub.phonemigrate.data.model.ConnectionInfo
import com.voidhub.phonemigrate.qr.QrScannerView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveScanScreen(
    onBack: () -> Unit,
    onCodeScanned: (ConnectionInfo) -> Unit,
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED,
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> hasCameraPermission = granted }

    var invalidCodeMessage by remember { mutableStateOf<String?>(null) }
    var handled by remember { mutableStateOf(false) }
    val onCodeScannedCurrent by rememberUpdatedState(onCodeScanned)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scan the code") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Color.White) }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Black,
                    titleContentColor = Color.White,
                ),
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.Black),
        ) {
            if (hasCameraPermission) {
                QrScannerView(
                    modifier = Modifier.fillMaxSize(),
                    onQrDetected = { payload ->
                        if (handled) return@QrScannerView
                        val info = ConnectionInfo.decode(payload)
                        if (info != null) {
                            handled = true
                            onCodeScannedCurrent(info)
                        } else {
                            invalidCodeMessage = "That's not a PhoneMigrate code — keep scanning."
                        }
                    },
                )
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(260.dp)
                        .border(3.dp, Color.White, RoundedCornerShape(24.dp)),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = invalidCodeMessage ?: "Point the camera at the QR code on your old phone",
                        color = Color.White,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxSize().padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = "PhoneMigrate needs camera access to scan the code.",
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                    androidx.compose.foundation.layout.Spacer(modifier = Modifier.size(16.dp))
                    Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                        Text("Grant camera access")
                    }
                }
            }
        }
    }
}
