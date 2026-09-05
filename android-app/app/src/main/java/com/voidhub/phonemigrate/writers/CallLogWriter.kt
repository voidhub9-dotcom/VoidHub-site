package com.voidhub.phonemigrate.writers

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.provider.CallLog
import android.util.Log
import com.voidhub.phonemigrate.data.model.CallRecord
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import com.voidhub.phonemigrate.network.Protocol
import kotlinx.serialization.decodeFromString
import java.io.ByteArrayOutputStream

private const val TAG = "CallLogWriter"

/** The whole call-log export arrives as one JSON-array item; buffer it, then bulk-insert. */
class CallLogWriter : DataWriter {
    override val category = DataCategory.CALL_LOG

    override fun beginItem(context: Context, item: ManifestItem, treeUri: Uri?): ItemSink {
        val buffer = ByteArrayOutputStream(item.sizeBytes.toInt().coerceAtLeast(16))

        return object : ItemSink {
            override fun write(bytes: ByteArray, length: Int) = buffer.write(bytes, 0, length)

            override fun commit() {
                val records = runCatching {
                    Protocol.json.decodeFromString<List<CallRecord>>(buffer.toString(Charsets.UTF_8.name()))
                }.getOrElse {
                    Log.w(TAG, "Failed to parse call log export", it)
                    return
                }

                val values = records.map { record ->
                    ContentValues().apply {
                        put(CallLog.Calls.NUMBER, record.number)
                        put(CallLog.Calls.CACHED_NAME, record.name)
                        put(CallLog.Calls.TYPE, record.type)
                        put(CallLog.Calls.DATE, record.date)
                        put(CallLog.Calls.DURATION, record.durationSeconds)
                        put(CallLog.Calls.NEW, 0)
                    }
                }.toTypedArray()

                runCatching {
                    context.contentResolver.bulkInsert(CallLog.Calls.CONTENT_URI, values)
                }.onFailure { Log.w(TAG, "Failed to insert call log rows", it) }
            }

            override fun abort() {
                buffer.reset()
            }
        }
    }
}
