package com.voidhub.phonemigrate.collectors

import com.voidhub.phonemigrate.data.model.DataCategory

object CollectorRegistry {
    fun forCategory(category: DataCategory): DataCollector = when (category) {
        DataCategory.CONTACTS -> ContactsCollector()
        DataCategory.PHOTOS -> MediaCollector(DataCategory.PHOTOS)
        DataCategory.VIDEOS -> MediaCollector(DataCategory.VIDEOS)
        DataCategory.AUDIO -> MediaCollector(DataCategory.AUDIO)
        DataCategory.CALL_LOG -> CallLogCollector()
        DataCategory.FILES -> FileCollector()
    }
}
