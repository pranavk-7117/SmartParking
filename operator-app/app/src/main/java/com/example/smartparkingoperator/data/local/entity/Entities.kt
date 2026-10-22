package com.example.smartparkingoperator.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "location_assignment")
data class LocationAssignmentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val code: String,
    val city: String,
    val lastUpdated: Long = System.currentTimeMillis()
)

@Entity(tableName = "slot_availability")
data class SlotAvailabilityEntity(
    @PrimaryKey val locationId: String,
    val carVacant: Int,
    val carOccupied: Int,
    val carTotal: Int = carVacant + carOccupied,
    val scooterVacant: Int,
    val scooterOccupied: Int,
    val scooterTotal: Int = scooterVacant + scooterOccupied,
    val totalVacant: Int,
    val totalOccupied: Int,
    val totalSlots: Int = totalVacant + totalOccupied,
    val lastUpdated: Long = System.currentTimeMillis()
)

@Entity(tableName = "rate_master")
data class RateMasterEntity(
    @PrimaryKey val vehicleType: String, // "CAR", "SCOOTER"
    val ratePerHour: Double,
    val effectiveFrom: String
)

@Entity(tableName = "active_sessions")
data class ActiveSessionEntity(
    @PrimaryKey val id: String,
    val locationId: String,
    val vehicleId: String,
    val vehicleNumber: String,
    val vehicleType: String,
    val slotId: String,
    val slotCode: String,
    val inTime: Long,
    val inTimeIso: String,
    val isPendingSync: Boolean = false,
    val idempotencyKey: String
)

@Entity(tableName = "pending_actions")
data class PendingActionEntity(
    @PrimaryKey val id: String, // Client-generated UUID idempotency key
    val actionType: String, // "ENTRY" or "EXIT"
    val payloadJson: String,
    val status: String = "PENDING", // "PENDING", "IN_PROGRESS", "SYNCED", "FAILED"
    val capturedOffline: Boolean = true,
    val deviceTimestamp: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val lastErrorMessage: String? = null
)

/**
 * Receipt entity — stores the authoritative bill data returned by the backend.
 * All monetary fields (amount, ratePerHour) come from the server response,
 * not from local calculation, ensuring billing integrity.
 */
@Entity(tableName = "receipts")
data class ReceiptEntity(
    @PrimaryKey val id: String,           // bill_id from server
    val sessionId: String,
    val ticketId: String = "",            // PK-XXXXXXXX format from server
    val vehicleNumber: String,
    val vehicleType: String = "",         // "Car" or "Scooter"
    val slotCode: String = "",            // e.g. "C-01"
    val siteName: String = "",
    val siteAddress: String = "",
    val inTime: Long,
    val outTime: Long,
    val durationMinutes: Int,
    val durationText: String = "",        // "2h 15m" pre-formatted by server
    val ratePerHour: Double,
    val amount: Double,
    val paymentStatus: String = "PAID",
    val paymentMethod: String = "Cash / UPI Paid at Exit",
    val operatorId: String,
    val generatedOn: Long = System.currentTimeMillis(),
    val isPendingConfirmation: Boolean = false // true when generated offline
)

@Entity(tableName = "today_summary")
data class TodaySummaryEntity(
    @PrimaryKey val id: String = "singleton",
    val entries: Int,
    val exits: Int,
    val currentlyParked: Int,
    val todayRevenue: Int,
    val dateString: String,
    val lastUpdated: Long = System.currentTimeMillis()
)
