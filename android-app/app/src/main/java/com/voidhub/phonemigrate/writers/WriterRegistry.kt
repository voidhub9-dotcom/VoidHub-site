package com.voidhub.phonemigrate.writers

import com.voidhub.phonemigrate.data.model.DataCategory

object WriterRegistry {
    fun forCategory(category: DataCategory): DataWriter = when (category) {
        DataCategory.CONTACTS -> ContactsWriter()
        DataCategory.PHOTOS -> MediaWriter(DataCategory.PHOTOS)
        DataCategory.VIDEOS -> MediaWriter(DataCategory.VIDEOS)
        DataCategory.AUDIO -> MediaWriter(DataCategory.AUDIO)
        DataCategory.CALL_LOG -> CallLogWriter()
        DataCategory.FILES -> FileWriter()
    }
}
