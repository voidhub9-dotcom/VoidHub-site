package com.voidhub.phonemigrate.collectors

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.FileNotFoundException

/** Reads image, video or audio entries straight from MediaStore — no full-file read needed to list them. */
class MediaCollector(override val category: DataCategory) : DataCollector {

    init {
        require(category == DataCategory.PHOTOS || category == DataCategory.VIDEOS || category == DataCategory.AUDIO) {
            "MediaCollector does not support $category"
        }
    }

    private val collectionUri: Uri
        get() = when (category) {
            DataCategory.PHOTOS -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            DataCategory.VIDEOS -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            DataCategory.AUDIO -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
            else -> error("unreachable")
        }

    override fun collect(context: Context, treeUri: Uri?): List<CollectedItem> {
        val resolver = context.contentResolver
        val items = mutableListOf<CollectedItem>()

        val projection = arrayOf(
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.MIME_TYPE,
            MediaStore.MediaColumns.RELATIVE_PATH,
        )

        resolver.query(collectionUri, projection, null, null, null)?.use { c ->
            val idIdx = c.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)
            val nameIdx = c.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
            val sizeIdx = c.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
            val mimeIdx = c.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE)
            val pathIdx = c.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH)

            while (c.moveToNext()) {
                val id = c.getLong(idIdx)
                val name = c.getString(nameIdx) ?: "file_$id"
                val size = c.getLong(sizeIdx)
                val mime = c.getString(mimeIdx) ?: defaultMimeType()
                val relativePath = if (pathIdx >= 0) c.getString(pathIdx).orEmpty() else ""
                if (size <= 0L) continue

                val contentUri = ContentUris.withAppendedId(collectionUri, id)
                val manifestItem = ManifestItem(
                    id = "media_${category.name.lowercase()}_$id",
                    category = category,
                    displayName = name,
                    mimeType = mime,
                    sizeBytes = size,
                    relativePath = relativePath,
                )
                items += CollectedItem(manifestItem) {
                    resolver.openInputStream(contentUri) ?: throw FileNotFoundException(contentUri.toString())
                }
            }
        }
        return items
    }

    private fun defaultMimeType(): String = when (category) {
        DataCategory.PHOTOS -> "image/*"
        DataCategory.VIDEOS -> "video/*"
        DataCategory.AUDIO -> "audio/*"
        else -> "application/octet-stream"
    }
}
