package com.example.smartparkingoperator.ui.screens.sessions

import android.Manifest
import android.os.Build
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.smartparkingoperator.data.local.entity.ActiveSessionEntity
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import com.example.smartparkingoperator.data.printer.BluetoothPrinterManager
import com.example.smartparkingoperator.data.repository.ParkingRepository
import com.example.smartparkingoperator.theme.AppBackground
import com.example.smartparkingoperator.theme.AppSurface
import com.example.smartparkingoperator.theme.BorderDivider
import com.example.smartparkingoperator.theme.PrimaryAccent
import com.example.smartparkingoperator.theme.StatusError
import com.example.smartparkingoperator.theme.StatusSuccess
import com.example.smartparkingoperator.theme.SurfaceHover
import com.example.smartparkingoperator.theme.TextPrimary
import com.example.smartparkingoperator.theme.TextSecondary
import com.example.smartparkingoperator.ui.components.AppPrimaryButton
import com.example.smartparkingoperator.ui.components.AppSecondaryButton
import com.example.smartparkingoperator.ui.components.BadgeStatusType
import com.example.smartparkingoperator.ui.components.StatusBadge
import com.example.smartparkingoperator.ui.components.ThermalReceiptCard
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ActiveSessionsScreen(
    parkingRepository: ParkingRepository,
    printerManager: BluetoothPrinterManager? = null,
    onNavigateBack: () -> Unit,
    onSelectSessionForExit: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    val sessions by parkingRepository.getActiveSessions().collectAsState(initial = emptyList())
    val receipts by parkingRepository.getAllReceipts().collectAsState(initial = emptyList())
    val timeFormatter = remember { SimpleDateFormat("hh:mm a", Locale.getDefault()) }
    val dateTimeFormatter = remember { SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()) }

    var selectedTab by remember { mutableStateOf(0) } // 0 = Active Sessions, 1 = Past Receipts
    var viewingReceipt by remember { mutableStateOf<ReceiptEntity?>(null) }

    // Printing state for receipt dialog
    var isPrinting by remember { mutableStateOf(false) }
    var printStatusMessage by remember { mutableStateOf<String?>(null) }
    var isPrintError by remember { mutableStateOf(false) }

    val btPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { _ -> }

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
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (selectedTab == 0) "Active Parked Vehicles" else "Historical Receipts",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = if (selectedTab == 0) "${sessions.size} vehicle(s) parked" else "${receipts.size} receipt(s) issued",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }
        }

        // Tabs: Active Vehicles vs Past Receipts
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .background(SurfaceHover, RoundedCornerShape(10.dp))
                .padding(4.dp)
        ) {
            listOf("Active Vehicles (${sessions.size})", "Past Receipts (${receipts.size})").forEachIndexed { idx, title ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .background(
                            if (selectedTab == idx) AppBackground else Color.Transparent,
                            RoundedCornerShape(8.dp)
                        )
                        .clickable { selectedTab = idx }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (selectedTab == idx) FontWeight.Bold else FontWeight.Medium,
                        color = if (selectedTab == idx) PrimaryAccent else TextSecondary
                    )
                }
            }
        }

        if (selectedTab == 0) {
            // TAB 0: Active Sessions
            if (sessions.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.DirectionsCar,
                            contentDescription = null,
                            tint = TextSecondary,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No Active Vehicles",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "All bays at this location are currently vacant.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(sessions, key = { it.id }) { session ->
                        ActiveSessionItem(
                            session = session,
                            timeFormatter = timeFormatter,
                            onClick = { onSelectSessionForExit(session.id) }
                        )
                    }
                }
            }
        } else {
            // TAB 1: Past Receipts
            if (receipts.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Receipt,
                            contentDescription = null,
                            tint = TextSecondary,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No Receipts Issued Yet",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Receipts from exited vehicles will appear here.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(receipts, key = { it.id }) { receipt ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = AppSurface),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, BorderDivider, RoundedCornerShape(10.dp))
                                .clickable {
                                    viewingReceipt = receipt
                                    printStatusMessage = null
                                    isPrintError = false
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(
                                        imageVector = Icons.Default.Receipt,
                                        contentDescription = null,
                                        tint = PrimaryAccent,
                                        modifier = Modifier.size(26.dp)
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = receipt.vehicleNumber,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Text(
                                            text = "${receipt.ticketId.ifBlank { "PK-" + receipt.sessionId.take(8).uppercase() }} • ${dateTimeFormatter.format(Date(receipt.outTime))}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary
                                        )
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "₹${String.format(Locale.US, "%.2f", receipt.amount)}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = PrimaryAccent
                                    )
                                    Text(
                                        text = "Tap to View",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal Receipt Dialog for viewing & reprinting
    if (viewingReceipt != null) {
        val receipt = viewingReceipt!!
        Dialog(
            onDismissRequest = { viewingReceipt = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = AppBackground),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, BorderDivider, RoundedCornerShape(16.dp))
                ) {
                    Column(
                        modifier = Modifier
                            .padding(16.dp)
                            .verticalScroll(rememberScrollState()),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "View / Reprint Receipt",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            IconButton(onClick = { viewingReceipt = null }) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Close",
                                    tint = TextSecondary
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        ThermalReceiptCard(receipt = receipt)

                        if (printStatusMessage != null) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = printStatusMessage!!,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = if (isPrintError) StatusError else StatusSuccess
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        AppPrimaryButton(
                            text = if (isPrinting) "Printing..." else "Print Bill (Bluetooth)",
                            onClick = {
                                val pm = printerManager
                                if (pm == null) {
                                    printStatusMessage = "Printer service not available"
                                    isPrintError = true
                                } else if (!pm.hasBluetoothPermissions()) {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        btPermissionLauncher.launch(
                                            arrayOf(
                                                Manifest.permission.BLUETOOTH_CONNECT,
                                                Manifest.permission.BLUETOOTH_SCAN
                                            )
                                        )
                                    } else {
                                        btPermissionLauncher.launch(
                                            arrayOf(
                                                Manifest.permission.BLUETOOTH,
                                                Manifest.permission.BLUETOOTH_ADMIN
                                            )
                                        )
                                    }
                                } else if (!pm.isBluetoothEnabled()) {
                                    printStatusMessage = "Please turn on Bluetooth"
                                    isPrintError = true
                                } else if (!pm.isConnected) {
                                    val paired = pm.getPairedDevices()
                                    if (paired.isEmpty()) {
                                        printStatusMessage = "No paired printer found"
                                        isPrintError = true
                                    } else {
                                        isPrinting = true
                                        printStatusMessage = "Connecting..."
                                        isPrintError = false
                                        coroutineScope.launch {
                                            val cRes = pm.connect(paired.first())
                                            if (cRes.isSuccess) {
                                                val pRes = pm.printReceipt(receipt)
                                                isPrinting = false
                                                if (pRes.isSuccess) {
                                                    printStatusMessage = "Receipt printed successfully!"
                                                    isPrintError = false
                                                } else {
                                                    printStatusMessage = pRes.exceptionOrNull()?.message ?: "Print failed"
                                                    isPrintError = true
                                                }
                                            } else {
                                                isPrinting = false
                                                printStatusMessage = cRes.exceptionOrNull()?.message ?: "Connect failed"
                                                isPrintError = true
                                            }
                                        }
                                    }
                                } else {
                                    isPrinting = true
                                    coroutineScope.launch {
                                        val pRes = pm.printReceipt(receipt)
                                        isPrinting = false
                                        if (pRes.isSuccess) {
                                            printStatusMessage = "Receipt printed successfully!"
                                            isPrintError = false
                                        } else {
                                            printStatusMessage = pRes.exceptionOrNull()?.message ?: "Print failed"
                                            isPrintError = true
                                        }
                                    }
                                }
                            }
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        AppSecondaryButton(
                            text = "Close",
                            onClick = { viewingReceipt = null }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ActiveSessionItem(
    session: ActiveSessionEntity,
    timeFormatter: SimpleDateFormat,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = AppSurface),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderDivider, RoundedCornerShape(10.dp))
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Icon(
                    imageVector = if (session.vehicleType == "CAR") Icons.Default.DirectionsCar else Icons.Default.TwoWheeler,
                    contentDescription = session.vehicleType,
                    tint = PrimaryAccent,
                    modifier = Modifier.size(28.dp)
                )

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = session.vehicleNumber,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Slot: ${session.slotCode} • In: ${timeFormatter.format(Date(session.inTime))}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        maxLines = 1
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                if (session.isPendingSync) {
                    StatusBadge(
                        text = "Pending Sync",
                        statusType = BadgeStatusType.PENDING,
                        icon = Icons.Default.HourglassEmpty
                    )
                } else {
                    StatusBadge(
                        text = "Synced",
                        statusType = BadgeStatusType.SUCCESS,
                        icon = Icons.Default.CheckCircle
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = "Process Exit",
                    tint = TextSecondary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
