package com.example.smartparkingoperator.feature.camera

import android.graphics.Bitmap
import android.media.Image
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object PlateTextRecognizer {

    // Bundled on-device Latin text recognizer - 100% offline, zero network dependencies
    private val recognizer by lazy {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

    // Regex pattern for standard vehicle registration numbers (e.g. KA01AB1234 or DL4CAF5678)
    private val plateRegex = "[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}".toRegex()
    private val generalAlphanumericRegex = "[A-Z0-9]{6,12}".toRegex()

    suspend fun recognizePlateFromBitmap(bitmap: Bitmap): String? = suspendCancellableCoroutine { continuation ->
        val image = InputImage.fromBitmap(bitmap, 0)
        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val result = extractPlateText(visionText.text)
                continuation.resume(result)
            }
            .addOnFailureListener {
                continuation.resume(null)
            }
    }

    suspend fun recognizePlateFromMediaImage(mediaImage: Image, rotationDegrees: Int): String? =
        suspendCancellableCoroutine { continuation ->
            val image = InputImage.fromMediaImage(mediaImage, rotationDegrees)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val result = extractPlateText(visionText.text)
                    continuation.resume(result)
                }
                .addOnFailureListener {
                    continuation.resume(null)
                }
        }

    fun extractPlateText(rawText: String): String? {
        val lines = rawText.lines().map { it.trim().uppercase().replace("[^A-Z0-9]".toRegex(), "") }

        // 1. Look for exact standard vehicle plate match
        for (line in lines) {
            val match = plateRegex.find(line)
            if (match != null) {
                return match.value
            }
        }

        // 2. Look for general alphanumeric line matching plate length (6 to 11 chars)
        for (line in lines) {
            if (line.length in 6..11 && generalAlphanumericRegex.matches(line)) {
                return line
            }
        }

        // 3. Check combined text without spaces
        val combined = rawText.uppercase().replace("[^A-Z0-9]".toRegex(), "")
        val combinedMatch = plateRegex.find(combined)
        if (combinedMatch != null) {
            return combinedMatch.value
        }

        return lines.firstOrNull { it.length in 6..12 }
    }
}
