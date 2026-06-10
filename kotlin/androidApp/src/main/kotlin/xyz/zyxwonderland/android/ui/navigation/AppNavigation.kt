package xyz.zyxwonderland.android.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import xyz.zyxwonderland.android.ui.chess.ChessScreen
import xyz.zyxwonderland.android.ui.status.StatusScreen

private sealed class Screen(
    val route: String,
    val label: String,
) {
    data object Chess : Screen("chess", "Chess")

    data object Status : Screen("status", "Status")
}

private val SCREENS = listOf(Screen.Chess, Screen.Status)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDest = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar {
                SCREENS.forEach { screen ->
                    NavigationBarItem(
                        icon = {
                            Icon(
                                imageVector =
                                    when (screen) {
                                        Screen.Chess -> Icons.Filled.Star
                                        Screen.Status -> Icons.Filled.CheckCircle
                                    },
                                contentDescription = screen.label,
                            )
                        },
                        label = { Text(screen.label) },
                        selected = currentDest?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                    )
                }
            }
        },
    ) { inner ->
        NavHost(
            navController = navController,
            startDestination = Screen.Chess.route,
            modifier = Modifier.padding(inner),
        ) {
            composable(Screen.Chess.route) { ChessScreen() }
            composable(Screen.Status.route) { StatusScreen() }
        }
    }
}
