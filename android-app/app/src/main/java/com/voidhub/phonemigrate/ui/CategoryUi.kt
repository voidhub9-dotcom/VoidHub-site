package com.voidhub.phonemigrate.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Contacts
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.ui.graphics.vector.ImageVector
import com.voidhub.phonemigrate.data.model.DataCategory

fun DataCategory.icon(): ImageVector = when (this) {
    DataCategory.CONTACTS -> Icons.Filled.Contacts
    DataCategory.PHOTOS -> Icons.Filled.Photo
    DataCategory.VIDEOS -> Icons.Filled.Videocam
    DataCategory.AUDIO -> Icons.Filled.MusicNote
    DataCategory.CALL_LOG -> Icons.Filled.Call
    DataCategory.FILES -> Icons.Filled.Folder
}

fun formatBytes(bytes: Long): String {
    if (bytes < 1024) return "$bytes B"
    val units = listOf("KB", "MB", "GB", "TB")
    var value = bytes.toDouble()
    var unitIndex = -1
    while (value >= 1024 && unitIndex < units.lastIndex) {
        value /= 1024
        unitIndex++
    }
    return "%.1f %s".format(value, units[unitIndex.coerceAtLeast(0)])
}
