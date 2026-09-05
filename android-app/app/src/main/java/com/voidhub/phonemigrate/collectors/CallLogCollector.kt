package com.voidhub.phonemigrate.collectors

import android.content.Context
import android.net.Uri
import android.provider.CallLog
import com.voidhub.phonemigrate.data.model.CallRecord
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import com.voidhub.phonemigrate.network.Protocol
import kotlinx.serialization.encodeToString
import java.io.ByteArrayInputStream

/**
 * Call history is small per-row and there can be thousands of rows, so unlike media it's
 * packed into a single JSON-array item instead of one manifest entry per call.
 */
class CallLogCollector : DataCollector {
    override val category = DataCategory.CALL_LOG

    override fun collect(context: Context, treeUri: Uri?): List<CollectedItem> {
        val resolver = context.contentResolver
        val records = mutableListOf<CallRecord>()

        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.CACHED_NAME,
            CallLog.Calls.TYPE,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION,
        )

        resolver.query(CallLog.Calls.CONTENT_URI, projection, null, null, CallLog.Calls.DATE + " DESC")?.use { c ->
            val numberIdx = c.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
            val nameIdx = c.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
            val typeIdx = c.getColumnIndexOrThrow(CallLog.Calls.TYPE)
            val dateIdx = c.getColumnIndexOrThrow(CallLog.Calls.DATE)
            val durationIdx = c.getColumnIndexOrThrow(CallLog.Calls.DURATION)

            while (c.moveToNext()) {
                records += CallRecord(
                    number = c.getString(numberIdx) ?: continue,
                    name = c.getString(nameIdx),
                    type = c.getInt(typeIdx),
                    date = c.getLong(dateIdx),
                    durationSeconds = c.getLong(durationIdx),
                )
            }
        }

        if (records.isEmpty()) return emptyList()

        val bytes = Protocol.json.encodeToString(records).toByteArray(Charsets.UTF_8)
        val manifestItem = ManifestItem(
            id = "call_log_export",
            category = category,
            displayName = "Call history (${records.size})",
            mimeType = "application/json",
            sizeBytes = bytes.size.toLong(),
        )
        return listOf(CollectedItem(manifestItem) { ByteArrayInputStream(bytes) })
    }
}
