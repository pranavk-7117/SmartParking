package com.example.smartparkingoperator.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("operator_id") val operatorId: String,
    @SerializedName("username") val username: String,
    @SerializedName("role") val role: String
)

data class LocationAssignmentDto(
    @SerializedName("location_id") val locationId: String,
    @SerializedName("location_name") val locationName: String,
    @SerializedName("location_code") val locationCode: String,
    @SerializedName("city") val city: String
)

data class AvailabilityDto(
    @SerializedName("location_id") val locationId: String,
    @SerializedName("car_vacant") val carVacant: Int,
    @SerializedName("car_occupied") val carOccupied: Int,
    @SerializedName("scooter_vacant") val scooterVacant: Int,
    @SerializedName("scooter_occupied") val scooterOccupied: Int,
    @SerializedName("total_vacant") val totalVacant: Int,
    @SerializedName("total_occupied") val totalOccupied: Int
)

data class RateDto(
    @SerializedName("vehicle_type") val vehicleType: String,
    @SerializedName("rate_per_hour") val ratePerHour: Double,
    @SerializedName("effective_from") val effectiveFrom: String
)

data class ActiveSessionDto(
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("location_id") val locationId: String,
    @SerializedName("vehicle_id") val vehicleId: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    @SerializedName("vehicle_type") val vehicleType: String,
    @SerializedName("slot_id") val slotId: String,
    @SerializedName("slot_code") val slotCode: String,
    @SerializedName("in_time") val inTime: String
)

data class EntryRequestDto(
    @SerializedName("idempotency_key") val idempotencyKey: String,
    @SerializedName("location_id") val locationId: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    @SerializedName("vehicle_type") val vehicleType: String,
    @SerializedName("slot_id") val slotId: String? = null,
    @SerializedName("device_timestamp") val deviceTimestamp: String,
    @SerializedName("captured_offline") val capturedOffline: Boolean
)

data class EntryResponseDto(
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("vehicle_id") val vehicleId: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    @SerializedName("vehicle_type") val vehicleType: String,
    @SerializedName("slot_id") val slotId: String,
    @SerializedName("slot_location_code") val slotLocationCode: String,
    @SerializedName("in_time") val inTime: String,
    @SerializedName("status") val status: String,
    @SerializedName("captured_offline") val capturedOffline: Boolean
)

data class ExitRequestDto(
    @SerializedName("idempotency_key") val idempotencyKey: String,
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    @SerializedName("device_timestamp") val deviceTimestamp: String,
    @SerializedName("captured_offline") val capturedOffline: Boolean
)

data class ExitResponseDto(
    @SerializedName("bill_id") val billId: String,
    @SerializedName("session_id") val sessionId: String,
    @SerializedName("vehicle_number") val vehicleNumber: String,
    @SerializedName("in_time") val inTime: String,
    @SerializedName("out_time") val outTime: String,
    @SerializedName("duration_minutes") val durationMinutes: Int,
    @SerializedName("rate_applied") val rateApplied: Double,
    @SerializedName("amount") val amount: Double,
    @SerializedName("generated_on") val generatedOn: String,
    @SerializedName("operator_id") val operatorId: String
)
