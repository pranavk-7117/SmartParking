package com.example.smartparkingoperator.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Apartment
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.smartparkingoperator.data.network.ConnectivityObserver
import com.example.smartparkingoperator.data.remote.dto.NotificationDto
import com.example.smartparkingoperator.data.remote.dto.TodaySummaryDto
import com.example.smartparkingoperator.data.repository.AuthRepository
import com.example.smartparkingoperator.data.repository.ParkingRepository
import com.example.smartparkingoperator.theme.StatusWarning
import com.example.smartparkingoperator.ui.components.PersistentOfflineBanner
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val ScreenBackground = Color(0xFFF8FAFC)
private val CardWhite = Color.White
private val TextDark = Color(0xFF0F172A)
private val TextMuted = Color(0xFF475569)
private val TextLight = Color(0xFF94A3B8)
private val BrandBlue = Color(0xFF2563EB)
private val BrandBlueLight = Color(0xFFEFF6FF)
private val BrandGreen = Color(0xFF16A34A)
private val BrandGreenBg = Color(0xFFDCFCE7)

@Composable
fun HomeScreen(
    parkingRepository: ParkingRepository,
    authRepository: AuthRepository,
    connectivityObserver: ConnectivityObserver,
    onNavigateToEntry: () -> Unit,
    onNavigateToExit: () -> Unit,
    onNavigateToSessions: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val location by parkingRepository.getLocation().collectAsState(initial = null)
    val availability by parkingRepository.getFirstAvailability().collectAsState(initial = null)
    val activeSessions by parkingRepository.getActiveSessions().collectAsState(initial = emptyList())
    val isOnline by connectivityObserver.observe().collectAsState(initial = connectivityObserver.isConnected())
    val pendingCount by parkingRepository.getPendingActionCount().collectAsState(initial = 0)
    val coroutineScope = rememberCoroutineScope()
    var isManualRefreshing by remember { mutableStateOf(false) }

    // Real backend live metrics & announcements
    var todayStats by remember { mutableStateOf<TodaySummaryDto?>(null) }
    var notifications by remember { mutableStateOf<List<NotificationDto>>(emptyList()) }
    var showNotificationsDialog by remember { mutableStateOf(false) }

    val todayDateFormatted = SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(Date())

    // Real-time synchronization loop: every 5 seconds
    LaunchedEffect(Unit) {
        while (true) {
            try {
                parkingRepository.syncPendingActions()
                parkingRepository.refreshLocationAndRates()
                
                parkingRepository.getTodaySummary().fold(
                    onSuccess = { todayStats = it },
                    onFailure = { /* keep cached */ }
                )
                parkingRepository.getNotifications().fold(
                    onSuccess = { notifications = it },
                    onFailure = { /* keep cached */ }
                )
            } catch (_: Exception) {}
            delay(5000)
        }
    }

    val carVacant = availability?.carVacant ?: 30
    val carTotal = 40
    val scooterVacant = availability?.scooterVacant ?: 15
    val scooterTotal = 20
    val totalVacant = availability?.totalVacant ?: (carVacant + scooterVacant)
    val totalSlots = 60

    val currencyFormat = NumberFormat.getNumberInstance(Locale.US)

    val liveEntries = todayStats?.entries ?: 0
    val liveExits = todayStats?.exits ?: 0
    val liveCurrentlyParked = todayStats?.currentlyParked ?: activeSessions.size
    val liveRevenue = todayStats?.todayRevenue ?: 0

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(ScreenBackground)
    ) {
        // Persistent Unobtrusive Offline Banner
        PersistentOfflineBanner(isOffline = !isOnline, pendingCount = pendingCount)

        // ── Main Dashboard (Scrollable with smooth fit) ───
        val scrollState = rememberScrollState()
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // ── 1. Compact Header ─────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(BrandBlue)
                            .clickable { onNavigateToSettings() },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = authRepository.getOperatorUsername().take(1).uppercase(),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column {
                        Text(
                            text = authRepository.getOperatorUsername().replaceFirstChar { it.uppercase() },
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = TextDark,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Gate Operator",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                            Text(
                                text = " • ",
                                fontSize = 10.sp,
                                color = TextLight
                            )
                            Box(
                                modifier = Modifier
                                    .size(5.dp)
                                    .clip(CircleShape)
                                    .background(if (isOnline) BrandGreen else StatusWarning)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = if (isOnline) "Online" else "Offline ($pendingCount)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isOnline) BrandGreen else StatusWarning
                            )
                        }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    // Bell with notification indicator
                    Box {
                        IconButton(
                            modifier = Modifier.size(34.dp),
                            onClick = { showNotificationsDialog = true }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "Announcements",
                                tint = TextMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        if (notifications.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(top = 5.dp, end = 5.dp)
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFEF4444))
                            )
                        }
                    }

                    // Settings Gear
                    IconButton(
                        modifier = Modifier.size(34.dp),
                        onClick = onNavigateToSettings
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = TextMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            // ── 2. Facility Card (Never Truncated, Clear Full Name) ────────────
            val assignedLoc = location
            Card(
                colors = CardDefaults.cardColors(containerColor = CardWhite),
                shape = RoundedCornerShape(14.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(14.dp))
                    .clickable { onNavigateToSettings() }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(BrandBlueLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Apartment,
                                contentDescription = null,
                                tint = BrandBlue,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(10.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = assignedLoc?.name ?: "AeroPark – Camp",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.5.sp,
                                color = TextDark,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = TextMuted,
                                    modifier = Modifier.size(11.dp)
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = "Primary Gate • Today, 09 Oct",
                                    fontSize = 10.5.sp,
                                    color = TextMuted
                                )
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(start = 6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(BrandGreenBg)
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(5.dp)
                                        .clip(CircleShape)
                                        .background(BrandGreen)
                                )
                                Spacer(modifier = Modifier.width(3.dp))
                                Text(
                                    text = "Active",
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandGreen
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(2.dp))
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = TextLight,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // ── 3. Live Slot Availability Section ─────────────────────────────
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Live Slot Availability",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = TextDark
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable {
                            coroutineScope.launch {
                                isManualRefreshing = true
                                parkingRepository.syncPendingActions()
                                parkingRepository.refreshLocationAndRates()
                                delay(500)
                                isManualRefreshing = false
                            }
                        }
                    ) {
                        if (isManualRefreshing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(11.dp),
                                strokeWidth = 1.5.dp,
                                color = TextMuted
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = TextMuted,
                                modifier = Modifier.size(12.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "Just now",
                            fontSize = 10.5.sp,
                            color = TextMuted
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AvailabilityMetricCard(
                        icon = {
                            Icon(
                                imageVector = Icons.Default.DirectionsCar,
                                contentDescription = null,
                                tint = BrandBlue,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        count = carVacant,
                        label = "Cars Free",
                        subLabel = "of $carTotal",
                        bgColor = Color(0xFFEFF6FF),
                        borderColor = Color(0xFFDBEAFE),
                        modifier = Modifier.weight(1f)
                    )

                    AvailabilityMetricCard(
                        icon = {
                            Icon(
                                imageVector = Icons.Default.TwoWheeler,
                                contentDescription = null,
                                tint = Color(0xFF9333EA),
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        count = scooterVacant,
                        label = "Scooters Free",
                        subLabel = "of $scooterTotal",
                        bgColor = Color(0xFFFAF5FF),
                        borderColor = Color(0xFFF3E8FF),
                        modifier = Modifier.weight(1f)
                    )

                    AvailabilityMetricCard(
                        icon = {
                            Box(
                                modifier = Modifier
                                    .size(20.dp)
                                    .clip(RoundedCornerShape(5.dp))
                                    .background(BrandGreen),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "P",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 11.5.sp
                                )
                            }
                        },
                        count = totalVacant,
                        label = "Total Free",
                        subLabel = "of $totalSlots",
                        bgColor = Color(0xFFF0FDF4),
                        borderColor = Color(0xFFDCFCE7),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // ── 4. Gate Operations Section ────────────────────────────────────
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Gate Operations",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp,
                        color = TextDark
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.List,
                            contentDescription = null,
                            tint = Color(0xFF6366F1),
                            modifier = Modifier.size(13.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = "Quick Actions",
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF6366F1)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // New Vehicle Entry Card (Clean, Prominent)
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = BrandBlue),
                        modifier = Modifier
                            .weight(1f)
                            .height(96.dp)
                            .clickable { onNavigateToEntry() }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(10.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(RoundedCornerShape(7.dp))
                                        .background(Color.White.copy(alpha = 0.2f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DirectionsCar,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .size(22.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.25f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }

                            Column {
                                Text(
                                    text = "New Vehicle Entry",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color.White
                                )
                                Text(
                                    text = "Camera ANPR or manual",
                                    fontSize = 9.sp,
                                    color = Color.White.copy(alpha = 0.85f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    // Process Vehicle Exit Card (Clean, Prominent)
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = CardWhite),
                        modifier = Modifier
                            .weight(1f)
                            .height(96.dp)
                            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(14.dp))
                            .clickable { onNavigateToExit() }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(10.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(RoundedCornerShape(7.dp))
                                        .background(BrandGreenBg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                                        contentDescription = null,
                                        tint = BrandGreen,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .size(22.dp)
                                        .clip(CircleShape)
                                        .background(BrandBlueLight),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                        contentDescription = null,
                                        tint = BrandBlue,
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }

                            Column {
                                Text(
                                    text = "Process Vehicle Exit",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = TextDark
                                )
                                Text(
                                    text = "Search, scan or quick exit",
                                    fontSize = 9.sp,
                                    color = TextMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }

            // ── 5. Active Parked Vehicles Strip ───────────────────────────────
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardWhite),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                    .clickable { onNavigateToSessions() }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(BrandBlueLight),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.FormatListBulleted,
                                contentDescription = null,
                                tint = BrandBlue,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Active Parked Vehicles",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = TextDark
                            )
                            Text(
                                text = "$liveCurrentlyParked vehicles currently in facility",
                                fontSize = 10.5.sp,
                                color = TextMuted
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(BrandBlueLight)
                            .padding(horizontal = 9.dp, vertical = 4.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "View All",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandBlue
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = BrandBlue,
                                modifier = Modifier.size(12.dp)
                            )
                        }
                    }
                }
            }

            // ── 6. Today's Summary (LIVE DATA - Real Database Values) ──────────
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Today's Summary",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = TextDark
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(11.dp)
                        )
                        Spacer(modifier = Modifier.width(3.dp))
                        Text(
                            text = todayDateFormatted,
                            fontSize = 10.5.sp,
                            color = TextMuted
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color(0xFFF1F5F9), RoundedCornerShape(16.dp))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Col 1: Entries
                        SummaryCol(
                            icon = {
                                Box(
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clip(CircleShape)
                                        .background(BrandGreenBg),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowUpward,
                                        contentDescription = null,
                                        tint = BrandGreen,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            },
                            value = "$liveEntries",
                            label = "Entries",
                            modifier = Modifier.weight(1f)
                        )

                        VerticalDivider(
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier.height(34.dp)
                        )

                        // Col 2: Exits
                        SummaryCol(
                            icon = {
                                Box(
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFFEE2E2)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ArrowDownward,
                                        contentDescription = null,
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            },
                            value = "$liveExits",
                            label = "Exits",
                            modifier = Modifier.weight(1f)
                        )

                        VerticalDivider(
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier.height(34.dp)
                        )

                        // Col 3: Currently Parked
                        SummaryCol(
                            icon = {
                                Box(
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFFFEF3C7)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DirectionsCar,
                                        contentDescription = null,
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            },
                            value = "$liveCurrentlyParked",
                            label = "Parked",
                            modifier = Modifier.weight(1f)
                        )

                        VerticalDivider(
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier.height(34.dp)
                        )

                        // Col 4: Today's Revenue
                        SummaryCol(
                            icon = {
                                Box(
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clip(CircleShape)
                                        .background(BrandBlueLight),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "₹",
                                        color = BrandBlue,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                }
                            },
                            value = currencyFormat.format(liveRevenue),
                            label = "Revenue",
                            modifier = Modifier.weight(1.1f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))
            }
        }

        // ── 7. Compact Bottom Navigation Bar ─────────────────────────────────
        Surface(
            color = CardWhite,
            shadowElevation = 8.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column {
                HorizontalDivider(color = Color(0xFFE2E8F0))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 3.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BottomNavItem(
                        icon = Icons.Default.Home,
                        label = "Home",
                        isSelected = true,
                        onClick = { /* Home */ }
                    )
                    BottomNavItem(
                        icon = Icons.Default.DirectionsCar,
                        label = "Entry",
                        isSelected = false,
                        onClick = onNavigateToEntry
                    )
                    BottomNavItem(
                        icon = Icons.AutoMirrored.Filled.ExitToApp,
                        label = "Exit",
                        isSelected = false,
                        onClick = onNavigateToExit
                    )
                    BottomNavItem(
                        icon = Icons.AutoMirrored.Filled.FormatListBulleted,
                        label = "Vehicles",
                        isSelected = false,
                        onClick = onNavigateToSessions
                    )
                    BottomNavItem(
                        icon = Icons.Default.MoreHoriz,
                        label = "More",
                        isSelected = false,
                        onClick = onNavigateToSettings
                    )
                }
            }
        }
    }

    // ── Admin Announcements & Notifications Modal Dialog ─────────────────────
    if (showNotificationsDialog) {
        Dialog(onDismissRequest = { showNotificationsDialog = false }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CardWhite),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(BrandBlueLight),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Notifications,
                                    contentDescription = null,
                                    tint = BrandBlue,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Admin Announcements",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = TextDark
                                )
                                Text(
                                    text = "Broadcasts from facility command",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            }
                        }

                        IconButton(
                            modifier = Modifier.size(28.dp),
                            onClick = { showNotificationsDialog = false }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = TextMuted
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    Spacer(modifier = Modifier.height(14.dp))

                    if (notifications.isEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = null,
                                tint = TextLight,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No Active Announcements",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                                color = TextDark
                            )
                            Text(
                                text = "All messages sent by admin will appear here.",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.height(300.dp)
                        ) {
                            items(notifications) { notif ->
                                val isUrgent = notif.priority.equals("URGENT", ignoreCase = true)
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isUrgent) Color(0xFFFEF2F2) else Color(0xFFF8FAFC)
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(
                                            1.dp,
                                            if (isUrgent) Color(0xFFFECACA) else Color(0xFFE2E8F0),
                                            RoundedCornerShape(12.dp)
                                        )
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = notif.title,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.5.sp,
                                                color = if (isUrgent) Color(0xFFDC2626) else TextDark,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(6.dp))
                                                    .background(
                                                        if (isUrgent) Color(0xFFFEE2E2) else BrandBlueLight
                                                    )
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = notif.priority,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (isUrgent) Color(0xFFDC2626) else BrandBlue
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = notif.message,
                                            fontSize = 12.sp,
                                            color = if (isUrgent) Color(0xFF991B1B) else Color(0xFF334155),
                                            lineHeight = 16.sp
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "By ${notif.sender}",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = TextLight
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Reusable Component Helpers ───────────────────────────────────────────────

@Composable
private fun AvailabilityMetricCard(
    icon: @Composable () -> Unit,
    count: Int,
    label: String,
    subLabel: String,
    bgColor: Color,
    borderColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
            .border(1.dp, borderColor, RoundedCornerShape(12.dp))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp, horizontal = 2.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            icon()
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "$count",
                fontWeight = FontWeight.Black,
                fontSize = 17.sp,
                color = TextDark
            )
            Spacer(modifier = Modifier.height(1.dp))
            Text(
                text = label,
                fontSize = 9.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextDark,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subLabel,
                fontSize = 9.sp,
                color = TextLight,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun SummaryCol(
    icon: @Composable () -> Unit,
    value: String,
    label: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(horizontal = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        icon()
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = TextDark
        )
        Spacer(modifier = Modifier.height(1.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = TextMuted,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun BottomNavItem(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val tint = if (isSelected) BrandBlue else TextLight
    Column(
        modifier = Modifier
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = tint,
            modifier = Modifier.size(19.dp)
        )
        Spacer(modifier = Modifier.height(1.dp))
        Text(
            text = label,
            fontSize = 9.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
            color = tint
        )
    }
}
