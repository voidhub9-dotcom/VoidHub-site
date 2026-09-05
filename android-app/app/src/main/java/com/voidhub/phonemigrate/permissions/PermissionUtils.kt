package com.voidhub.phonemigrate.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

object PermissionUtils {

    fun hasAll(context: Context, permissions: List<String>): Boolean =
        permissions.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }

    fun missing(context: Context, permissions: List<String>): List<String> =
        permissions.filter { ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED }

    /** Needed to create/join a local Wi-Fi hotspot; the exact permission depends on API level. */
    fun wifiPermissions(): List<String> = if (Build.VERSION.SDK_INT >= 33) {
        listOf(Manifest.permission.NEARBY_WIFI_DEVICES, Manifest.permission.ACCESS_FINE_LOCATION)
    } else {
        listOf(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    fun cameraPermission(): List<String> = listOf(Manifest.permission.CAMERA)

    fun notificationPermission(): List<String> = if (Build.VERSION.SDK_INT >= 33) {
        listOf(Manifest.permission.POST_NOTIFICATIONS)
    } else {
        emptyList()
    }
}
