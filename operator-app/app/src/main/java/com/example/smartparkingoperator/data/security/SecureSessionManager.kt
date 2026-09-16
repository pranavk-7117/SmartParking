package com.example.smartparkingoperator.data.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Manages operator authentication tokens securely using EncryptedSharedPreferences
 * backed by Android Keystore (AES-256 GCM). Never stores tokens in plain SQLite.
 */
class SecureSessionManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        PREFS_FILENAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveSession(token: String, operatorId: String, operatorUsername: String, role: String) {
        sharedPreferences.edit()
            .putString(KEY_AUTH_TOKEN, token)
            .putString(KEY_OPERATOR_ID, operatorId)
            .putString(KEY_OPERATOR_USERNAME, operatorUsername)
            .putString(KEY_OPERATOR_ROLE, role)
            .apply()
    }

    fun getAuthToken(): String? = sharedPreferences.getString(KEY_AUTH_TOKEN, null)

    fun getOperatorId(): String? = sharedPreferences.getString(KEY_OPERATOR_ID, null)

    fun getOperatorUsername(): String? = sharedPreferences.getString(KEY_OPERATOR_USERNAME, null)

    fun getOperatorRole(): String? = sharedPreferences.getString(KEY_OPERATOR_ROLE, null)

    fun isLoggedIn(): Boolean = !getAuthToken().isNullOrBlank()

    fun clearSession() {
        sharedPreferences.edit().clear().apply()
    }

    companion object {
        private const val PREFS_FILENAME = "operator_secure_prefs"
        private const val KEY_AUTH_TOKEN = "jwt_access_token"
        private const val KEY_OPERATOR_ID = "operator_id"
        private const val KEY_OPERATOR_USERNAME = "operator_username"
        private const val KEY_OPERATOR_ROLE = "operator_role"
    }
}
