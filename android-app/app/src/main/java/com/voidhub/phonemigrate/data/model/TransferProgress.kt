package com.voidhub.phonemigrate.data.model

enum class TransferPhase {
    IDLE,
    PREPARING,
    WAITING_FOR_PEER,
    CONNECTING,
    HANDSHAKE,
    TRANSFERRING,
    COMPLETED,
    FAILED,
    CANCELLED,
}

data class CategoryProgress(
    val category: DataCategory,
    val totalItems: Int,
    val completedItems: Int,
    val totalBytes: Long,
    val transferredBytes: Long,
)

data class TransferProgress(
    val phase: TransferPhase = TransferPhase.IDLE,
    val statusMessage: String = "",
    val perCategory: List<CategoryProgress> = emptyList(),
    val currentItemName: String? = null,
    val overallTransferredBytes: Long = 0L,
    val overallTotalBytes: Long = 0L,
    val itemsFailed: List<String> = emptyList(),
    val errorMessage: String? = null,
) {
    val overallFraction: Float
        get() = if (overallTotalBytes <= 0L) 0f else (overallTransferredBytes.toFloat() / overallTotalBytes).coerceIn(0f, 1f)
}
