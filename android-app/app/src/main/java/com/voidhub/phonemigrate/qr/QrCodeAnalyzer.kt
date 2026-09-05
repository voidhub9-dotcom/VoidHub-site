package com.voidhub.phonemigrate.qr

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.common.InputImage

/** Feeds camera frames to ML Kit and reports the first QR payload it recognizes. */
class QrCodeAnalyzer(
    private val onQrCodeDetected: (String) -> Unit,
) : ImageAnalysis.Analyzer {

    private val scanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
    )

    @Volatile private var isProcessing = false

    @OptIn(ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || isProcessing) {
            imageProxy.close()
            return
        }
        isProcessing = true
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue?.let(onQrCodeDetected)
            }
            .addOnCompleteListener {
                isProcessing = false
                imageProxy.close()
            }
    }

    fun close() {
        scanner.close()
    }
}
