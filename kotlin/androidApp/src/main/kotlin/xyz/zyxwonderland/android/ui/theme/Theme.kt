package xyz.zyxwonderland.android.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Primary = Color(0xFF7C3AED) // purple-600
private val OnPrimary = Color(0xFFFFFFFF)
private val Secondary = Color(0xFF06B6D4) // cyan-500
private val Background = Color(0xFF0F0F14)
private val Surface = Color(0xFF1A1A2E)
private val OnSurface = Color(0xFFE2E8F0)

private val DarkColors =
    darkColorScheme(
        primary = Primary,
        onPrimary = OnPrimary,
        secondary = Secondary,
        background = Background,
        surface = Surface,
        onSurface = OnSurface,
        onBackground = OnSurface,
    )

private val LightColors =
    lightColorScheme(
        primary = Primary,
        onPrimary = OnPrimary,
        secondary = Secondary,
    )

@Composable
fun WunderlandTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content,
    )
}
