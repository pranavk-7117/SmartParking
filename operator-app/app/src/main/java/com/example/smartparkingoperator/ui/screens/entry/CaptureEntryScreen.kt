package com.example.smartparkingoperator.ui.screens.entry

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
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
import kotlinx.coroutines.launch

@Composable
fun CaptureEntryScreen(
    parkingRepository: ParkingRepository,
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

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            launcher.launch(Manifest.permission.CAMERA)
        }
    }

    // Capture / Confirmation Flow States
    var recognizedPlate by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("CAR") } // "CAR" or "SCOOTER"
    var isConfirmedStep by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        // Top App Bar
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
                text = "Vehicle Entry",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }

        if (!isConfirmedStep) {
            // STEP 1: Camera Viewfinder & OCR Capture
            Box(modifier = Modifier.weight(1f)) {
                if (hasCameraPermission) {
                    CameraViewfinder(
                        onPlateRecognized = { plate ->
                            recognizedPlate = plate
                            isConfirmedStep = true
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
                            text = "Camera permission is required for automatic plate recognition",
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        AppPrimaryButton(
                            text = "Grant Camera Permission",
                            onClick = { launcher.launch(Manifest.permission.CAMERA) }
                        )
                    }
                }
            }

            // Bottom Manual Fallback Option
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppSurface)
                    .border(1.dp, BorderDivider)
                    .padding(16.dp)
            ) {
                AppSecondaryButton(
                    text = "Enter Plate Manually",
                    onClick = {
                        recognizedPlate = ""
                        isConfirmedStep = true
                    }
                )
            }
        } else {
            // STEP 2: Operator Review, Edit & Category Selection
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Verify License Plate",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Text(
                    text = "Inspect the recognized plate before confirming entry",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Editable Plate Number Field (never auto-submitted)
                OutlinedTextField(
                    value = recognizedPlate,
                    onValueChange = {
                        recognizedPlate = it.uppercase()
                        errorMessage = null
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

                Spacer(modifier = Modifier.height(24.dp))

                // Vehicle Category Selection (Two large buttons: Car / Scooter)
                Text(
                    text = "Vehicle Category",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.align(Alignment.Start)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Car Category Button
                    CategorySelectCard(
                        title = "Car",
                        icon = Icons.Default.DirectionsCar,
                        isSelected = selectedCategory == "CAR",
                        onClick = { selectedCategory = "CAR" },
                        modifier = Modifier.weight(1f)
                    )

                    // Scooter Category Button
                    CategorySelectCard(
                        title = "Scooter",
                        icon = Icons.Default.TwoWheeler,
                        isSelected = selectedCategory == "SCOOTER",
                        onClick = { selectedCategory = "SCOOTER" },
                        modifier = Modifier.weight(1f)
                    )
                }

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = errorMessage!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = StatusError,
                        fontWeight = FontWeight.Medium
                    )
                }

                if (successMessage != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = successMessage!!,
                        style = MaterialTheme.typography.bodyLarge,
                        color = StatusSuccess,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Confirm Entry Button
                if (isSubmitting) {
                    CircularProgressIndicator(
                        color = PrimaryAccent,
                        modifier = Modifier.size(48.dp)
                    )
                } else {
                    AppPrimaryButton(
                        text = "Confirm Entry",
                        onClick = {
                            val plate = recognizedPlate.trim()
                            if (plate.length < 4) {
                                errorMessage = "Please enter a valid license plate number"
                            } else {
                                isSubmitting = true
                                errorMessage = null
                                coroutineScope.launch {
                                    val result = parkingRepository.confirmEntry(
                                        vehicleNumber = plate,
                                        vehicleType = selectedCategory
                                    )
                                    isSubmitting = false
                                    result.fold(
                                        onSuccess = {
                                            successMessage = "Vehicle entry registered successfully!"
                                            onNavigateBack()
                                        },
                                        onFailure = { e ->
                                            errorMessage = e.localizedMessage ?: "Failed to record entry"
                                        }
                                    )
                                }
                            }
                        },
                        leadingIcon = Icons.Default.Check
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    AppSecondaryButton(
                        text = "Scan Again",
                        onClick = {
                            isConfirmedStep = false
                            errorMessage = null
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun CategorySelectCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = if (isSelected) PrimaryAccent else BorderDivider
    val bgColor = if (isSelected) PrimaryAccent.copy(alpha = 0.08f) else AppSurface

    Card(
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
            .height(84.dp) // Large touch target
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) PrimaryAccent else TextSecondary,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) PrimaryAccent else TextPrimary
            )
        }
    }
}
