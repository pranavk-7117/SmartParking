package com.example.smartparkingoperator.ui.screens.exit

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
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
import com.example.smartparkingoperator.theme.StatusPending
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
    var isCameraActive by remember { mutableStateOf(initialSessionId == null) }
    var matchedSession by remember { mutableStateOf<ActiveSessionEntity?>(null) }
    var generatedReceipt by remember { mutableStateOf<ReceiptEntity?>(null) }
    var isSearching by remember { mutableStateOf(false) }
    var isProcessingExit by remember { mutableStateOf(false) }
    var searchError by remember { mutableStateOf<String?>(null) }

    val dateTimeFormatter = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.getDefault())

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
                searchError = "No active session found for plate $clean in local cache"
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
            IconButton(onClick = onNavigateBack) {
                Icon(
                    imageVector = Icons.Default.ArrowBack,
                    contentDescription = "Back",
                    tint = TextPrimary
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (generatedReceipt != null) "Parking Receipt" else "Vehicle Exit",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }

        if (generatedReceipt != null) {
            // STEP 3: Receipt Screen
            val receipt = generatedReceipt!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Receipt Card
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

                        // If captured offline, visually indicate "Pending Confirmation"
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
        } else if (matchedSession != null) {
            // STEP 2: Matched Session Confirmation
            val session = matchedSession!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Active Session Found",
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
                    }
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
                        text = "Scan Different Vehicle",
                        onClick = {
                            matchedSession = null
                            isCameraActive = true
                        }
                    )
                }
            }
        } else if (isCameraActive) {
            // STEP 1A: Camera Viewfinder
            Box(modifier = Modifier.weight(1f)) {
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
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppSurface)
                    .border(1.dp, BorderDivider)
                    .padding(16.dp)
            ) {
                AppSecondaryButton(
                    text = "Search Plate Manually",
                    onClick = { isCameraActive = false }
                )
            }
        } else {
            // STEP 1B: Manual Search Form
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Search Vehicle Exit",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(20.dp))

                OutlinedTextField(
                    value = queryPlate,
                    onValueChange = {
                        queryPlate = it.uppercase()
                        searchError = null
                    },
                    label = { Text("Vehicle Registration Number") },
                    placeholder = { Text("e.g. KA01AB1234") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Characters
                    ),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PrimaryAccent,
                        unfocusedBorderColor = BorderDivider,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                if (searchError != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = searchError!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = StatusError
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                if (isSearching) {
                    CircularProgressIndicator(
                        color = PrimaryAccent,
                        modifier = Modifier.size(48.dp)
                    )
                } else {
                    AppPrimaryButton(
                        text = "Match Active Session",
                        onClick = { handlePlateSearch(queryPlate) },
                        leadingIcon = Icons.Default.Search
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    AppSecondaryButton(
                        text = "Use Camera Scanner",
                        onClick = { isCameraActive = true }
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
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = TextPrimary
        )
    }
}
