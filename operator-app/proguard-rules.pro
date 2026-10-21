# ProGuard rules for AeroPark Smart Parking Operator App

# Retrofit DTOs (Gson serialization - keep all fields and methods)
-keepclassmembers class com.example.smartparkingoperator.data.remote.dto.** { *; }

# Gson serialization and deserialization
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-keepclassmembers enum * { *; }

# CameraX
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ML Kit (Bundled On-Device Text Recognition)
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.**

# Retrofit & OkHttp
-keep interface com.squareup.retrofit2.** { *; }
-keep class com.squareup.retrofit2.** { *; }
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**
