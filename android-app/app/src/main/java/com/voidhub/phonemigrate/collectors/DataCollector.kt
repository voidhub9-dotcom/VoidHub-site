package com.voidhub.phonemigrate.collectors

import android.content.Context
import android.net.Uri
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.InputStream

/** A manifest entry paired with a factory for the bytes behind it, opened lazily at send time. */
data class CollectedItem(
    val manifestItem: ManifestItem,
    val openStream: () -> InputStream,
)

interface DataCollector {
    val category: DataCategory

    /**
     * Reads whatever is needed to describe (not yet transfer) this category's items.
     * [treeUri] is the user-picked folder for [DataCategory.FILES]; ignored otherwise.
     */
    fun collect(context: Context, treeUri: Uri?): List<CollectedItem>
}
