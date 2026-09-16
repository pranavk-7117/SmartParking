package com.example.smartparkingoperator

import com.example.smartparkingoperator.feature.camera.PlateTextRecognizer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class PlateTextRecognizerTest {

    @Test
    fun testPlateExtraction_standardPlate() {
        val rawOcrText = """
            INDIA
            IND
            KA 01 AB 1234
            TRANSPORT DEPT
        """.trimIndent()

        val extracted = PlateTextRecognizer.extractPlateText(rawOcrText)
        assertNotNull(extracted)
        assertEquals("KA01AB1234", extracted)
    }

    @Test
    fun testPlateExtraction_twoWheelerPlate() {
        val rawOcrText = """
            MH 12 CD 5678
        """.trimIndent()

        val extracted = PlateTextRecognizer.extractPlateText(rawOcrText)
        assertNotNull(extracted)
        assertEquals("MH12CD5678", extracted)
    }

    @Test
    fun testPlateExtraction_delhiPlate() {
        val rawOcrText = """
            DL 04 EF 9012
        """.trimIndent()

        val extracted = PlateTextRecognizer.extractPlateText(rawOcrText)
        assertNotNull(extracted)
        assertEquals("DL04EF9012", extracted)
    }
}
