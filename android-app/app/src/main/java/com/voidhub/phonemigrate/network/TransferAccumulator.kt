package com.voidhub.phonemigrate.network

import com.voidhub.phonemigrate.data.model.CategoryProgress
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import com.voidhub.phonemigrate.data.model.TransferPhase
import com.voidhub.phonemigrate.data.model.TransferProgress

/** Tracks per-category and overall byte/item counts as a transfer streams, on either end. */
class TransferAccumulator(items: List<ManifestItem>) {
    private data class MutableCategoryState(
        var totalItems: Int,
        var completedItems: Int,
        var totalBytes: Long,
        var transferredBytes: Long,
    )

    private val perCategory: LinkedHashMap<DataCategory, MutableCategoryState> = LinkedHashMap()
    private val overallTotalBytes: Long = items.sumOf { it.sizeBytes }
    private var overallTransferredBytes: Long = 0L
    private var lastEmitMillis = 0L

    init {
        DataCategory.entries.forEach { category ->
            val categoryItems = items.filter { it.category == category }
            if (categoryItems.isNotEmpty()) {
                perCategory[category] = MutableCategoryState(
                    totalItems = categoryItems.size,
                    completedItems = 0,
                    totalBytes = categoryItems.sumOf { it.sizeBytes },
                    transferredBytes = 0L,
                )
            }
        }
    }

    fun addBytes(category: DataCategory, delta: Long) {
        perCategory[category]?.let { it.transferredBytes += delta }
        overallTransferredBytes += delta
    }

    fun markItemDone(category: DataCategory) {
        perCategory[category]?.let { it.completedItems += 1 }
    }

    /** Returns true at most once per ~120ms, so callers can gate UI-facing emits without flooding it. */
    fun shouldEmit(): Boolean {
        val now = System.currentTimeMillis()
        if (now - lastEmitMillis < 120) return false
        lastEmitMillis = now
        return true
    }

    fun snapshot(
        phase: TransferPhase,
        statusMessage: String,
        currentItemName: String? = null,
        itemsFailed: List<String> = emptyList(),
        errorMessage: String? = null,
    ): TransferProgress = TransferProgress(
        phase = phase,
        statusMessage = statusMessage,
        perCategory = perCategory.map { (category, state) ->
            CategoryProgress(category, state.totalItems, state.completedItems, state.totalBytes, state.transferredBytes)
        },
        currentItemName = currentItemName,
        overallTransferredBytes = overallTransferredBytes,
        overallTotalBytes = overallTotalBytes,
        itemsFailed = itemsFailed,
        errorMessage = errorMessage,
    )
}
