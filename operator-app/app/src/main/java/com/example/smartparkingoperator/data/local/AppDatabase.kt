package com.example.smartparkingoperator.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.smartparkingoperator.data.local.dao.ActiveSessionDao
import com.example.smartparkingoperator.data.local.dao.AvailabilityDao
import com.example.smartparkingoperator.data.local.dao.LocationDao
import com.example.smartparkingoperator.data.local.dao.PendingActionDao
import com.example.smartparkingoperator.data.local.dao.RateDao
import com.example.smartparkingoperator.data.local.dao.ReceiptDao
import com.example.smartparkingoperator.data.local.dao.TodaySummaryDao
import com.example.smartparkingoperator.data.local.entity.ActiveSessionEntity
import com.example.smartparkingoperator.data.local.entity.LocationAssignmentEntity
import com.example.smartparkingoperator.data.local.entity.PendingActionEntity
import com.example.smartparkingoperator.data.local.entity.RateMasterEntity
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import com.example.smartparkingoperator.data.local.entity.SlotAvailabilityEntity
import com.example.smartparkingoperator.data.local.entity.TodaySummaryEntity

/** Migration from version 3 → 4: adds richer receipt fields returned by the backend. */
val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // Add new columns with safe defaults for existing receipts
        db.execSQL("ALTER TABLE receipts ADD COLUMN ticketId TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE receipts ADD COLUMN vehicleType TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE receipts ADD COLUMN slotCode TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE receipts ADD COLUMN siteName TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE receipts ADD COLUMN siteAddress TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE receipts ADD COLUMN durationText TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE receipts ADD COLUMN paymentStatus TEXT NOT NULL DEFAULT 'PAID'")
        db.execSQL("ALTER TABLE receipts ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'Cash / UPI Paid at Exit'")
    }
}

@Database(
    entities = [
        LocationAssignmentEntity::class,
        SlotAvailabilityEntity::class,
        RateMasterEntity::class,
        ActiveSessionEntity::class,
        PendingActionEntity::class,
        ReceiptEntity::class,
        TodaySummaryEntity::class
    ],
    version = 4,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun locationDao(): LocationDao
    abstract fun availabilityDao(): AvailabilityDao
    abstract fun rateDao(): RateDao
    abstract fun activeSessionDao(): ActiveSessionDao
    abstract fun pendingActionDao(): PendingActionDao
    abstract fun receiptDao(): ReceiptDao
    abstract fun todaySummaryDao(): TodaySummaryDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smart_parking_operator.db"
                )
                    .addMigrations(MIGRATION_3_4)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
