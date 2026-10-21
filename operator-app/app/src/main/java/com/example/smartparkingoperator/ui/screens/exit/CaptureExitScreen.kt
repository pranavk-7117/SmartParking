package com.example.smartparkingoperator.ui.screens.exit

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.example.smartparkingoperator.data.local.entity.ActiveSessionEntity
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import com.example.smartparkingoperator.data.repository.ParkingRepository
import com.example.smartparkingoperator.feature.camera.CameraViewfinder
import com.example.smartparkingoperator.theme.AppBackground
import com.example.smartparkingoperator.theme.AppSurface
import com.example.smartparkingoperator.theme.BorderDivider
import com.example.smartparkingoperator.theme.PrimaryAccent
import com.example.smartparkingoperator.theme.StatusError
import com.example.smartparkingoperator.theme.StatusSuccess
import com.example.smartparkingoperator.theme.TextPrimary
import com.example.smartparkingoperator.theme.TextSecondary
import com.example.smartparkingoperator.ui.components.AppPrimaryButton
import com.example.smartparkingoperator.ui.components.AppSecondaryButton
import com.example.smartparkingoperator.ui.components.BadgeStatusType
import com.example.smartparkingoperator.ui.components.StatusBadge
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun CaptureExitScreen(
    parkingRepository: ParkingRepository,
    initialSessionId: String? = null,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    // Screen states
    var queryPlate by remember { mutableStateOf("") }
    var isCameraActive by remember { mutableStateOf(false) }
    var matchedSession by remember { mutableStateOf<ActiveSessionEntity?>(null) }
    var generatedReceipt by remember { mutableStateOf<ReceiptEntity?>(null) }
    var isSearching by remember { mutableStateOf(false) }
    var isProcessingExit by remember { mutableStateOf(false) }
    var searchError by remember { mutableStateOf<String?>(null) }

    val dateTimeFormatter = remember { SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault()) }
    val timeFormatter = remember { SimpleDateFormat("hh:mm a", Locale.getDefault()) }

    // Reactive active sessions from Room
    val activeSessions by parkingRepository.getActiveSessions().collectAsState(initial = emptyList())

    // Auto-refresh active sessions & rates on screen load
    LaunchedEffect(Unit) {
        parkingRepository.refreshLocationAndRates()
    }

    // If deep-linked with initialSessionId, resolve session immediately
    LaunchedEffect(initialSessionId) {
        if (!initialSessionId.isNullOrBlank()) {
            val session = parkingRepository.getActiveSessionById(initialSessionId)
            if (session != null) {
                matchedSession = session
                queryPlate = session.vehicleNumber
                isCameraActive = false
            }
        }
    }

    val handlePlateSearch: (String) -> Unit = { plateToSearch: String ->
        isSearching = true
        searchError = null
        coroutineScope.launch {
            val clean = plateToSearch.trim().uppercase().replace("[^A-Z0-9]".toRegex(), "")
            val session = parkingRepository.getActiveSessionByPlate(clean)
            isSearching = false
            if (session != null) {
                matchedSession = session
                queryPlate = session.vehicleNumber
                isCameraActive = false
            } else {
                searchError = "No active session found for plate $clean in local records"
            }
        }
    }

    val filteredSessions = remember(activeSessions, queryPlate) {
        if (queryPlate.isBlank()) {
            activeSessions
        } else {
            val cleanQuery = queryPlate.trim().uppercase().replace("[^A-Z0-9]".toRegex(), "")
            activeSessions.filter { session ->
                session.vehicleNumber.contains(cleanQuery, ignoreCase = true) ||
                session.slotCode.contains(queryPlate.trim(), ignoreCase = true)
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        // App Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = {
                    when {
                        generatedReceipt != null -> onNavigateBack()
                        matchedSession != null -> matchedSession = null
                        isCameraActive -> isCameraActive = false
                        else -> onNavigateBack()
                    }
                }
            ) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = TextPrimary
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when {
                        generatedReceipt != null -> "Parking Receipt"
                        matchedSession != null -> "Confirm Vehicle Exit"
                        isCameraActive -> "Scan License Plate"
                        else -> "Process Vehicle Exit"
                    },
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                if (generatedReceipt == null && matchedSession == null && !isCameraActive) {
                    Text(
                        text = "${activeSessions.size} active vehicle(s) parked",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        }

        when {
            generatedReceipt != null -> {
                // STEP 3: Receipt Screen
                val receipt = generatedReceipt!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = AppSurface),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderDivider, RoundedCornerShape(12.dp))
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Receipt,
                                contentDescription = null,
                                tint = PrimaryAccent,
                                modifier = Modifier.size(36.dp)
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "SMART PARKING RECEIPT",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )

                            if (receipt.isPendingConfirmation) {
                                Spacer(modifier = Modifier.height(8.dp))
                                StatusBadge(
                                    text = "Pending Server Confirmation",
                                    statusType = BadgeStatusType.PENDING,
                                    icon = Icons.Default.HourglassEmpty
                                )
                            } else {
                                Spacer(modifier = Modifier.height(8.dp))
                                StatusBadge(
                                    text = "Server Confirmed",
                                    statusType = BadgeStatusType.SUCCESS,
                                    icon = Icons.Default.CheckCircle
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                            HorizontalDivider(color = BorderDivider)
                            Spacer(modifier = Modifier.height(16.dp))

                            ReceiptLineItem("Vehicle Plate", receipt.vehicleNumber, isBold = true)
                            ReceiptLineItem("Operator ID", receipt.operatorId)
                            ReceiptLineItem("In-Time", dateTimeFormatter.format(Date(receipt.inTime)))
                            ReceiptLineItem("Out-Time", dateTimeFormatter.format(Date(receipt.outTime)))
                            ReceiptLineItem("Duration", "${receipt.durationMinutes} mins")
                            ReceiptLineItem("Tariff Applied", "₹${String.format(Locale.US, "%.2f", receipt.ratePerHour)}/hr")

                            Spacer(modifier = Modifier.height(12.dp))
                            HorizontalDivider(color = BorderDivider)
                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "TOTAL PAYABLE",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "₹${String.format(Locale.US, "%.2f", receipt.amount)}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = PrimaryAccent
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    AppPrimaryButton(
                        text = "Done & Return to Home",
                        onClick = onNavigateBack
                    )
                }
            }

            matchedSession != null -> {
                // STEP 2: Matched Session Confirmation
                val session = matchedSession!!
                val parkedMins = ((System.currentTimeMillis() - session.inTime) / 60000L).coerceAtLeast(0)
                val durationText = if (parkedMins >= 60) "${parkedMins / 60}h ${parkedMins % 60}m" else "${parkedMins}m"

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Active Session Selected",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Card(
                        colors = CardDefaults.cardColors(containerColor = AppSurface),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderDivider, RoundedCornerShape(12.dp))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            ReceiptLineItem("Vehicle Plate", session.vehicleNumber, isBold = true)
                            ReceiptLineItem("Category", session.vehicleType)
                            ReceiptLineItem("Slot Allocated", session.slotCode)
                            ReceiptLineItem("Entry Time", dateTimeFormatter.format(Date(session.inTime)))
                            ReceiptLineItem("Parked Duration", "$parkedMins mins (~$durationText)")
                        }
                    }

                    if (searchError != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = searchError!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = StatusError
                        )
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    if (isProcessingExit) {
                        CircularProgressIndicator(
                            color = PrimaryAccent,
                            modifier = Modifier.size(48.dp)
                        )
                    } else {
                        AppPrimaryButton(
                            text = "Compute Bill & Complete Exit",
                            onClick = {
                                isProcessingExit = true
                                coroutineScope.launch {
                                    val res = parkingRepository.confirmExit(session)
                                    isProcessingExit = false
                                    res.fold(
                                        onSuccess = { r -> generatedReceipt = r },
                                        onFailure = { e -> searchError = e.localizedMessage }
                                    )
                                }
                            }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        AppSecondaryButton(
                            text = "Select Different Vehicle",
                            onClick = {
                                matchedSession = null
                                searchError = null
                            }
                        )
                    }
                }
            }

            isCameraActive -> {
                // Camera Viewfinder Mode
                Box(modifier = Modifier.fillMaxSize()) {
                    if (hasCameraPermission) {
                        CameraViewfinder(
                            onPlateRecognized = { plate ->
                                queryPlate = plate
                                handlePlateSearch(plate)
                            }
                        )
                    } else {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Camera permission needed for scanning",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            AppPrimaryButton(
                                text = "Grant Permission",
                                onClick = { launcher.launch(Manifest.permission.CAMERA) }
                            )
                        }
                    }

                    // Floating close button to return to sessions list
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .background(AppSurface.copy(alpha = 0.95f))
                            .border(1.dp, BorderDivider)
                            .padding(16.dp)
                    ) {
                        AppSecondaryButton(
                            text = "Back to Active Vehicle List",
                            onClick = { isCameraActive = false }
                        )
                    }
                }
            }

            else -> {
                // STEP 1: Active Sessions List + Search Bar + Camera Scanner Trigger
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Search Bar
                    OutlinedTextField(
                        value = queryPlate,
                        onValueChange = {
                            queryPlate = it.uppercase()
                            searchError = null
                        },
                        label = { Text("Search Plate / Slot") },
                        placeholder = { Text("e.g. MH12WP or A-01") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Characters,
                            imeAction = ImeAction.Search
                        ),
                        keyboardActions = KeyboardActions(
                            onSearch = {
                                if (queryPlate.isNotBlank()) {
                                    handlePlateSearch(queryPlate)
                                }
                            }
                        ),
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = "Search",
                                tint = TextSecondary
                            )
                        },
                        trailingIcon = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (queryPlate.isNotBlank()) {
                                    IconButton(onClick = { queryPlate = "" }) {
                                        Icon(
                                            imageVector = Icons.Default.Close,
                                            contentDescription = "Clear",
                                            tint = TextSecondary
                                        )
                                    }
                                }
                                IconButton(onClick = { isCameraActive = true }) {
                                    Icon(
                                        imageVector = Icons.Default.CameraAlt,
                                        contentDescription = "Scan with Camera",
                                        tint = PrimaryAccent
                                    )
                                }
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PrimaryAccent,
                            unfocusedBorderColor = BorderDivider,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = PrimaryAccent
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp)
                    )

                    // Quick Camera Scan Action Card
                    Card(
                        colors = CardDefaults.cardColors(containerColor = AppSurface),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp)
                            .border(1.dp, BorderDivider, RoundedCornerShape(10.dp))
                            .clickable { isCameraActive = true }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.CameraAlt,
                                    contentDescription = null,
                                    tint = PrimaryAccent,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Scan License Plate with Camera",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = PrimaryAccent
                                )
                            }
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = null,
                                tint = TextSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    if (searchError != null) {
                        Text(
                            text = searchError!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = StatusError,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                        )
                    }

                    // Section Title
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (queryPlate.isNotBlank()) "Search Results (${filteredSessions.size})" else "Active Parked Vehicles (${activeSessions.size})",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        if (filteredSessions.isNotEmpty()) {
                            Text(
                                text = "1-Tap to Exit",
                                style = MaterialTheme.typography.labelMedium,
                                color = PrimaryAccent,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    if (filteredSessions.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.DirectionsCar,
                                    contentDescription = null,
                                    tint = TextSecondary,
                                    modifier = Modifier.size(44.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = if (queryPlate.isNotBlank()) "No session matches \"$queryPlate\"" else "No Active Parked Vehicles",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = if (queryPlate.isNotBlank())
                                        "Check the vehicle number or try searching the server directly."
                                    else
                                        "All parking bays at this location are currently vacant.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary
                                )
                                if (queryPlate.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(16.dp))
                                    AppSecondaryButton(
                                        text = "Search Server for \"$queryPlate\"",
                                        onClick = { handlePlateSearch(queryPlate) }
                                    )
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(filteredSessions, key = { it.id }) { session ->
                                ActiveSessionExitCard(
                                    session = session,
                                    timeFormatter = timeFormatter,
                                    onSelectSession = {
                                        matchedSession = session
                                        searchError = null
                                    }
                                )
                            }
                            item {
                                Spacer(modifier = Modifier.height(24.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiveSessionExitCard(
    session: ActiveSessionEntity,
    timeFormatter: SimpleDateFormat,
    onSelectSession: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = AppSurface),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderDivider, RoundedCornerShape(12.dp))
            .clickable { onSelectSession() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(
                            PrimaryAccent.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(10.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (session.vehicleType == "CAR") Icons.Default.DirectionsCar else Icons.Default.TwoWheeler,
                        contentDescription = session.vehicleType,
                        tint = PrimaryAccent,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = session.vehicleNumber,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Slot: ${session.slotCode} • In: ${timeFormatter.format(Date(session.inTime))}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    val parkedMins = ((System.currentTimeMillis() - session.inTime) / 60000L).coerceAtLeast(0)
                    val durationText = if (parkedMins >= 60) "${parkedMins / 60}h ${parkedMins % 60}m" else "${parkedMins}m"
                    Text(
                        text = "Parked ~$durationText ago",
                        style = MaterialTheme.typography.labelSmall,
                        color = PrimaryAccent
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Exit Action Pill
            Box(
                modifier = Modifier
                    .background(PrimaryAccent, shape = RoundedCornerShape(8.dp))
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Exit",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ReceiptLineItem(
    label: String,
    value: String,
    isBold: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            modifier = Modifier.weight(0.45f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = TextPrimary,
            modifier = Modifier.weight(0.55f)
        )
    }
}
