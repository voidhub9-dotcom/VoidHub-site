package com.voidhub.phonemigrate.data.model

import kotlinx.serialization.Serializable

@Serializable
data class CallRecord(
    val number: String,
    val name: String?,
    val type: Int,
    val date: Long,
    val durationSeconds: Long,
)
