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
    val scooterVacant: Int,
    val scooterOccupied: Int,
    val totalVacant: Int,
    val totalOccupied: Int,
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

@Entity(tableName = "receipts")
data class ReceiptEntity(
    @PrimaryKey val id: String,
    val sessionId: String,
    val vehicleNumber: String,
    val inTime: Long,
    val outTime: Long,
    val durationMinutes: Int,
    val ratePerHour: Double,
    val amount: Double,
    val operatorId: String,
    val generatedOn: Long = System.currentTimeMillis(),
    val isPendingConfirmation: Boolean = false // true when generated offline
)
