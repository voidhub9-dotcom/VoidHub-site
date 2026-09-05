package com.voidhub.phonemigrate.writers

import android.content.Context
import android.net.Uri
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem

/** Receives one item's decrypted bytes, in order, then is told whether the transfer checked out. */
interface ItemSink {
    fun write(bytes: ByteArray, length: Int)

    /** Called once all bytes arrived and the sha256 matched. Persists the item for real. */
    fun commit()

    /** Called on any failure (checksum mismatch, I/O error, cancellation). Discards partial data. */
    fun abort()
}

interface DataWriter {
    val category: DataCategory

    /**
     * [treeUri] is the user-picked destination folder for [DataCategory.FILES]; ignored otherwise.
     */
    fun beginItem(context: Context, item: ManifestItem, treeUri: Uri?): ItemSink
}
