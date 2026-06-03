package xyz.zyxwonderland.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import xyz.zyxwonderland.android.ui.navigation.AppNavigation
import xyz.zyxwonderland.android.ui.theme.WunderlandTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            WunderlandTheme {
                AppNavigation()
            }
        }
    }
}
