package com.example.smartparkingoperator.data.repository

import com.example.smartparkingoperator.data.network.ConnectivityObserver
import com.example.smartparkingoperator.data.remote.ApiService
import com.example.smartparkingoperator.data.remote.dto.LoginRequest
import com.example.smartparkingoperator.data.security.SecureSessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository(
    private val apiService: ApiService,
    private val sessionManager: SecureSessionManager,
    private val connectivityObserver: ConnectivityObserver,
    private val parkingRepository: ParkingRepository
) {
    suspend fun login(username: String, password: String): Result<Boolean> = withContext(Dispatchers.IO) {
        val trimmedUser = username.trim()
        val isOnline = connectivityObserver.isConnected()

        if (!isOnline) {
            // Offline verification using cached session/token
            if (sessionManager.isLoggedIn()) {
                val cachedUser = sessionManager.getOperatorUsername()
                if (cachedUser.equals(trimmedUser, ignoreCase = true) || cachedUser.isNullOrBlank()) {
                    return@withContext Result.success(true)
                }
            }
            return@withContext Result.failure(Exception("Device is offline. No matching cached session found."))
        }

        // Online authentication
        try {
            val response = apiService.login(LoginRequest(trimmedUser, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                sessionManager.saveSession(
                    token = body.accessToken,
                    operatorId = body.operatorId,
                    operatorUsername = body.username,
                    role = body.role
                )
                // Opportunistically populate local cache
                parkingRepository.refreshLocationAndRates()
                Result.success(true)
            } else {
                val err = response.errorBody()?.string() ?: "Invalid username or password"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            // If network call failed (e.g. server down or timeout), check cached session fallback
            if (sessionManager.isLoggedIn() && sessionManager.getOperatorUsername().equals(trimmedUser, ignoreCase = true)) {
                Result.success(true)
            } else {
                Result.failure(Exception(e.localizedMessage ?: "Network error during login"))
            }
        }
    }

    fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()

    fun getOperatorUsername(): String = sessionManager.getOperatorUsername() ?: "Operator"

    fun logout() {
        sessionManager.clearSession()
    }
}
