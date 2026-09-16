package com.example.smartparkingoperator

import android.app.Application
import com.example.smartparkingoperator.data.local.AppDatabase
import com.example.smartparkingoperator.data.network.ConnectivityObserver
import com.example.smartparkingoperator.data.remote.ApiClient
import com.example.smartparkingoperator.data.remote.ApiService
import com.example.smartparkingoperator.data.repository.AuthRepository
import com.example.smartparkingoperator.data.repository.ParkingRepository
import com.example.smartparkingoperator.data.security.SecureSessionManager
import com.example.smartparkingoperator.data.sync.SyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class AppContainer(application: Application) {
    val database: AppDatabase = AppDatabase.getDatabase(application)
    val sessionManager: SecureSessionManager = SecureSessionManager(application)
    val connectivityObserver: ConnectivityObserver = ConnectivityObserver(application)
    val apiService: ApiService = ApiClient.create(sessionManager)

    val parkingRepository: ParkingRepository = ParkingRepository(
        database = database,
        apiService = apiService,
        sessionManager = sessionManager,
        connectivityObserver = connectivityObserver
    )

    val authRepository: AuthRepository = AuthRepository(
        apiService = apiService,
        sessionManager = sessionManager,
        connectivityObserver = connectivityObserver,
        parkingRepository = parkingRepository
    )
}

class SmartParkingApplication : Application() {

    lateinit var container: AppContainer
        private set

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)

        // Schedule periodic sync via WorkManager
        SyncWorker.schedulePeriodicSync(this)

        // Connectivity awareness: listen for network transitions and immediately sync upon reconnection
        applicationScope.launch {
            container.connectivityObserver.observe().collectLatest { isConnected ->
                if (isConnected) {
                    SyncWorker.scheduleImmediateSync(this@SmartParkingApplication)
                    container.parkingRepository.refreshLocationAndRates()
                }
            }
        }
    }
}
