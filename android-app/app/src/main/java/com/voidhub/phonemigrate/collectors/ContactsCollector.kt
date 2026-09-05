package com.voidhub.phonemigrate.collectors

import android.content.Context
import android.net.Uri
import android.provider.ContactsContract
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.ByteArrayInputStream

/**
 * Exports every contact as a vCard using the platform's own vCard generator
 * ([ContactsContract.Contacts.CONTENT_VCARD_URI]), so photos and every recognized field
 * come along without us hand-rolling the format on this side.
 */
class ContactsCollector : DataCollector {
    override val category = DataCategory.CONTACTS

    override fun collect(context: Context, treeUri: Uri?): List<CollectedItem> {
        val resolver = context.contentResolver
        val items = mutableListOf<CollectedItem>()

        val cursor = resolver.query(
            ContactsContract.Contacts.CONTENT_URI,
            arrayOf(
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.LOOKUP_KEY,
                ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
            ),
            null,
            null,
            ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
        )

        cursor?.use { c ->
            val lookupIdx = c.getColumnIndexOrThrow(ContactsContract.Contacts.LOOKUP_KEY)
            val nameIdx = c.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)
            while (c.moveToNext()) {
                val lookupKey = c.getString(lookupIdx) ?: continue
                val name = c.getString(nameIdx) ?: "Contact"
                val vcardUri = Uri.withAppendedPath(ContactsContract.Contacts.CONTENT_VCARD_URI, lookupKey)
                val bytes = runCatching {
                    resolver.openInputStream(vcardUri)?.use { it.readBytes() }
                }.getOrNull() ?: continue
                if (bytes.isEmpty()) continue

                val manifestItem = ManifestItem(
                    id = "contact_$lookupKey",
                    category = category,
                    displayName = name,
                    mimeType = "text/x-vcard",
                    sizeBytes = bytes.size.toLong(),
                )
                items += CollectedItem(manifestItem) { ByteArrayInputStream(bytes) }
            }
        }
        return items
    }
}
