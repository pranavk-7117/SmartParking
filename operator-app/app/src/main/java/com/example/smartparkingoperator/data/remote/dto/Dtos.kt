package com.example.smartparkingoperator.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)

data class LoginUserDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("username") val username: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("locationId") val locationId: String? = null,
    @SerializedName("mustChangePassword") val mustChangePassword: Boolean = false
)

data class LoginResponse(
    @SerializedName("access_token") val accessToken: String? = null,
    @SerializedName("token") val token: String? = null,
    @SerializedName("operator_id") val operatorId: String? = null,
    @SerializedName("username") val username: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("mustChangePassword") val mustChangePassword: Boolean = false,
    @SerializedName("user") val user: LoginUserDto? = null
) {
    val effectiveToken: String
        get() = accessToken ?: token ?: ""

    val effectiveOperatorId: String
        get() = operatorId ?: user?.id ?: ""

    val effectiveUsername: String
        get() = username ?: user?.username ?: ""

    val effectiveRole: String
        get() = role ?: user?.role ?: "operator"

    val effectiveMustChangePassword: Boolean
        get() = mustChangePassword || (user?.mustChangePassword == true)
}

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
    @SerializedName("car_total") val carTotal: Int? = null,
    @SerializedName("scooter_vacant") val scooterVacant: Int,
    @SerializedName("scooter_occupied") val scooterOccupied: Int,
    @SerializedName("scooter_total") val scooterTotal: Int? = null,
    @SerializedName("total_vacant") val totalVacant: Int,
    @SerializedName("total_occupied") val totalOccupied: Int,
    @SerializedName("total_slots") val totalSlots: Int? = null
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

data class OperatorProfileDto(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("username") val username: String?,
    @SerializedName("contact") val contact: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("employee_id") val employeeId: String?,
    @SerializedName("shift_time") val shiftTime: String?,
    @SerializedName("notes") val notes: String?,
    @SerializedName("role") val role: String?,
    @SerializedName("location_name") val locationName: String?,
    @SerializedName("sessions_processed_count") val sessionsProcessedCount: Int?,
    @SerializedName("date_added") val dateAdded: String?
)

data class UpdateProfileRequest(
    @SerializedName("name") val name: String?,
    @SerializedName("username") val username: String?,
    @SerializedName("contact") val contact: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("employeeId") val employeeId: String?,
    @SerializedName("employee_id") val employeeIdSnake: String? = employeeId,
    @SerializedName("shiftTime") val shiftTime: String?,
    @SerializedName("shift_time") val shiftTimeSnake: String? = shiftTime,
    @SerializedName("notes") val notes: String?
)

data class ChangePasswordRequest(
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String,
    @SerializedName("current_password") val currentPasswordSnake: String = currentPassword,
    @SerializedName("new_password") val newPasswordSnake: String = newPassword
)

data class GenericMessageDto(
    @SerializedName("message") val message: String?
)

data class TodaySummaryDto(
    @SerializedName("entries") val entries: Int = 0,
    @SerializedName("exits") val exits: Int = 0,
    @SerializedName("currentlyParked") val currentlyParked: Int = 0,
    @SerializedName("todayRevenue") val todayRevenue: Int = 0
)

data class NotificationDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("priority") val priority: String = "INFO",
    @SerializedName("sender") val sender: String = "Admin",
    @SerializedName("locationId") val locationId: String? = null,
    @SerializedName("createdAt") val createdAt: String
)


