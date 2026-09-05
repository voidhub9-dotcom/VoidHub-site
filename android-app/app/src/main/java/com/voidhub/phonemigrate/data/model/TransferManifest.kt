package com.voidhub.phonemigrate.data.model

import kotlinx.serialization.Serializable

/**
 * One unit of data to move: a contact card, a call-log entry, or a media/document file.
 * [sizeBytes] and [sha256] describe the payload frame that follows this entry on the wire.
 */
@Serializable
data class ManifestItem(
    val id: String,
    val category: DataCategory,
    val displayName: String,
    val mimeType: String,
    val sizeBytes: Long,
    /** Relative sub-path under the category's destination, e.g. "Camera/IMG_1.jpg". Empty for contacts/call log rows. */
    val relativePath: String = "",
)

@Serializable
data class TransferManifest(
    val deviceName: String,
    val items: List<ManifestItem>,
) {
    val totalBytes: Long get() = items.sumOf { it.sizeBytes }
    fun itemsFor(category: DataCategory): List<ManifestItem> = items.filter { it.category == category }
}
