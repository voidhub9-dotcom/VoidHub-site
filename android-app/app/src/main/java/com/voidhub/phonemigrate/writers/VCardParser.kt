package com.voidhub.phonemigrate.writers

import android.util.Base64

data class ParsedContact(
    val displayName: String?,
    val givenName: String?,
    val familyName: String?,
    val phones: List<Pair<String, String>>, // value, type label (e.g. "CELL", "HOME")
    val emails: List<Pair<String, String>>,
    val organization: String?,
    val photoBytes: ByteArray?,
)

/**
 * A pragmatic vCard 2.1/3.0 reader for exactly the fields Android's own vCard exporter
 * ([android.provider.ContactsContract.Contacts.CONTENT_VCARD_URI]) produces: N, FN, TEL,
 * EMAIL, ORG and a base64 PHOTO. Not a general-purpose vCard library.
 */
object VCardParser {

    fun parseOne(rawText: String): ParsedContact? {
        val unfolded = unfold(rawText)
        val lines = unfolded.lineSequence().map { it.trim('\r') }.filter { it.isNotBlank() }.toList()

        var displayName: String? = null
        var givenName: String? = null
        var familyName: String? = null
        var organization: String? = null
        var photoBytes: ByteArray? = null
        val phones = mutableListOf<Pair<String, String>>()
        val emails = mutableListOf<Pair<String, String>>()

        for (line in lines) {
            val (propertyRaw, params, value) = splitLine(line) ?: continue
            val property = propertyRaw.substringAfter('.').uppercase()
            val decodedValue = if (isQuotedPrintable(params)) decodeQuotedPrintable(value) else value

            when (property) {
                "FN" -> displayName = decodedValue.unescaped()
                "N" -> {
                    val parts = decodedValue.split(';')
                    familyName = parts.getOrNull(0)?.unescaped()?.ifBlank { null }
                    givenName = parts.getOrNull(1)?.unescaped()?.ifBlank { null }
                }
                "TEL" -> phones += decodedValue.unescaped() to typeLabel(params, "MOBILE")
                "EMAIL" -> emails += decodedValue.unescaped() to typeLabel(params, "HOME")
                "ORG" -> organization = decodedValue.replace(';', ' ').unescaped().ifBlank { null }
                "PHOTO" -> {
                    if (isBase64(params)) {
                        photoBytes = runCatching {
                            Base64.decode(value.replace(Regex("\\s"), ""), Base64.DEFAULT)
                        }.getOrNull()
                    }
                }
            }
        }

        if (displayName == null && givenName == null && familyName == null && phones.isEmpty() && emails.isEmpty()) {
            return null
        }
        return ParsedContact(displayName, givenName, familyName, phones, emails, organization, photoBytes)
    }

    /** vCard line folding: a line starting with a space or tab continues the previous line. */
    private fun unfold(text: String): String =
        text.replace(Regex("\r?\n[ \t]"), "")

    /** Splits "GROUP.NAME;PARAM1;KEY=VAL:VALUE" into (NAME, params, VALUE), respecting the first unescaped colon. */
    private fun splitLine(line: String): Triple<String, List<String>, String>? {
        val colonIndex = findUnescapedColon(line) ?: return null
        val head = line.substring(0, colonIndex)
        val value = line.substring(colonIndex + 1)
        val segments = head.split(';')
        val property = segments.first()
        val params = segments.drop(1)
        return Triple(property, params, value)
    }

    private fun findUnescapedColon(line: String): Int? {
        var i = 0
        while (i < line.length) {
            if (line[i] == '\\') { i += 2; continue }
            if (line[i] == ':') return i
            i++
        }
        return null
    }

    private fun isBase64(params: List<String>): Boolean =
        params.any { it.equals("BASE64", true) || it.equals("ENCODING=BASE64", true) || it.equals("B", true) }

    private fun isQuotedPrintable(params: List<String>): Boolean =
        params.any { it.equals("QUOTED-PRINTABLE", true) || it.equals("ENCODING=QUOTED-PRINTABLE", true) }

    private fun typeLabel(params: List<String>, fallback: String): String {
        val typeParam = params.firstOrNull { it.startsWith("TYPE=", true) }?.substringAfter('=')
        val bareType = params.firstOrNull { !it.contains('=') && !it.equals("PREF", true) }
        return (typeParam ?: bareType ?: fallback).uppercase()
    }

    private fun decodeQuotedPrintable(value: String): String {
        val out = StringBuilder()
        var i = 0
        while (i < value.length) {
            val ch = value[i]
            if (ch == '=' && i + 2 < value.length) {
                val hex = value.substring(i + 1, i + 3)
                val byte = hex.toIntOrNull(16)
                if (byte != null) {
                    out.append(byte.toChar())
                    i += 3
                    continue
                }
            }
            out.append(ch)
            i++
        }
        return out.toString()
    }

    private fun String.unescaped(): String =
        replace("\\,", ",").replace("\\;", ";").replace("\\n", " ").replace("\\\\", "\\")
}
