package com.example.smartparkingoperator.data.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.core.content.ContextCompat

class LocationTracker(private val context: Context) {

    private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

    @Volatile
    private var cachedLocation: Location? = null

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            cachedLocation = location
        }
        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }

    init {
        startListening()
    }

    fun hasLocationPermission(): Boolean {
        val fineGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fineGranted || coarseGranted
    }

    private fun startListening() {
        if (!hasLocationPermission() || locationManager == null) return

        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000L,
                    5f,
                    locationListener
                )
                val lastGps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                if (lastGps != null) cachedLocation = lastGps
            }

            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    5000L,
                    5f,
                    locationListener
                )
                val lastNet = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (lastNet != null && cachedLocation == null) cachedLocation = lastNet
            }
        } catch (_: SecurityException) {
            // Permission revoked
        } catch (_: Exception) {}
    }

    fun getCurrentLocation(): Location? {
        if (!hasLocationPermission() || locationManager == null) return null

        try {
            var bestLocation: Location? = cachedLocation

            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                val gpsLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                if (gpsLoc != null && (bestLocation == null || gpsLoc.time > bestLocation.time)) {
                    bestLocation = gpsLoc
                }
            }

            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                val netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (netLoc != null && (bestLocation == null || netLoc.time > bestLocation.time)) {
                    bestLocation = netLoc
                }
            }

            cachedLocation = bestLocation
            return bestLocation
        } catch (_: SecurityException) {
            return null
        } catch (_: Exception) {
            return cachedLocation
        }
    }
}
