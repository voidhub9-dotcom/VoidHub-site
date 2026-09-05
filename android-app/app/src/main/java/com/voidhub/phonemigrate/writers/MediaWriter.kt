package com.voidhub.phonemigrate.writers

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/** Writes photos/videos/audio into MediaStore (API 29+) or the legacy public directories (API 26-28). */
class MediaWriter(override val category: DataCategory) : DataWriter {

    init {
        require(category == DataCategory.PHOTOS || category == DataCategory.VIDEOS || category == DataCategory.AUDIO) {
            "MediaWriter does not support $category"
        }
    }

    override fun beginItem(context: Context, item: ManifestItem, treeUri: Uri?): ItemSink {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            scopedStorageSink(context, item)
        } else {
            legacySink(context, item)
        }
    }

    private fun scopedStorageSink(context: Context, item: ManifestItem): ItemSink {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, item.displayName)
            put(MediaStore.MediaColumns.MIME_TYPE, item.mimeType)
            put(MediaStore.MediaColumns.RELATIVE_PATH, relativeDir())
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
        val itemUri = resolver.insert(collectionUri(), values)
            ?: throw IOException("Could not create MediaStore entry for ${item.displayName}")
        val out = resolver.openOutputStream(itemUri)
            ?: throw IOException("Could not open output stream for $itemUri")

        return object : ItemSink {
            override fun write(bytes: ByteArray, length: Int) = out.write(bytes, 0, length)

            override fun commit() {
                out.flush()
                out.close()
                val done = ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }
                resolver.update(itemUri, done, null, null)
            }

            override fun abort() {
                runCatching { out.close() }
                runCatching { resolver.delete(itemUri, null, null) }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun legacySink(context: Context, item: ManifestItem): ItemSink {
        val baseDir = Environment.getExternalStoragePublicDirectory(publicDirName())
        val destDir = File(baseDir, "PhoneMigrate").apply { mkdirs() }
        val destFile = uniqueFile(destDir, item.displayName)
        val out = FileOutputStream(destFile)

        return object : ItemSink {
            override fun write(bytes: ByteArray, length: Int) = out.write(bytes, 0, length)

            override fun commit() {
                out.flush()
                out.close()
                MediaScannerConnection.scanFile(context, arrayOf(destFile.absolutePath), arrayOf(item.mimeType), null)
            }

            override fun abort() {
                runCatching { out.close() }
                runCatching { destFile.delete() }
            }
        }
    }

    private fun uniqueFile(dir: File, name: String): File {
        var candidate = File(dir, name)
        var counter = 1
        val dot = name.lastIndexOf('.')
        val base = if (dot > 0) name.substring(0, dot) else name
        val ext = if (dot > 0) name.substring(dot) else ""
        while (candidate.exists()) {
            candidate = File(dir, "$base ($counter)$ext")
            counter++
        }
        return candidate
    }

    private fun collectionUri(): Uri = when (category) {
        DataCategory.PHOTOS -> MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        DataCategory.VIDEOS -> MediaStore.Video.Media.EXTERNAL_CONTENT_URI
        DataCategory.AUDIO -> MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        else -> error("unreachable")
    }

    private fun relativeDir(): String = when (category) {
        DataCategory.PHOTOS -> Environment.DIRECTORY_PICTURES + "/PhoneMigrate"
        DataCategory.VIDEOS -> Environment.DIRECTORY_MOVIES + "/PhoneMigrate"
        DataCategory.AUDIO -> Environment.DIRECTORY_MUSIC + "/PhoneMigrate"
        else -> error("unreachable")
    }

    private fun publicDirName(): String = when (category) {
        DataCategory.PHOTOS -> Environment.DIRECTORY_PICTURES
        DataCategory.VIDEOS -> Environment.DIRECTORY_MOVIES
        DataCategory.AUDIO -> Environment.DIRECTORY_MUSIC
        else -> error("unreachable")
    }
}
