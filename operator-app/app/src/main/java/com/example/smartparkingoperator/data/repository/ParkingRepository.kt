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

    fun getPendingActionCount(): Flow<Int> =
        database.pendingActionDao().getPendingCountFlow()

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
     * Confirms a vehicle exit and computes billing receipt.
     * Enqueues immediately to Room outbox with client UUID.
     * Marks session closed and frees local slot count immediately.
     */
    suspend fun confirmExit(
        session: ActiveSessionEntity
    ): Result<ReceiptEntity> = withContext(Dispatchers.IO) {
        try {
            val isOffline = !connectivityObserver.isConnected()
            val now = System.currentTimeMillis()
            val isoTimestamp = formatIsoDate(now)

            // 1. Calculate duration and fee
            val durationMs = (now - session.inTime).coerceAtLeast(0)
            val durationMinutes = ((durationMs / 60000L).toInt()).coerceAtLeast(1)
            val hours = Math.ceil(durationMinutes / 60.0).toInt().coerceAtLeast(1)

            val rateEntity = database.rateDao().getRateForType(session.vehicleType)
            val ratePerHour = rateEntity?.ratePerHour ?: (if (session.vehicleType == "CAR") 40.0 else 20.0)
            val amount = hours * ratePerHour

            val operatorId = sessionManager.getOperatorId() ?: "operator-01"
            val receiptId = UUID.randomUUID().toString()
            val idempotencyKey = UUID.randomUUID().toString()

            val receipt = ReceiptEntity(
                id = receiptId,
                sessionId = session.id,
                vehicleNumber = session.vehicleNumber,
                inTime = session.inTime,
                outTime = now,
                durationMinutes = durationMinutes,
                ratePerHour = ratePerHour,
                amount = amount,
                operatorId = operatorId,
                generatedOn = now,
                isPendingConfirmation = isOffline
            )

            // 2. Insert receipt into Room
            database.receiptDao().insertReceipt(receipt)

            // 3. Remove session from active_sessions table
            database.activeSessionDao().deleteSessionById(session.id)

            // 4. Free slot count in local availability
            val carDelta = if (session.vehicleType == "CAR") 1 else 0
            val scooterDelta = if (session.vehicleType == "SCOOTER") 1 else 0
            database.availabilityDao().adjustAvailabilityDelta(session.locationId, carDelta, scooterDelta, now)

            // 5. Enqueue Exit action into Outbox
            val exitDto = ExitRequestDto(
                idempotencyKey = idempotencyKey,
                sessionId = session.id,
                vehicleNumber = session.vehicleNumber,
                deviceTimestamp = isoTimestamp,
                capturedOffline = isOffline
            )

            val pendingAction = PendingActionEntity(
                id = idempotencyKey,
                actionType = "EXIT",
                payloadJson = gson.toJson(exitDto),
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

            Result.success(receipt)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // -------------------------------------------------------------
    // Opportunistic Background Refresh (Network -> Room)
    // -------------------------------------------------------------

    suspend fun refreshLocationAndRates() = withContext(Dispatchers.IO) {
        if (!connectivityObserver.isConnected() || !sessionManager.isLoggedIn()) return@withContext

        try {
            // Refresh assignment
            val assignmentRes = apiService.getAssignedLocation()
            if (assignmentRes.isSuccessful && assignmentRes.body() != null) {
                val dto = assignmentRes.body()!!
                database.locationDao().insertLocation(
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
                    database.availabilityDao().insertAvailability(
                        SlotAvailabilityEntity(
                            locationId = aDto.locationId,
                            carVacant = aDto.carVacant,
                            carOccupied = aDto.carOccupied,
                            scooterVacant = aDto.scooterVacant,
                            scooterOccupied = aDto.scooterOccupied,
                            totalVacant = aDto.totalVacant,
                            totalOccupied = aDto.totalOccupied,
                            lastUpdated = System.currentTimeMillis()
                        )
                    )
                }

                // Refresh active sessions
                val sessionsRes = apiService.getActiveSessions(locationId = dto.locationId)
                if (sessionsRes.isSuccessful && sessionsRes.body() != null) {
                    val serverSessions = sessionsRes.body()!!.map { s ->
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
                }
            }

            // Refresh rates
            val ratesRes = apiService.getRates()
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
