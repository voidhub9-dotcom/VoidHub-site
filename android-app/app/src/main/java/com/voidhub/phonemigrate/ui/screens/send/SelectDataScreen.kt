package com.voidhub.phonemigrate.ui.screens.send

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.permissions.PermissionUtils
import com.voidhub.phonemigrate.ui.icon

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SelectDataScreen(
    onBack: () -> Unit,
    onContinue: (categories: Set<DataCategory>, filesTreeUri: Uri?) -> Unit,
) {
    val context = LocalContext.current
    var selected by remember { mutableStateOf(setOf<DataCategory>()) }
    var filesTreeUri by remember { mutableStateOf<Uri?>(null) }
    var pendingPermissionCategory by remember { mutableStateOf<DataCategory?>(null) }
    val currentPending by rememberUpdatedState(pendingPermissionCategory)

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { results ->
        val category = currentPending ?: return@rememberLauncherForActivityResult
        pendingPermissionCategory = null
        if (results.values.all { it }) {
            selected = selected + category
        }
    }

    val folderPickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree(),
    ) { uri ->
        if (uri != null) {
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
            filesTreeUri = uri
            selected = selected + DataCategory.FILES
        }
    }

    var awaitingWifiPermission by remember { mutableStateOf(false) }
    val wifiPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) {
        if (awaitingWifiPermission) {
            awaitingWifiPermission = false
            onContinue(selected, filesTreeUri)
        }
    }

    fun continueToTransfer() {
        val wifiPermissions = PermissionUtils.wifiPermissions()
        if (PermissionUtils.hasAll(context, wifiPermissions)) {
            onContinue(selected, filesTreeUri)
        } else {
            awaitingWifiPermission = true
            wifiPermissionLauncher.launch(wifiPermissions.toTypedArray())
        }
    }

    fun toggle(category: DataCategory) {
        if (selected.contains(category)) {
            selected = selected - category
            if (category == DataCategory.FILES) filesTreeUri = null
            return
        }
        if (category == DataCategory.FILES) {
            folderPickerLauncher.launch(null)
            return
        }
        val needed = category.readPermissions()
        if (needed.isEmpty() || PermissionUtils.hasAll(context, needed)) {
            selected = selected + category
        } else {
            pendingPermissionCategory = category
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Choose what to send") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
        bottomBar = {
            Column(modifier = Modifier.padding(24.dp)) {
                Button(
                    onClick = { continueToTransfer() },
                    enabled = selected.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Text(if (selected.isEmpty()) "Select at least one category" else "Continue")
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }
            items(DataCategory.entries) { category ->
                CategoryRow(
                    category = category,
                    checked = selected.contains(category),
                    subtitleOverride = if (category == DataCategory.FILES && filesTreeUri != null) "Folder selected" else null,
                    onToggle = { toggle(category) },
                )
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun CategoryRow(
    category: DataCategory,
    checked: Boolean,
    subtitleOverride: String?,
    onToggle: () -> Unit,
) {
    Card(
        onClick = onToggle,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (checked) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = category.icon(),
                contentDescription = null,
                tint = if (checked) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(modifier = Modifier.padding(start = 16.dp).weight(1f)) {
                Text(text = category.label, style = MaterialTheme.typography.titleMedium)
                Text(
                    text = subtitleOverride ?: category.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (checked) {
                Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            } else {
                Checkbox(checked = false, onCheckedChange = { onToggle() })
            }
        }
    }
}
