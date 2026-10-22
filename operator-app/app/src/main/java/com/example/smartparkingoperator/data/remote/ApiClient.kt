package com.example.smartparkingoperator.data.remote

import com.example.smartparkingoperator.BuildConfig
import com.example.smartparkingoperator.data.security.SecureSessionManager
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object ApiClient {

    private const val ADB_FALLBACK_HOST = "127.0.0.1"

    fun create(
        sessionManager: SecureSessionManager,
        baseUrl: String = BuildConfig.API_BASE_URL
    ): ApiService {
        // Dynamically rewrites request host & port based on the user-configured server URL in SecureSessionManager
        val dynamicHostInterceptor = Interceptor { chain ->
            val original = chain.request()
            val configuredUrl = sessionManager.getServerUrl()
            val parsedUrl = configuredUrl.toHttpUrlOrNull()

            val requestToProceed = if (parsedUrl != null) {
                val newUrl = original.url.newBuilder()
                    .scheme(parsedUrl.scheme)
                    .host(parsedUrl.host)
                    .port(parsedUrl.port)
                    .build()
                original.newBuilder().url(newUrl).build()
            } else {
                original
            }
            chain.proceed(requestToProceed)
        }

        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            val token = sessionManager.getAuthToken()

            val builder = original.newBuilder()
                .header("X-Client-Type", "operator-android")
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")

            if (!token.isNullOrBlank()) {
                builder.header("Authorization", "Bearer $token")
            }

            chain.proceed(builder.build())
        }

        // Automatic fallback for USB ADB debugging in debug builds only
        val fallbackInterceptor = Interceptor { chain ->
            val request = chain.request()
            try {
                chain.proceed(request)
            } catch (e: IOException) {
                if (BuildConfig.DEBUG && !request.isHttps) {
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
                } else {
                    throw e
                }
            }
        }

        // Disable BODY logging in release builds to prevent leaking sensitive data or tokens into logcat
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(dynamicHostInterceptor)
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
