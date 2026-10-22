package com.example.smartparkingoperator.data.repository

import com.example.smartparkingoperator.data.local.AppDatabase
import com.example.smartparkingoperator.data.local.entity.ActiveSessionEntity
import com.example.smartparkingoperator.data.local.entity.LocationAssignmentEntity
import com.example.smartparkingoperator.data.local.entity.PendingActionEntity
import com.example.smartparkingoperator.data.local.entity.RateMasterEntity
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import com.example.smartparkingoperator.data.local.entity.SlotAvailabilityEntity
import com.example.smartparkingoperator.data.network.ConnectivityObserver
import com.example.smartparkingoperator.data.remote.ApiService
import com.example.smartparkingoperator.data.remote.dto.EntryRequestDto
import com.example.smartparkingoperator.data.remote.dto.ExitRequestDto
import com.example.smartparkingoperator.data.security.SecureSessionManager
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

class ParkingRepository(
    private val database: AppDatabase,
    private val apiService: ApiService,
    private val sessionManager: SecureSessionManager,
    private val connectivityObserver: ConnectivityObserver
) {
    private val gson = Gson()

    // -------------------------------------------------------------
    // Reactive Room Reads (Single Source of Truth)
    // -------------------------------------------------------------

    fun getLocation(): Flow<LocationAssignmentEntity?> =
        database.locationDao().getLocation()

    fun getAvailability(locationId: String): Flow<SlotAvailabilityEntity?> =
        database.availabilityDao().getAvailability(locationId)

    fun getFirstAvailability(): Flow<SlotAvailabilityEntity?> =
        database.availabilityDao().getFirstAvailability()

    fun getRates(): Flow<List<RateMasterEntity>> =
        database.rateDao().getRates()

    fun getActiveSessions(): Flow<List<ActiveSessionEntity>> =
        database.activeSessionDao().getAllActiveSessions()

    fun getReceipt(sessionId: String): Flow<ReceiptEntity?> =
        database.receiptDao().getReceiptBySessionId(sessionId)

    fun getAllReceipts(): Flow<List<ReceiptEntity>> =
        database.receiptDao().getAllReceipts()

    fun getPendingActionCount(): Flow<Int> =
        database.pendingActionDao().getPendingCountFlow()

    fun getPersistedTodaySummary(): Flow<com.example.smartparkingoperator.data.local.entity.TodaySummaryEntity?> =
        database.todaySummaryDao().getTodaySummaryFlow()

    suspend fun getActiveSessionByPlate(plate: String): ActiveSessionEntity? = withContext(Dispatchers.IO) {
        val cleanPlate = plate.uppercase().replace("[^A-Z0-9]".toRegex(), "")
        database.activeSessionDao().getSessionByPlate(cleanPlate)
    }

    suspend fun getActiveSessionById(id: String): ActiveSessionEntity? = withContext(Dispatchers.IO) {
        database.activeSessionDao().getSessionById(id)
    }

    // -------------------------------------------------------------
    // Write Operations (Outbox Pattern + Idempotency)
    // -------------------------------------------------------------

    /**
     * Confirms an incoming vehicle entry.
     * Enqueues immediately to Room outbox with client-generated UUID idempotency key.
     * Updates local UI state and availability counts immediately.
     */
    suspend fun confirmEntry(
        vehicleNumber: String,
        vehicleType: String
    ): Result<ActiveSessionEntity> = withContext(Dispatchers.IO) {
        try {
            val cleanPlate = vehicleNumber.uppercase().replace("[^A-Z0-9]".toRegex(), "")
            val isOffline = !connectivityObserver.isConnected()
            val now = System.currentTimeMillis()
            val isoTimestamp = formatIsoDate(now)

            // Resolve location
            val location = database.locationDao().getLocationDirect()
            val locationId = location?.id ?: "00000000-0000-0000-0000-000000000001"

            // Client-generated UUID makes retries safe
            val idempotencyKey = UUID.randomUUID().toString()
            val sessionId = idempotencyKey

            val slotCode = if (vehicleType == "CAR") "C-AUTO" else "S-AUTO"

            val sessionEntity = ActiveSessionEntity(
                id = sessionId,
                locationId = locationId,
                vehicleId = UUID.randomUUID().toString(),
                vehicleNumber = cleanPlate,
                vehicleType = vehicleType,
                slotId = UUID.randomUUID().toString(),
                slotCode = slotCode,
                inTime = now,
                inTimeIso = isoTimestamp,
                isPendingSync = isOffline,
                idempotencyKey = idempotencyKey
            )

            // 1. Write immediately to local active_sessions table
            database.activeSessionDao().insertSession(sessionEntity)

            // 2. Adjust local availability immediately
            val carDelta = if (vehicleType == "CAR") -1 else 0
            val scooterDelta = if (vehicleType == "SCOOTER") -1 else 0
            database.availabilityDao().adjustAvailabilityDelta(locationId, carDelta, scooterDelta, now)

            // 3. Write to local Outbox table
            val entryDto = EntryRequestDto(
                idempotencyKey = idempotencyKey,
                locationId = locationId,
                vehicleNumber = cleanPlate,
                vehicleType = vehicleType,
                slotId = null,
                deviceTimestamp = isoTimestamp,
                capturedOffline = isOffline
            )

            val pendingAction = PendingActionEntity(
                id = idempotencyKey,
                actionType = "ENTRY",
                payloadJson = gson.toJson(entryDto),
                status = "PENDING",
                capturedOffline = isOffline,
                deviceTimestamp = now,
                createdAt = now
            )
            database.pendingActionDao().insertAction(pendingAction)

            // Immediately trigger sync to backend if online
            if (!isOffline) {
                try {
                    syncPendingActions()
                } catch (_: Exception) {
                    // Fail safely; action remains in Room outbox
                }
            }

            Result.success(sessionEntity)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Confirms a vehicle exit and returns an authoritative receipt.
     *
     * Online path (preferred):
     *   1. POST /api/v1/exits to the backend.
     *   2. Map the server's authoritative response (billing computed on server) to ReceiptEntity.
     *   3. Remove session from Room and update local slot counts.
     *
     * Offline path:
     *   1. Generate a provisional receipt using locally-cached rate data (amount will be 0 if rates missing).
     *   2. Queue an EXIT action in the Room outbox for later sync.
     *   3. Mark the receipt as pending confirmation.
     *
     * The receipt's billing fields (amount, ratePerHour, duration) always come from the server
     * when online, never from independent Android-side calculations.
     */
    suspend fun confirmExit(
        session: ActiveSessionEntity
    ): Result<ReceiptEntity> = withContext(Dispatchers.IO) {
        try {
            val isOffline = !connectivityObserver.isConnected()
            val now = System.currentTimeMillis()
            val isoTimestamp = formatIsoDate(now)
            val idempotencyKey = UUID.randomUUID().toString()

            val carDelta = if (session.vehicleType == "CAR") 1 else 0
            val scooterDelta = if (session.vehicleType == "SCOOTER") 1 else 0

            if (!isOffline) {
                // ── Online: post exit, receive authoritative bill from backend ──────────────
                val exitDto = ExitRequestDto(
                    idempotencyKey = idempotencyKey,
                    sessionId = session.id,
                    vehicleNumber = session.vehicleNumber,
                    deviceTimestamp = isoTimestamp,
                    capturedOffline = false
                )
                val response = apiService.postExit(exitDto)
                if (response.isSuccessful && response.body() != null) {
                    val r = response.body()!!

                    val inTimeMs  = parseIsoDate(r.inTime)
                    val outTimeMs = parseIsoDate(r.outTime)
                    val genOnMs   = parseIsoDate(r.generatedOn)

                    val durationMins = r.durationMinutes
                    val durHrs  = durationMins / 60
                    val durMins = durationMins % 60
                    val durationText = r.durationText
                        ?: if (durHrs > 0) "${durHrs}h ${durMins}m" else "${durMins}m"

                    val receipt = ReceiptEntity(
                        id                    = r.billId,
                        sessionId             = r.sessionId,
                        ticketId              = r.ticketId ?: "PK-${r.sessionId.take(8).uppercase()}",
                        vehicleNumber         = r.vehicleNumber,
                        vehicleType           = r.category ?: r.vehicleType ?: session.vehicleType,
                        slotCode              = r.slotCode ?: r.slotId ?: session.slotCode,
                        siteName              = r.siteName ?: "",
                        siteAddress           = r.siteAddress ?: "",
                        inTime                = inTimeMs,
                        outTime               = outTimeMs,
                        durationMinutes       = durationMins,
                        durationText          = durationText,
                        ratePerHour           = r.rateApplied,
                        amount                = r.amount,
                        paymentStatus         = r.paymentStatus ?: "PAID",
                        paymentMethod         = r.paymentMethod ?: "Cash / UPI Paid at Exit",
                        operatorId            = r.operatorId,
                        generatedOn           = genOnMs,
                        isPendingConfirmation = false
                    )

                    database.receiptDao().insertReceipt(receipt)
                    database.activeSessionDao().deleteSessionById(session.id)
                    database.availabilityDao().adjustAvailabilityDelta(session.locationId, carDelta, scooterDelta, now)

                    return@withContext Result.success(receipt)
                } else {
                    if (response.code() == 401) sessionManager.clearSession()
                    val errMsg = response.errorBody()?.string() ?: "Server error ${response.code()}"
                    return@withContext Result.failure(Exception(errMsg))
                }
            }

            // ── Offline: generate provisional receipt from local rate cache ──────────────
            val durationMs = (now - session.inTime).coerceAtLeast(0)
            val durationMinutes = ((durationMs / 60000L).toInt()).coerceAtLeast(1)
            val durationHours = Math.ceil(durationMinutes / 60.0).toInt().coerceAtLeast(1)
            val durHrs  = durationMinutes / 60
            val durMins = durationMinutes % 60
            val durationText = if (durHrs > 0) "${durHrs}h ${durMins}m" else "${durMins}m"

            val rateEntity = database.rateDao().getRateForType(session.vehicleType)
            val ratePerHour = rateEntity?.ratePerHour ?: 0.0
            val amount = durationHours * ratePerHour
            val operatorId = sessionManager.getOperatorId() ?: ""
            val receiptId = UUID.randomUUID().toString()

            val receipt = ReceiptEntity(
                id                    = receiptId,
                sessionId             = session.id,
                ticketId              = "PK-${session.id.take(8).uppercase()}",
                vehicleNumber         = session.vehicleNumber,
                vehicleType           = session.vehicleType,
                slotCode              = session.slotCode,
                siteName              = "",
                siteAddress           = "",
                inTime                = session.inTime,
                outTime               = now,
                durationMinutes       = durationMinutes,
                durationText          = durationText,
                ratePerHour           = ratePerHour,
                amount                = amount,
                paymentStatus         = "PENDING",
                paymentMethod         = "Cash / UPI Paid at Exit",
                operatorId            = operatorId,
                generatedOn           = now,
                isPendingConfirmation = true
            )

            database.receiptDao().insertReceipt(receipt)
            database.activeSessionDao().deleteSessionById(session.id)
            database.availabilityDao().adjustAvailabilityDelta(session.locationId, carDelta, scooterDelta, now)

            database.pendingActionDao().insertAction(
                PendingActionEntity(
                    id              = idempotencyKey,
                    actionType      = "EXIT",
                    payloadJson     = gson.toJson(ExitRequestDto(
                        idempotencyKey  = idempotencyKey,
                        sessionId       = session.id,
                        vehicleNumber   = session.vehicleNumber,
                        deviceTimestamp = isoTimestamp,
                        capturedOffline = true
                    )),
                    status          = "PENDING",
                    capturedOffline = true,
                    deviceTimestamp = now,
                    createdAt       = now
                )
            )

            Result.success(receipt)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // -------------------------------------------------------------
    // Opportunistic Background Refresh (Network -> Room)
    // -------------------------------------------------------------

    suspend fun clearLocalLocationCache() = withContext(Dispatchers.IO) {
        database.locationDao().clearLocation()
        database.availabilityDao().clearAvailability()
        database.activeSessionDao().clearAllActiveSessions()
    }

    suspend fun refreshLocationAndRates() = withContext(Dispatchers.IO) {
        if (!connectivityObserver.isConnected() || !sessionManager.isLoggedIn()) return@withContext

        try {
            // Refresh assignment
            val assignmentRes = apiService.getAssignedLocation()
            if (assignmentRes.isSuccessful && assignmentRes.body() != null) {
                val dto = assignmentRes.body()!!
                database.locationDao().replaceLocation(
                    LocationAssignmentEntity(
                        id = dto.locationId,
                        name = dto.locationName,
                        code = dto.locationCode,
                        city = dto.city,
                        lastUpdated = System.currentTimeMillis()
                    )
                )

                // Refresh availability for this location
                val availRes = apiService.getSlotAvailability(dto.locationId)
                if (availRes.isSuccessful && availRes.body() != null) {
                    val aDto = availRes.body()!!
                    val carTot = aDto.carTotal ?: (aDto.carVacant + aDto.carOccupied)
                    val scotTot = aDto.scooterTotal ?: (aDto.scooterVacant + aDto.scooterOccupied)
                    val totSlots = aDto.totalSlots ?: (carTot + scotTot)
                    database.availabilityDao().replaceAvailability(
                        SlotAvailabilityEntity(
                            locationId = aDto.locationId,
                            carVacant = aDto.carVacant,
                            carOccupied = aDto.carOccupied,
                            carTotal = carTot,
                            scooterVacant = aDto.scooterVacant,
                            scooterOccupied = aDto.scooterOccupied,
                            scooterTotal = scotTot,
                            totalVacant = aDto.totalVacant,
                            totalOccupied = aDto.totalOccupied,
                            totalSlots = totSlots,
                            lastUpdated = System.currentTimeMillis()
                        )
                    )
                }

                // Refresh active sessions (paginating with limit/offset and inspecting X-Total-Count)
                val allServerSessions = mutableListOf<com.example.smartparkingoperator.data.remote.dto.ActiveSessionDto>()
                var offset = 0
                val limit = 200
                var hasMore = true

                while (hasMore) {
                    val sessionsRes = apiService.getActiveSessions(
                        locationId = dto.locationId,
                        limit = limit,
                        offset = offset
                    )
                    if (sessionsRes.isSuccessful && sessionsRes.body() != null) {
                        val batch = sessionsRes.body()!!
                        allServerSessions.addAll(batch)
                        val totalCountHeader = sessionsRes.headers()["X-Total-Count"]?.toIntOrNull()
                        val totalCount = totalCountHeader ?: batch.size
                        offset += batch.size
                        hasMore = batch.size == limit && offset < totalCount
                    } else {
                        if (sessionsRes.code() == 401) {
                            sessionManager.clearSession()
                        }
                        hasMore = false
                    }
                }

                val serverSessions = allServerSessions.map { s ->
                    ActiveSessionEntity(
                        id = s.sessionId,
                        locationId = s.locationId,
                        vehicleId = s.vehicleId,
                        vehicleNumber = s.vehicleNumber,
                        vehicleType = s.vehicleType,
                        slotId = s.slotId,
                        slotCode = s.slotCode,
                        inTime = parseIsoDate(s.inTime),
                        inTimeIso = s.inTime,
                        isPendingSync = false,
                        idempotencyKey = s.sessionId
                    )
                }
                database.activeSessionDao().syncActiveSessions(serverSessions)

                // Refresh rates specifically for this assigned location
                val ratesRes = apiService.getRates(siteId = dto.locationId)
                if (ratesRes.isSuccessful && ratesRes.body() != null) {
                    val rates = ratesRes.body()!!.map { r ->
                        RateMasterEntity(
                            vehicleType = r.vehicleType,
                            ratePerHour = r.ratePerHour,
                            effectiveFrom = r.effectiveFrom
                        )
                    }
                    database.rateDao().insertRates(rates)
                }
            }
        } catch (_: Exception) {
            // Fail silently on network fetch failure — Room cached data remains intact
        }
    }

    // -------------------------------------------------------------
    // Outbox Sync Execution (WorkManager calls this)
    // -------------------------------------------------------------

    suspend fun syncPendingActions(): Boolean = withContext(Dispatchers.IO) {
        if (!sessionManager.isLoggedIn()) return@withContext false

        val pendingList = database.pendingActionDao().getUnsyncedActions()
        if (pendingList.isEmpty()) {
            refreshLocationAndRates()
            return@withContext true
        }

        var allSuccess = true

        for (action in pendingList) {
            try {
                if (action.actionType == "ENTRY") {
                    val entryDto = gson.fromJson(action.payloadJson, EntryRequestDto::class.java)
                    val response = apiService.postEntry(entryDto)
                    if (response.isSuccessful) {
                        database.pendingActionDao().deleteActionById(action.id)
                        database.activeSessionDao().markSessionSynced(action.id, action.id)
                    } else {
                        if (response.code() == 401) {
                            sessionManager.clearSession()
                        }
                        allSuccess = false
                        database.pendingActionDao().updateActionStatus(
                            id = action.id,
                            status = "FAILED",
                            retryCount = action.retryCount + 1,
                            error = response.message()
                        )
                    }
                } else if (action.actionType == "EXIT") {
                    val exitDto = gson.fromJson(action.payloadJson, ExitRequestDto::class.java)
                    val response = apiService.postExit(exitDto)
                    if (response.isSuccessful) {
                        database.pendingActionDao().deleteActionById(action.id)
                        database.receiptDao().markReceiptConfirmed(exitDto.sessionId)
                    } else {
                        if (response.code() == 401) {
                            sessionManager.clearSession()
                        }
                        allSuccess = false
                        database.pendingActionDao().updateActionStatus(
                            id = action.id,
                            status = "FAILED",
                            retryCount = action.retryCount + 1,
                            error = response.message()
                        )
                    }
                }
            } catch (e: Exception) {
                allSuccess = false
                database.pendingActionDao().updateActionStatus(
                    id = action.id,
                    status = "FAILED",
                    retryCount = action.retryCount + 1,
                    error = e.localizedMessage
                )
            }
        }

        refreshLocationAndRates()
        allSuccess
    }

    suspend fun getTodaySummary(): Result<com.example.smartparkingoperator.data.remote.dto.TodaySummaryDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getTodaySummary()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load today's summary: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getNotifications(): Result<List<com.example.smartparkingoperator.data.remote.dto.NotificationDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getNotifications()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load notifications: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reportLocation(
        latitude: Double,
        longitude: Double
    ): Result<com.example.smartparkingoperator.data.remote.dto.LocationUpdateResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.updateLocation(
                com.example.smartparkingoperator.data.remote.dto.LocationUpdateRequest(
                    latitude = latitude,
                    longitude = longitude
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to report location: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }



    companion object {
        fun formatIsoDate(epochMs: Long): String {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            return sdf.format(Date(epochMs))
        }

        fun parseIsoDate(iso: String): Long {
            return try {
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                sdf.timeZone = TimeZone.getTimeZone("UTC")
                sdf.parse(iso)?.time ?: System.currentTimeMillis()
            } catch (_: Exception) {
                System.currentTimeMillis()
            }
        }
    }
}

