package com.example.smartparkingoperator.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.smartparkingoperator.AppContainer
import com.example.smartparkingoperator.ui.screens.entry.CaptureEntryScreen
import com.example.smartparkingoperator.ui.screens.exit.CaptureExitScreen
import com.example.smartparkingoperator.ui.screens.home.HomeScreen
import com.example.smartparkingoperator.ui.screens.login.LoginScreen
import com.example.smartparkingoperator.ui.screens.sessions.ActiveSessionsScreen

object Destinations {
    const val LOGIN = "login"
    const val HOME = "home"
    const val ENTRY = "entry"
    const val EXIT = "exit?sessionId={sessionId}"
    const val SESSIONS = "sessions"

    fun exitWithSession(sessionId: String? = null): String =
        if (sessionId.isNullOrBlank()) "exit?sessionId=" else "exit?sessionId=$sessionId"
}

@Composable
fun AppNavigation(
    container: AppContainer,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController()
) {
    val startDestination = if (container.sessionManager.isLoggedIn()) {
        Destinations.HOME
    } else {
        Destinations.LOGIN
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Destinations.LOGIN) {
            LoginScreen(
                authRepository = container.authRepository,
                onLoginSuccess = {
                    navController.navigate(Destinations.HOME) {
                        popUpTo(Destinations.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Destinations.HOME) {
            HomeScreen(
                parkingRepository = container.parkingRepository,
                authRepository = container.authRepository,
                connectivityObserver = container.connectivityObserver,
                onNavigateToEntry = { navController.navigate(Destinations.ENTRY) },
                onNavigateToExit = { navController.navigate(Destinations.exitWithSession()) },
                onNavigateToSessions = { navController.navigate(Destinations.SESSIONS) },
                onLogout = {
                    container.authRepository.logout()
                    navController.navigate(Destinations.LOGIN) {
                        popUpTo(Destinations.HOME) { inclusive = true }
                    }
                }
            )
        }

        composable(Destinations.ENTRY) {
            CaptureEntryScreen(
                parkingRepository = container.parkingRepository,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Destinations.EXIT,
            arguments = listOf(
                navArgument("sessionId") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val sessionId = backStackEntry.arguments?.getString("sessionId")
            CaptureExitScreen(
                parkingRepository = container.parkingRepository,
                initialSessionId = if (sessionId.isNullOrBlank()) null else sessionId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Destinations.SESSIONS) {
            ActiveSessionsScreen(
                parkingRepository = container.parkingRepository,
                onNavigateBack = { navController.popBackStack() },
                onSelectSessionForExit = { sessionId ->
                    navController.navigate(Destinations.exitWithSession(sessionId))
                }
            )
        }
    }
}
