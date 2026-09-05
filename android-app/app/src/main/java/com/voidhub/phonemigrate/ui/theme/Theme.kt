package com.voidhub.phonemigrate.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = Violet40,
    onPrimary = Neutral99,
    primaryContainer = Violet80,
    onPrimaryContainer = Violet20,
    secondary = Teal40,
    onSecondary = Neutral99,
    secondaryContainer = Teal80,
    onSecondaryContainer = Teal20,
    tertiary = Amber40,
    error = Error40,
    background = Neutral99,
    onBackground = Neutral10,
    surface = Neutral99,
    onSurface = Neutral10,
    surfaceVariant = Neutral95,
    onSurfaceVariant = Neutral20,
)

private val DarkColors = darkColorScheme(
    primary = Violet80,
    onPrimary = Violet20,
    primaryContainer = Violet40,
    onPrimaryContainer = Neutral99,
    secondary = Teal80,
    onSecondary = Teal20,
    secondaryContainer = Teal40,
    onSecondaryContainer = Neutral99,
    tertiary = Amber80,
    error = Error80,
    background = SurfaceDark,
    onBackground = Neutral90,
    surface = SurfaceDark,
    onSurface = Neutral90,
    surfaceVariant = SurfaceContainerDark,
    onSurfaceVariant = Neutral90,
)

@Composable
fun PhoneMigrateTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        darkTheme -> DarkColors
        else -> LightColors
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = PhoneMigrateTypography,
        content = content,
    )
}
