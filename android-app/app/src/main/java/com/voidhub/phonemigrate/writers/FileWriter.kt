package com.voidhub.phonemigrate.writers

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.IOException

/** Recreates the sender's relative folder structure under the receiver's chosen SAF tree. */
class FileWriter : DataWriter {
    override val category = DataCategory.FILES

    override fun beginItem(context: Context, item: ManifestItem, treeUri: Uri?): ItemSink {
        requireNotNull(treeUri) { "FILES transfer requires a destination folder" }
        val root = DocumentFile.fromTreeUri(context, treeUri)
            ?: throw IOException("Destination folder is no longer accessible")

        val segments = item.relativePath.split('/').filter { it.isNotBlank() }
        val fileName = segments.lastOrNull() ?: item.displayName
        val dirSegments = segments.dropLast(1)

        var dir = root
        for (segment in dirSegments) {
            dir = dir.findFile(segment)?.takeIf { it.isDirectory }
                ?: dir.createDirectory(segment)
                ?: throw IOException("Could not create folder $segment")
        }

        dir.findFile(fileName)?.delete()
        val target = dir.createFile(item.mimeType.ifBlank { "application/octet-stream" }, fileName)
            ?: throw IOException("Could not create file $fileName")
        val out = context.contentResolver.openOutputStream(target.uri)
            ?: throw IOException("Could not open output stream for ${target.uri}")

        return object : ItemSink {
            override fun write(bytes: ByteArray, length: Int) = out.write(bytes, 0, length)

            override fun commit() {
                out.flush()
                out.close()
            }

            override fun abort() {
                runCatching { out.close() }
                runCatching { target.delete() }
            }
        }
    }
}
