package com.example.smartparkingoperator.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.example.smartparkingoperator.data.local.entity.ActiveSessionEntity
import com.example.smartparkingoperator.data.local.entity.LocationAssignmentEntity
import com.example.smartparkingoperator.data.local.entity.PendingActionEntity
import com.example.smartparkingoperator.data.local.entity.RateMasterEntity
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import com.example.smartparkingoperator.data.local.entity.SlotAvailabilityEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface LocationDao {
    @Query("SELECT * FROM location_assignment ORDER BY lastUpdated DESC LIMIT 1")
    fun getLocation(): Flow<LocationAssignmentEntity?>

    @Query("SELECT * FROM location_assignment ORDER BY lastUpdated DESC LIMIT 1")
    suspend fun getLocationDirect(): LocationAssignmentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLocation(entity: LocationAssignmentEntity)

    @Query("DELETE FROM location_assignment")
    suspend fun clearLocation()

    @Transaction
    suspend fun replaceLocation(entity: LocationAssignmentEntity) {
        clearLocation()
        insertLocation(entity)
    }
}

@Dao
interface AvailabilityDao {
    @Query("SELECT * FROM slot_availability WHERE locationId = :locationId LIMIT 1")
    fun getAvailability(locationId: String): Flow<SlotAvailabilityEntity?>

    @Query("SELECT * FROM slot_availability ORDER BY lastUpdated DESC LIMIT 1")
    fun getFirstAvailability(): Flow<SlotAvailabilityEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAvailability(entity: SlotAvailabilityEntity)

    @Query("DELETE FROM slot_availability")
    suspend fun clearAvailability()

    @Transaction
    suspend fun replaceAvailability(entity: SlotAvailabilityEntity) {
        clearAvailability()
        insertAvailability(entity)
    }

    @Query("""
        UPDATE slot_availability 
        SET carVacant = MAX(0, carVacant + :carDelta),
            carOccupied = MAX(0, carOccupied - :carDelta),
            scooterVacant = MAX(0, scooterVacant + :scooterDelta),
            scooterOccupied = MAX(0, scooterOccupied - :scooterDelta),
            totalVacant = MAX(0, totalVacant + :carDelta + :scooterDelta),
            totalOccupied = MAX(0, totalOccupied - :carDelta - :scooterDelta),
            lastUpdated = :timestamp
        WHERE locationId = :locationId
    """)
    suspend fun adjustAvailabilityDelta(
        locationId: String,
        carDelta: Int,
        scooterDelta: Int,
        timestamp: Long = System.currentTimeMillis()
    )
}

@Dao
interface RateDao {
    @Query("SELECT * FROM rate_master")
    fun getRates(): Flow<List<RateMasterEntity>>

    @Query("SELECT * FROM rate_master WHERE vehicleType = :type LIMIT 1")
    suspend fun getRateForType(type: String): RateMasterEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRates(rates: List<RateMasterEntity>)
}

@Dao
interface ActiveSessionDao {
    @Query("SELECT * FROM active_sessions ORDER BY inTime DESC")
    fun getAllActiveSessions(): Flow<List<ActiveSessionEntity>>

    @Query("SELECT * FROM active_sessions WHERE vehicleNumber = :plate LIMIT 1")
    suspend fun getSessionByPlate(plate: String): ActiveSessionEntity?

    @Query("SELECT * FROM active_sessions WHERE id = :id LIMIT 1")
    suspend fun getSessionById(id: String): ActiveSessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: ActiveSessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSessions(sessions: List<ActiveSessionEntity>)

    @Query("DELETE FROM active_sessions WHERE id = :id")
    suspend fun deleteSessionById(id: String)

    @Query("UPDATE active_sessions SET isPendingSync = 0 WHERE id = :id OR idempotencyKey = :idempotencyKey")
    suspend fun markSessionSynced(id: String, idempotencyKey: String)

    @Transaction
    suspend fun syncActiveSessions(sessions: List<ActiveSessionEntity>) {
        // Retain pending local sessions, update server confirmed ones
        val localPending = getPendingLocalSessions()
        clearConfirmedSessions()
        insertSessions(sessions)
        insertSessions(localPending)
    }

    @Query("SELECT * FROM active_sessions WHERE isPendingSync = 1")
    suspend fun getPendingLocalSessions(): List<ActiveSessionEntity>

    @Query("DELETE FROM active_sessions WHERE isPendingSync = 0")
    suspend fun clearConfirmedSessions()

    @Query("DELETE FROM active_sessions")
    suspend fun clearAllActiveSessions()
}

@Dao
interface PendingActionDao {
    @Query("SELECT * FROM pending_actions WHERE status IN ('PENDING', 'FAILED') ORDER BY createdAt ASC")
    suspend fun getUnsyncedActions(): List<PendingActionEntity>

    @Query("SELECT * FROM pending_actions ORDER BY createdAt ASC")
    fun getAllActionsFlow(): Flow<List<PendingActionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAction(action: PendingActionEntity)

    @Query("UPDATE pending_actions SET status = :status, retryCount = :retryCount, lastErrorMessage = :error WHERE id = :id")
    suspend fun updateActionStatus(id: String, status: String, retryCount: Int, error: String?)

    @Query("DELETE FROM pending_actions WHERE id = :id")
    suspend fun deleteActionById(id: String)

    @Query("SELECT COUNT(*) FROM pending_actions WHERE status != 'SYNCED'")
    fun getPendingCountFlow(): Flow<Int>
}

@Dao
interface ReceiptDao {
    @Query("SELECT * FROM receipts WHERE sessionId = :sessionId LIMIT 1")
    fun getReceiptBySessionId(sessionId: String): Flow<ReceiptEntity?>

    @Query("SELECT * FROM receipts WHERE id = :id LIMIT 1")
    suspend fun getReceiptById(id: String): ReceiptEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReceipt(receipt: ReceiptEntity)

    @Query("UPDATE receipts SET isPendingConfirmation = 0 WHERE sessionId = :sessionId")
    suspend fun markReceiptConfirmed(sessionId: String)
}
