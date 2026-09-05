package com.voidhub.phonemigrate.ui.screens.common

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.voidhub.phonemigrate.data.model.TransferPhase
import com.voidhub.phonemigrate.data.model.TransferProgress
import com.voidhub.phonemigrate.qr.QrCodeGenerator
import com.voidhub.phonemigrate.ui.formatBytes
import com.voidhub.phonemigrate.ui.icon

@Composable
fun TransferStatusContent(
    progress: TransferProgress,
    qrPayload: String?,
    waitingInstructions: String,
    onCancel: () -> Unit,
    onDone: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        when (progress.phase) {
            TransferPhase.IDLE, TransferPhase.PREPARING -> BusyState(progress.statusMessage.ifBlank { "Getting ready…" }, onCancel)

            TransferPhase.WAITING_FOR_PEER -> if (qrPayload != null) {
                QrWaitingState(qrPayload, waitingInstructions, onCancel)
            } else {
                BusyState("Waiting for the other phone…", onCancel)
            }

            TransferPhase.CONNECTING, TransferPhase.HANDSHAKE ->
                BusyState(progress.statusMessage.ifBlank { "Connecting…" }, onCancel)

            TransferPhase.TRANSFERRING -> TransferringState(progress, onCancel)

            TransferPhase.COMPLETED, TransferPhase.FAILED, TransferPhase.CANCELLED -> ResultState(progress, onDone)
        }
    }
}

@Composable
private fun BusyState(message: String, onCancel: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator()
        Spacer(modifier = Modifier.height(20.dp))
        Text(text = message, style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(32.dp))
        OutlinedButton(onClick = onCancel) { Text("Cancel") }
    }
}

@Composable
private fun QrWaitingState(qrPayload: String, instructions: String, onCancel: () -> Unit) {
    val bitmap = remember(qrPayload) { QrCodeGenerator.generate(qrPayload) }
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
        ) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = "QR code to scan on the other phone",
                modifier = Modifier.padding(20.dp).size(240.dp),
            )
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = instructions,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(20.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
            Text(
                text = "Waiting for a scan…",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        Spacer(modifier = Modifier.height(32.dp))
        OutlinedButton(onClick = onCancel) { Text("Cancel") }
    }
}

@Composable
private fun TransferringState(progress: TransferProgress, onCancel: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text(text = "Transferring", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(
            text = progress.currentItemName ?: progress.statusMessage,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
        )

        LinearProgressIndicator(
            progress = { progress.overallFraction },
            modifier = Modifier.fillMaxWidth().height(10.dp).clipRounded(),
        )
        Text(
            text = "${(progress.overallFraction * 100).toInt()}% • ${formatBytes(progress.overallTransferredBytes)} of ${formatBytes(progress.overallTotalBytes)}",
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
        )

        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(progress.perCategory) { category ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(imageVector = category.category.icon(), contentDescription = null, modifier = Modifier.size(20.dp))
                            Text(
                                text = category.category.label,
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(start = 8.dp),
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            Text(
                                text = "${category.completedItems}/${category.totalItems}",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        val fraction = if (category.totalBytes <= 0L) 0f else (category.transferredBytes.toFloat() / category.totalBytes).coerceIn(0f, 1f)
                        LinearProgressIndicator(
                            progress = { fraction },
                            modifier = Modifier.fillMaxWidth().height(6.dp).clipRounded(),
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))
        OutlinedButton(onClick = onCancel, modifier = Modifier.fillMaxWidth()) { Text("Cancel") }
    }
}

@Composable
private fun ResultState(progress: TransferProgress, onDone: () -> Unit) {
    val (icon, tint, title) = when (progress.phase) {
        TransferPhase.COMPLETED -> if (progress.itemsFailed.isEmpty()) {
            Triple(Icons.Filled.CheckCircle, MaterialTheme.colorScheme.primary, "All done")
        } else {
            Triple(Icons.Filled.CheckCircle, MaterialTheme.colorScheme.tertiary, "Mostly done")
        }
        TransferPhase.CANCELLED -> Triple(Icons.Filled.Cancel, MaterialTheme.colorScheme.onSurfaceVariant, "Cancelled")
        else -> Triple(Icons.Filled.Error, MaterialTheme.colorScheme.error, "Transfer failed")
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(64.dp))
        Spacer(modifier = Modifier.height(16.dp))
        Text(text = title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)

        if (progress.phase == TransferPhase.COMPLETED) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "${formatBytes(progress.overallTransferredBytes)} moved across ${progress.perCategory.size} categories",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }

        progress.errorMessage?.let { message ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }

        if (progress.itemsFailed.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "${progress.itemsFailed.size} item(s) couldn't be transferred:",
                        style = MaterialTheme.typography.labelLarge,
                    )
                    progress.itemsFailed.take(6).forEach {
                        Text(text = "• $it", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                    }
                    if (progress.itemsFailed.size > 6) {
                        Text(
                            text = "…and ${progress.itemsFailed.size - 6} more",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
        Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Done") }
    }
}

private fun Modifier.clipRounded() = this.clip(RoundedCornerShape(50))
