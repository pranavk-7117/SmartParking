package com.example.smartparkingoperator.ui.screens.settings

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Shield
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.example.smartparkingoperator.data.repository.AuthRepository
import com.example.smartparkingoperator.data.repository.ParkingRepository
import com.example.smartparkingoperator.theme.AppBackground
import com.example.smartparkingoperator.theme.AppSurface
import com.example.smartparkingoperator.theme.BorderDivider
import com.example.smartparkingoperator.theme.PrimaryAccent
import com.example.smartparkingoperator.theme.StatusError
import com.example.smartparkingoperator.theme.StatusSuccess
import com.example.smartparkingoperator.theme.StatusSuccessBg
import com.example.smartparkingoperator.theme.StatusWarning
import com.example.smartparkingoperator.theme.SurfaceHover
import com.example.smartparkingoperator.theme.TextPrimary
import com.example.smartparkingoperator.theme.TextSecondary
import com.example.smartparkingoperator.ui.components.AppPrimaryButton
import com.example.smartparkingoperator.ui.components.AppSecondaryButton
import kotlinx.coroutines.launch

/**
 * Settings & Profile Screen
 *
 * Allows the operator to:
 * 1. View and edit their profile (name, username, phone, email, employee ID, shift time, notes)
 * 2. Change their password with current password verification
 * All changes are persisted immediately to the backend via PUT /api/v1/auth/profile
 * and POST /api/v1/auth/change-password.
 */
