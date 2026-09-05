package com.voidhub.phonemigrate.ui.screens.receive

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.permissions.PermissionUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveSetupScreen(
    onBack: () -> Unit,
    onContinue: (filesTreeUri: Uri?) -> Unit,
) {
    val context = LocalContext.current
    val allWritePermissions = remember {
        (
            DataCategory.entries.flatMap { it.writePermissions() } +
                PermissionUtils.notificationPermission() +
                PermissionUtils.wifiPermissions()
            ).distinct()
    }
    var granted by remember { mutableStateOf(PermissionUtils.hasAll(context, allWritePermissions)) }
    var filesTreeUri by remember { mutableStateOf<Uri?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        granted = results.values.all { it } || PermissionUtils.hasAll(context, allWritePermissions)
    }

    val folderPickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree(),
    ) { uri ->
        if (uri != null) {
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION,
            )
            filesTreeUri = uri
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Before you scan") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Back") }
                },
            )
        },
        bottomBar = {
            Column(modifier = Modifier.padding(24.dp)) {
                Button(
                    onClick = { onContinue(filesTreeUri) },
                    enabled = granted,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Text(if (granted) "Continue to scan" else "Grant permissions to continue")
                }
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "We ask for these permissions now so the transfer doesn't stop partway through to ask again.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "Contacts, call history & Wi-Fi", style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = "Needed to write incoming contacts, call log entries, and to join the other phone's connection.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (granted) {
                        Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    } else {
                        Button(onClick = { permissionLauncher.launch(allWritePermissions.toTypedArray()) }) {
                            Text("Allow")
                        }
                    }
                }
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Folder, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                        Text(text = "Files destination (optional)", style = MaterialTheme.typography.titleMedium)
                        Text(
                            text = filesTreeUri?.let { "Folder selected" }
                                ?: "Pick a folder if the other phone might send files. Skip this and files just won't transfer.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    OutlinedButton(onClick = { folderPickerLauncher.launch(null) }) {
                        Text(if (filesTreeUri == null) "Choose" else "Change")
                    }
                }
            }
        }
    }
}
