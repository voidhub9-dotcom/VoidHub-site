package com.voidhub.phonemigrate.qr

import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

/** Live camera preview wired to [QrCodeAnalyzer]; calls [onQrDetected] on the main thread once per composition. */
@Composable
fun QrScannerView(
    modifier: Modifier = Modifier,
    onQrDetected: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnQrDetected by rememberUpdatedState(onQrDetected)
    val analysisExecutor = remember { Executors.newSingleThreadExecutor() }

    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }

    DisposableEffect(lifecycleOwner) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        var analyzer: QrCodeAnalyzer? = null

        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            val newAnalyzer = QrCodeAnalyzer { payload -> currentOnQrDetected(payload) }
            analyzer = newAnalyzer

            val imageAnalysis = ImageAnalysis.Builder()
                .setTargetResolution(Size(1280, 720))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { it.setAnalyzer(analysisExecutor, newAnalyzer) }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            runCatching {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageAnalysis)
            }
        }, ContextCompat.getMainExecutor(context))

        onDispose {
            runCatching { cameraProviderFuture.get().unbindAll() }
            analyzer?.close()
            analysisExecutor.shutdown()
        }
    }

    AndroidView(factory = { previewView }, modifier = modifier.fillMaxSize())
}
