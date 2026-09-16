package com.example.smartparkingoperator.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.smartparkingoperator.data.local.dao.ActiveSessionDao
import com.example.smartparkingoperator.data.local.dao.AvailabilityDao
import com.example.smartparkingoperator.data.local.dao.LocationDao
import com.example.smartparkingoperator.data.local.dao.PendingActionDao
import com.example.smartparkingoperator.data.local.dao.RateDao
import com.example.smartparkingoperator.data.local.dao.ReceiptDao
import com.example.smartparkingoperator.data.local.entity.ActiveSessionEntity
import com.example.smartparkingoperator.data.local.entity.LocationAssignmentEntity
import com.example.smartparkingoperator.data.local.entity.PendingActionEntity
import com.example.smartparkingoperator.data.local.entity.RateMasterEntity
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import com.example.smartparkingoperator.data.local.entity.SlotAvailabilityEntity

@Database(
    entities = [
        LocationAssignmentEntity::class,
        SlotAvailabilityEntity::class,
        RateMasterEntity::class,
        ActiveSessionEntity::class,
        PendingActionEntity::class,
        ReceiptEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun locationDao(): LocationDao
    abstract fun availabilityDao(): AvailabilityDao
    abstract fun rateDao(): RateDao
    abstract fun activeSessionDao(): ActiveSessionDao
    abstract fun pendingActionDao(): PendingActionDao
    abstract fun receiptDao(): ReceiptDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smart_parking_operator.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
