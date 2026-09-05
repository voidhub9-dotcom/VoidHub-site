package com.voidhub.phonemigrate.collectors

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.FileNotFoundException

/** Walks a user-picked SAF folder tree and lists every regular file under it, recursively. */
class FileCollector : DataCollector {
    override val category = DataCategory.FILES

    override fun collect(context: Context, treeUri: Uri?): List<CollectedItem> {
        if (treeUri == null) return emptyList()
        val root = DocumentFile.fromTreeUri(context, treeUri) ?: return emptyList()
        val items = mutableListOf<CollectedItem>()
        walk(context, root, "", items)
        return items
    }

    private fun walk(context: Context, dir: DocumentFile, relativePrefix: String, out: MutableList<CollectedItem>) {
        val children = dir.listFiles()
        for (child in children) {
            val name = child.name ?: continue
            val relativePath = if (relativePrefix.isEmpty()) name else "$relativePrefix/$name"
            if (child.isDirectory) {
                walk(context, child, relativePath, out)
            } else if (child.isFile) {
                val size = child.length()
                if (size <= 0L) continue
                val uri = child.uri
                val manifestItem = ManifestItem(
                    id = "file_${uri.hashCode()}_$relativePath",
                    category = category,
                    displayName = name,
                    mimeType = child.type ?: "application/octet-stream",
                    sizeBytes = size,
                    relativePath = relativePath,
                )
                out += CollectedItem(manifestItem) {
                    context.contentResolver.openInputStream(uri) ?: throw FileNotFoundException(uri.toString())
                }
            }
        }
    }
}
