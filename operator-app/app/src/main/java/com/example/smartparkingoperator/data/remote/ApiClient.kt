package com.example.smartparkingoperator.data.remote

import com.example.smartparkingoperator.data.security.SecureSessionManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object ApiClient {

    // Current LAN IP of the PC (Wi-Fi). If USB ADB reverse is used, fallback automatically routes to 127.0.0.1.
    private const val DEFAULT_BASE_URL = "http://192.168.2.103:3000/"
    private const val ADB_FALLBACK_HOST = "127.0.0.1"

    fun create(sessionManager: SecureSessionManager, baseUrl: String = DEFAULT_BASE_URL): ApiService {
        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val token = sessionManager.getAuthToken()

            val request = if (!token.isNullOrBlank()) {
                original.newBuilder()
                    .header("Authorization", "Bearer $token")
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .build()
            } else {
                original.newBuilder()
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .build()
            }
            chain.proceed(request)
        }

        // Automatic fallback: try Wi-Fi LAN IP first. If unreachable (e.g. phone not on same Wi-Fi),
        // fallback to 127.0.0.1 (ADB reverse via USB).
        val fallbackInterceptor = Interceptor { chain ->
            val request = chain.request()
            try {
                chain.proceed(request)
            } catch (e: IOException) {
                val originalHost = request.url.host
                if (originalHost != ADB_FALLBACK_HOST && originalHost != "localhost") {
                    val fallbackUrl = request.url.newBuilder()
                        .host(ADB_FALLBACK_HOST)
                        .build()
                    val fallbackRequest = request.newBuilder().url(fallbackUrl).build()
                    try {
                        chain.proceed(fallbackRequest)
                    } catch (_: IOException) {
                        throw e
                    }
                } else {
                    throw e
                }
            }
        }

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(fallbackInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
