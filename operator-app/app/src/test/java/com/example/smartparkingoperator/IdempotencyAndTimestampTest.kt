package com.example.smartparkingoperator

import com.example.smartparkingoperator.data.repository.ParkingRepository
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.UUID

class IdempotencyAndTimestampTest {

    @Test
    fun testIdempotencyKey_isValidUUID() {
        val key = UUID.randomUUID().toString()
        assertNotNull(UUID.fromString(key))
    }

    @Test
    fun testIsoDateFormatting() {
        val now = 1757950200000L // arbitrary epoch ms
        val formatted = ParkingRepository.formatIsoDate(now)
        assertTrue(formatted.endsWith("Z"))
        assertTrue(formatted.contains("T"))

        val parsedBack = ParkingRepository.parseIsoDate(formatted)
        assertTrue(Math.abs(now - parsedBack) < 1000)
    }
}
