package com.voidhub.phonemigrate.writers

import android.content.ContentProviderOperation
import android.content.Context
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log
import com.voidhub.phonemigrate.data.model.DataCategory
import com.voidhub.phonemigrate.data.model.ManifestItem
import java.io.ByteArrayOutputStream

private const val TAG = "ContactsWriter"

/** Buffers one contact's vCard text, then inserts it as a phone-only (no-account) raw contact. */
class ContactsWriter : DataWriter {
    override val category = DataCategory.CONTACTS

    override fun beginItem(context: Context, item: ManifestItem, treeUri: Uri?): ItemSink {
        val buffer = ByteArrayOutputStream(item.sizeBytes.toInt().coerceAtLeast(16))

        return object : ItemSink {
            override fun write(bytes: ByteArray, length: Int) = buffer.write(bytes, 0, length)

            override fun commit() {
                val parsed = runCatching {
                    VCardParser.parseOne(buffer.toString(Charsets.UTF_8.name()))
                }.getOrElse {
                    Log.w(TAG, "Failed to parse vCard for ${item.displayName}", it)
                    return
                } ?: return

                val ops = ArrayList<ContentProviderOperation>()
                ops += ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                    .build()

                if (parsed.givenName != null || parsed.familyName != null || parsed.displayName != null) {
                    ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, parsed.givenName)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME, parsed.familyName)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, parsed.displayName)
                        .build()
                }

                parsed.phones.forEach { (number, type) ->
                    ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, number)
                        .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, phoneTypeFor(type))
                        .build()
                }

                parsed.emails.forEach { (address, type) ->
                    ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.Email.ADDRESS, address)
                        .withValue(ContactsContract.CommonDataKinds.Email.TYPE, emailTypeFor(type))
                        .build()
                }

                parsed.organization?.let { org ->
                    ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, org)
                        .build()
                }

                parsed.photoBytes?.let { photo ->
                    ops += ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Photo.CONTENT_ITEM_TYPE)
                        .withValue(ContactsContract.CommonDataKinds.Photo.PHOTO, photo)
                        .build()
                }

                runCatching {
                    context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
                }.onFailure { Log.w(TAG, "Failed to insert contact ${item.displayName}", it) }
            }

            override fun abort() {
                buffer.reset()
            }
        }
    }

    private fun phoneTypeFor(label: String): Int = when (label.uppercase()) {
        "HOME" -> ContactsContract.CommonDataKinds.Phone.TYPE_HOME
        "WORK" -> ContactsContract.CommonDataKinds.Phone.TYPE_WORK
        "CELL", "MOBILE" -> ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
        "FAX" -> ContactsContract.CommonDataKinds.Phone.TYPE_FAX_HOME
        else -> ContactsContract.CommonDataKinds.Phone.TYPE_OTHER
    }

    private fun emailTypeFor(label: String): Int = when (label.uppercase()) {
        "HOME" -> ContactsContract.CommonDataKinds.Email.TYPE_HOME
        "WORK" -> ContactsContract.CommonDataKinds.Email.TYPE_WORK
        else -> ContactsContract.CommonDataKinds.Email.TYPE_OTHER
    }
}
