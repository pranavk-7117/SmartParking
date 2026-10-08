package com.example.smartparkingoperator.data.repository

import com.example.smartparkingoperator.data.network.ConnectivityObserver
import com.example.smartparkingoperator.data.remote.ApiService
import com.example.smartparkingoperator.data.remote.dto.ChangePasswordRequest
import com.example.smartparkingoperator.data.remote.dto.LoginRequest
import com.example.smartparkingoperator.data.remote.dto.OperatorProfileDto
import com.example.smartparkingoperator.data.remote.dto.UpdateProfileRequest
import com.example.smartparkingoperator.data.security.SecureSessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
                // Opportunistically populate local cache with clean location state
                parkingRepository.clearLocalLocationCache()
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

    suspend fun getProfile(): OperatorProfileDto? = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getProfile()
            if (response.isSuccessful) response.body() else null
        } catch (e: Exception) {
            null
        }
    }

    suspend fun updateProfile(
        name: String?,
        username: String?,
        contact: String?,
        email: String?,
        employeeId: String?,
        shiftTime: String?,
        notes: String?
    ): Result<OperatorProfileDto> = withContext(Dispatchers.IO) {
        try {
            val request = UpdateProfileRequest(
                name = name?.ifBlank { null },
                username = username?.ifBlank { null },
                contact = contact?.ifBlank { null },
                email = email?.ifBlank { null },
                employeeId = employeeId?.ifBlank { null },
                shiftTime = shiftTime?.ifBlank { null },
                notes = notes?.ifBlank { null }
            )
            val response = apiService.updateProfile(request)
            if (response.isSuccessful && response.body() != null) {
                // Update cached username if changed
                response.body()!!.username?.let { sessionManager.saveOperatorUsername(it) }
                Result.success(response.body()!!)
            } else {
                val rawErr = response.errorBody()?.string()
                val err = parseErrorMessage(rawErr, "Failed to update profile")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(Exception(e.localizedMessage ?: "Network error"))
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = ChangePasswordRequest(currentPassword = currentPassword, newPassword = newPassword)
            val response = apiService.changePassword(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val rawErr = response.errorBody()?.string()
                val err = parseErrorMessage(rawErr, "Failed to change password")
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(Exception(e.localizedMessage ?: "Network error"))
        }
    }

    private fun parseErrorMessage(rawError: String?, fallback: String): String {
        if (rawError.isNullOrBlank()) return fallback
        return try {
            val json = org.json.JSONObject(rawError)
            when {
                json.has("error") -> {
                    val errVal = json.getString("error")
                    if (json.has("details")) {
                        val detailsArr = json.getJSONArray("details")
                        val detailsList = mutableListOf<String>()
                        for (i in 0 until detailsArr.length()) {
                            val item = detailsArr.getJSONObject(i)
                            val field = item.optString("field")
                            val msg = item.optString("message")
                            if (field.isNotBlank() && msg.isNotBlank()) {
                                detailsList.add("$field: $msg")
                            } else if (msg.isNotBlank()) {
                                detailsList.add(msg)
                            }
                        }
                        if (detailsList.isNotEmpty()) {
                            "$errVal (${detailsList.joinToString(", ")})"
                        } else {
                            errVal
                        }
                    } else {
                        errVal
                    }
                }
                json.has("message") -> json.getString("message")
                else -> rawError
            }
        } catch (_: Exception) {
            rawError
        }
    }

    fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()

    fun getOperatorUsername(): String = sessionManager.getOperatorUsername() ?: "Operator"

    fun logout() {
        sessionManager.clearSession()
        kotlinx.coroutines.CoroutineScope(Dispatchers.IO).launch {
            try {
                parkingRepository.clearLocalLocationCache()
            } catch (_: Exception) {}
        }
    }
}

