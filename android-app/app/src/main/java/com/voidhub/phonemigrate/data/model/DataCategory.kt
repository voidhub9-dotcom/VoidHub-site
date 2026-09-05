package com.voidhub.phonemigrate.data.model

import android.Manifest
import android.os.Build
import kotlinx.serialization.Serializable

/**
 * The kinds of data PhoneMigrate can move between two Android phones without root.
 * App-private data (WhatsApp history, other apps' storage, system settings) is out of
 * reach for a normal third-party app on stock Android, so it is intentionally not listed.
 */
@Serializable
enum class DataCategory(
    val label: String,
    val description: String,
) {
    CONTACTS(
        label = "Contacts",
        description = "Names, numbers, emails and photos from your address book",
    ),
    PHOTOS(
        label = "Photos",
        description = "Images from your camera roll and galleries",
    ),
    VIDEOS(
        label = "Videos",
        description = "Video files from your camera roll and galleries",
    ),
    AUDIO(
        label = "Audio",
        description = "Music, recordings and other audio files",
    ),
    CALL_LOG(
        label = "Call history",
        description = "Recent calls, numbers and timestamps",
    ),
    FILES(
        label = "Files",
        description = "A folder you pick — documents, downloads, anything else",
    );

    /** Runtime permissions this category needs to be read on the sending phone. */
    fun readPermissions(): List<String> = when (this) {
        CONTACTS -> listOf(Manifest.permission.READ_CONTACTS)
        PHOTOS -> if (Build.VERSION.SDK_INT >= 33) {
            listOf(Manifest.permission.READ_MEDIA_IMAGES)
        } else {
            listOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        VIDEOS -> if (Build.VERSION.SDK_INT >= 33) {
            listOf(Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            listOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        AUDIO -> if (Build.VERSION.SDK_INT >= 33) {
            listOf(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            listOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        CALL_LOG -> listOf(Manifest.permission.READ_CALL_LOG)
        FILES -> emptyList() // Granted per-tree via the Storage Access Framework, not a runtime permission.
    }

    /** Runtime permissions this category needs to be written on the receiving phone. */
    fun writePermissions(): List<String> = when (this) {
        CONTACTS -> listOf(Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS)
        CALL_LOG -> listOf(Manifest.permission.READ_CALL_LOG, Manifest.permission.WRITE_CALL_LOG)
        PHOTOS, VIDEOS, AUDIO -> if (Build.VERSION.SDK_INT < 29) {
            // Scoped storage (API 29+) lets MediaStore inserts skip this; older platforms still need it.
            listOf(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        } else {
            emptyList()
        }
        FILES -> emptyList() // Granted per-tree via the Storage Access Framework, not a runtime permission.
    }
}