@Composable
fun SettingsScreen(
    authRepository: AuthRepository,
    parkingRepository: ParkingRepository,
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()

    // Section tabs
    var selectedTab by remember { mutableStateOf(0) } // 0 = Profile, 1 = Security

    // Profile fields
    var profileName by remember { mutableStateOf("") }
    var profileUsername by remember { mutableStateOf("") }
    var profileContact by remember { mutableStateOf("") }
    var profileEmail by remember { mutableStateOf("") }
    var profileEmployeeId by remember { mutableStateOf("") }
    var profileShiftTime by remember { mutableStateOf("") }
    var profileNotes by remember { mutableStateOf("") }

    // Password fields
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showCurrentPass by remember { mutableStateOf(false) }
    var showNewPass by remember { mutableStateOf(false) }
    var showConfirmPass by remember { mutableStateOf(false) }

    // State
    var isLoading by remember { mutableStateOf(false) }
    var isProfileLoaded by remember { mutableStateOf(false) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Location info
    val operatorUsername = authRepository.getOperatorUsername()

    // Load profile on entry
    LaunchedEffect(Unit) {
        isLoading = true
        val profile = authRepository.getProfile()
        if (profile != null) {
            profileName = profile.name ?: ""
            profileUsername = profile.username ?: ""
            profileContact = profile.contact ?: ""
            profileEmail = profile.email ?: ""
            profileEmployeeId = profile.employeeId ?: ""
            profileShiftTime = profile.shiftTime ?: ""
            profileNotes = profile.notes ?: ""
        }
        isProfileLoaded = true
        isLoading = false
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(AppBackground)
    ) {
        // ── App Bar ────────────────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(AppBackground)
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
            Column {
                Text(
                    text = "Settings & Profile",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Manage your account",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }

        HorizontalDivider(color = BorderDivider)

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = PrimaryAccent)
            }
            return@Column
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // ── Profile Avatar Banner ─────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PrimaryAccent.copy(alpha = 0.05f))
                    .padding(vertical = 20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(PrimaryAccent),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (profileName.ifBlank { operatorUsername }).take(1).uppercase(),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = profileName.ifBlank { operatorUsername ?: "Operator" },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "@${profileUsername.ifBlank { operatorUsername ?: "" }}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .background(StatusSuccessBg, RoundedCornerShape(20.dp))
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(StatusSuccess)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Active Operator",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = StatusSuccess
                        )
                    }
                }
            }

            // ── Tab Selector ──────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .background(SurfaceHover, RoundedCornerShape(10.dp))
                    .padding(4.dp)
            ) {
                listOf("Profile", "Security").forEachIndexed { idx, label ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (selectedTab == idx) AppBackground else Color.Transparent)
                            .clickable { selectedTab = idx }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = if (selectedTab == idx) FontWeight.Bold else FontWeight.Medium,
                            color = if (selectedTab == idx) PrimaryAccent else TextSecondary
                        )
                    }
                }
            }

            // ── Feedback Messages ─────────────────────────────────────────────
            if (successMessage != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                        .background(StatusSuccessBg, RoundedCornerShape(10.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = StatusSuccess,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = successMessage!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = StatusSuccess,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            if (errorMessage != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                        .background(StatusError.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = StatusError,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = errorMessage!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = StatusError,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            when (selectedTab) {
                // ── PROFILE TAB ───────────────────────────────────────────────
                0 -> {
                    Column(modifier = Modifier.padding(horizontal = 16.dp)) {

                        SettingsSectionHeader("Personal Information")

                        SettingsField(
                            icon = Icons.Default.Person,
                            label = "Full Name",
                            value = profileName,
                            onValueChange = { profileName = it },
                            placeholder = "Your full name"
                        )

                        SettingsField(
                            icon = Icons.Default.Person,
                            label = "Username",
                            value = profileUsername,
                            onValueChange = { profileUsername = it },
                            placeholder = "Your login username",
                            keyboardType = KeyboardType.Text,
                            capitalization = KeyboardCapitalization.None
                        )

                        SettingsField(
                            icon = Icons.Default.Phone,
                            label = "Phone / Contact",
                            value = profileContact,
                            onValueChange = { profileContact = it },
                            placeholder = "+91 98220 12345",
                            keyboardType = KeyboardType.Phone
                        )

                        SettingsField(
                            icon = Icons.Default.Email,
                            label = "Email Address",
                            value = profileEmail,
                            onValueChange = { profileEmail = it },
                            placeholder = "you@email.com",
                            keyboardType = KeyboardType.Email
                        )

                        Spacer(modifier = Modifier.height(12.dp))
                        SettingsSectionHeader("Work Information")

                        SettingsField(
                            icon = Icons.Default.Badge,
                            label = "Employee ID",
                            value = profileEmployeeId,
                            onValueChange = { profileEmployeeId = it },
                            placeholder = "e.g. EMP-2024-001"
                        )

                        SettingsField(
                            icon = Icons.Default.Schedule,
                            label = "Shift Time",
                            value = profileShiftTime,
                            onValueChange = { profileShiftTime = it },
                            placeholder = "e.g. 06:00 AM – 02:00 PM"
                        )

                        SettingsField(
                            icon = Icons.Default.Info,
                            label = "Notes / Bio",
                            value = profileNotes,
                            onValueChange = { profileNotes = it },
                            placeholder = "Any notes visible to admin",
                            singleLine = false
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        if (isLoading) {
                            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = PrimaryAccent, modifier = Modifier.size(36.dp))
                            }
                        } else {
                            AppPrimaryButton(
                                text = "Save Profile",
                                onClick = {
                                    isLoading = true
                                    successMessage = null
                                    errorMessage = null
                                    coroutineScope.launch {
                                        val result = authRepository.updateProfile(
                                            name = profileName.trim(),
                                            username = profileUsername.trim(),
                                            contact = profileContact.trim(),
                                            email = profileEmail.trim(),
                                            employeeId = profileEmployeeId.trim(),
                                            shiftTime = profileShiftTime.trim(),
                                            notes = profileNotes.trim()
                                        )
                                        isLoading = false
                                        result.fold(
                                            onSuccess = { successMessage = "Profile updated successfully!" },
                                            onFailure = { e -> errorMessage = e.localizedMessage ?: "Failed to save profile" }
                                        )
                                    }
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(40.dp))
                    }
                }

                // ── SECURITY TAB ──────────────────────────────────────────────
                1 -> {
                    Column(modifier = Modifier.padding(horizontal = 16.dp)) {

                        SettingsSectionHeader("Change Password")

                        // Info card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = PrimaryAccent.copy(alpha = 0.06f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, PrimaryAccent.copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Shield,
                                    contentDescription = null,
                                    tint = PrimaryAccent,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Your password is encrypted and stored securely. Choose a strong password with at least 6 characters.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = PrimaryAccent
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Current password
                        PasswordField(
                            label = "Current Password",
                            value = currentPassword,
                            onValueChange = { currentPassword = it },
                            visible = showCurrentPass,
                            onToggleVisibility = { showCurrentPass = !showCurrentPass }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // New password
                        PasswordField(
                            label = "New Password",
                            value = newPassword,
                            onValueChange = { newPassword = it },
                            visible = showNewPass,
                            onToggleVisibility = { showNewPass = !showNewPass }
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Confirm new password
                        PasswordField(
                            label = "Confirm New Password",
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            visible = showConfirmPass,
                            onToggleVisibility = { showConfirmPass = !showConfirmPass }
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        if (isLoading) {
                            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = PrimaryAccent, modifier = Modifier.size(36.dp))
                            }
                        } else {
                            AppPrimaryButton(
                                text = "Update Password",
                                onClick = {
                                    successMessage = null
                                    errorMessage = null

                                    if (currentPassword.isBlank()) {
                                        errorMessage = "Please enter your current password"
                                        return@AppPrimaryButton
                                    }
                                    if (newPassword.length < 6) {
                                        errorMessage = "New password must be at least 6 characters"
                                        return@AppPrimaryButton
                                    }
                                    if (newPassword != confirmPassword) {
                                        errorMessage = "New passwords do not match"
                                        return@AppPrimaryButton
                                    }

                                    isLoading = true
                                    coroutineScope.launch {
                                        val result = authRepository.changePassword(currentPassword, newPassword)
                                        isLoading = false
                                        result.fold(
                                            onSuccess = {
                                                successMessage = "Password updated successfully!"
                                                currentPassword = ""
                                                newPassword = ""
                                                confirmPassword = ""
                                            },
                                            onFailure = { e -> errorMessage = e.localizedMessage ?: "Failed to update password" }
                                        )
                                    }
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        HorizontalDivider(color = BorderDivider)

                        Spacer(modifier = Modifier.height(24.dp))

                        SettingsSectionHeader("Account")

                        AppSecondaryButton(
                            text = "Logout",
                            onClick = onLogout,
                            leadingIcon = Icons.Default.Lock
                        )

                        Spacer(modifier = Modifier.height(40.dp))
                    }
                }
            }
        }
    }
}

// ── Reusable Composables ─────────────────────────────────────────────────────

@Composable
private fun SettingsSectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        color = TextSecondary,
        modifier = Modifier.padding(vertical = 10.dp)
    )
}

@Composable
private fun SettingsField(
    icon: ImageVector,
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.Words,
    singleLine: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = { Text(placeholder, color = TextSecondary.copy(alpha = 0.5f)) },
        leadingIcon = {
            Icon(imageVector = icon, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(20.dp))
        },
        singleLine = singleLine,
        maxLines = if (singleLine) 1 else 4,
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            capitalization = capitalization,
            imeAction = if (singleLine) ImeAction.Next else ImeAction.Default
        ),
        shape = RoundedCornerShape(10.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = PrimaryAccent,
            unfocusedBorderColor = BorderDivider,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary,
            cursorColor = PrimaryAccent,
            focusedLabelColor = PrimaryAccent
        ),
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
    )
}

@Composable
private fun PasswordField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    visible: Boolean,
    onToggleVisibility: () -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        leadingIcon = {
            Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(20.dp))
        },
        trailingIcon = {
            IconButton(onClick = onToggleVisibility) {
                Icon(
                    imageVector = if (visible) Icons.Default.Check else Icons.Default.Lock,
                    contentDescription = if (visible) "Hide" else "Show",
                    tint = TextSecondary
                )
            }
        },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Password,
            imeAction = ImeAction.Next
        ),
        shape = RoundedCornerShape(10.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = PrimaryAccent,
            unfocusedBorderColor = BorderDivider,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary,
            cursorColor = PrimaryAccent,
            focusedLabelColor = PrimaryAccent
        ),
        modifier = Modifier.fillMaxWidth()
    )
}
