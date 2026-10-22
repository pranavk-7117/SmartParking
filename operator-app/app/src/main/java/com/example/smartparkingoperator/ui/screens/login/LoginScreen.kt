package com.example.smartparkingoperator.ui.screens.login

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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LocalParking
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.smartparkingoperator.data.repository.AuthRepository
import com.example.smartparkingoperator.data.security.SecureSessionManager
import com.example.smartparkingoperator.theme.AppBackground
import com.example.smartparkingoperator.theme.AppSurface
import com.example.smartparkingoperator.theme.BorderDivider
import com.example.smartparkingoperator.theme.PrimaryAccent
import com.example.smartparkingoperator.theme.PrimaryAccentDark
import com.example.smartparkingoperator.theme.StatusError
import com.example.smartparkingoperator.theme.StatusErrorBg
import com.example.smartparkingoperator.theme.TextPrimary
import com.example.smartparkingoperator.theme.TextSecondary
import com.example.smartparkingoperator.ui.components.AppPrimaryButton
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    sessionManager: SecureSessionManager,
    onLoginSuccess: (mustChangePassword: Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showServerConfigDialog by remember { mutableStateOf(false) }
    var currentServerUrl by remember { mutableStateOf(sessionManager.getServerUrl()) }

    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    val handleLogin: () -> Unit = {
        if (username.isBlank() || password.isBlank()) {
            errorMessage = "Please enter both username and password"
        } else {
            isLoading = true
            errorMessage = null
            focusManager.clearFocus()
            coroutineScope.launch {
                val result = authRepository.login(username, password)
                isLoading = false
                result.fold(
                    onSuccess = {
                        val mustChange = authRepository.mustChangePassword()
                        onLoginSuccess(mustChange)
                    },
                    onFailure = { err -> errorMessage = err.localizedMessage ?: "Login failed. Check server IP or credentials." }
                )
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFFEFF6FF), // blue-50
                        AppBackground,
                        AppBackground,
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Top spacer — pushes content toward centre
            Spacer(modifier = Modifier.weight(1f))

            // ── Brand / Logo ──────────────────────────────────────────────────
            Spacer(modifier = Modifier.height(8.dp))

            // Outer glow ring
            Box(
                modifier = Modifier
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(PrimaryAccent.copy(alpha = 0.08f)),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(70.dp)
                        .clip(CircleShape)
                        .background(PrimaryAccent),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalParking,
                        contentDescription = "ParkIT Logo",
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "ParkIT",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.ExtraBold,
                color = TextPrimary,
                letterSpacing = (-0.5).sp
            )

            Text(
                text = "Operator Terminal",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                fontWeight = FontWeight.Normal
            )

            Spacer(modifier = Modifier.height(32.dp))

            // ── Login Card ────────────────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(AppSurface)
                    .border(1.dp, BorderDivider, RoundedCornerShape(16.dp))
                    .padding(24.dp)
            ) {
                Text(
                    text = "Sign In",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Text(
                    text = "Enter your operator credentials to continue",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 2.dp, bottom = 20.dp)
                )

                // Username field
                OutlinedTextField(
                    value = username,
                    onValueChange = {
                        username = it
                        if (errorMessage != null) errorMessage = null
                    },
                    label = { Text("Username") },
                    placeholder = { Text("e.g. operator") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = if (username.isNotEmpty()) PrimaryAccent else TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PrimaryAccent,
                        unfocusedBorderColor = BorderDivider,
                        focusedLabelColor = PrimaryAccent,
                        unfocusedLabelColor = TextSecondary,
                        cursorColor = PrimaryAccent
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Password field
                OutlinedTextField(
                    value = password,
                    onValueChange = {
                        password = it
                        if (errorMessage != null) errorMessage = null
                    },
                    label = { Text("Password") },
                    placeholder = { Text("••••••••") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = if (password.isNotEmpty()) PrimaryAccent else TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = if (passwordVisible) "Hide password" else "Show password",
                                tint = TextSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { handleLogin() }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = PrimaryAccent,
                        unfocusedBorderColor = BorderDivider,
                        focusedLabelColor = PrimaryAccent,
                        unfocusedLabelColor = TextSecondary,
                        cursorColor = PrimaryAccent
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // Error message
                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(StatusErrorBg)
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(StatusError)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = errorMessage!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = StatusError,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Login button / loader
                if (isLoading) {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            color = PrimaryAccent,
                            strokeWidth = 2.5.dp,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                } else {
                    AppPrimaryButton(
                        text = "Sign In",
                        onClick = handleLogin
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Dynamic Server URL Configuration Chip ───────────────────────
            Surface(
                onClick = { showServerConfigDialog = true },
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderDivider),
                shadowElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Dns,
                        contentDescription = "Server Settings",
                        tint = PrimaryAccent,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Server: $currentServerUrl",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Footer note
            Text(
                text = "Authorised personnel only.\nContact your admin if you need access.",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 18.sp
            )

            // Bottom flexible spacer
            Spacer(modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.height(24.dp))
        }

        // ── Server Connection Configuration Dialog ──────────────────────────
        if (showServerConfigDialog) {
            var inputUrl by remember { mutableStateOf(currentServerUrl) }

            Dialog(onDismissRequest = { showServerConfigDialog = false }) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Settings,
                                contentDescription = null,
                                tint = PrimaryAccent,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Server Connection",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = TextPrimary
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "If your laptop's Wi-Fi IP changes, enter the new IP here. The app connects instantly without reinstalling.",
                            fontSize = 12.sp,
                            color = TextSecondary,
                            lineHeight = 17.sp
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        OutlinedTextField(
                            value = inputUrl,
                            onValueChange = { inputUrl = it },
                            label = { Text("Server URL or IP") },
                            placeholder = { Text("e.g. 10.20.2.242:3000") },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Quick presets
                        Text(
                            text = "Quick Presets:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            AssistChip(
                                onClick = { inputUrl = "http://192.168.1.42:3000/" },
                                label = { Text("Current Wi-Fi", fontSize = 11.sp) }
                            )
                            AssistChip(
                                onClick = { inputUrl = "http://127.0.0.1:3000/" },
                                label = { Text("USB (127.0.0.1)", fontSize = 11.sp) }
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            TextButton(onClick = { showServerConfigDialog = false }) {
                                Text("Cancel", color = TextSecondary)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = {
                                    if (inputUrl.isNotBlank()) {
                                        sessionManager.setServerUrl(inputUrl)
                                        currentServerUrl = sessionManager.getServerUrl()
                                        errorMessage = null
                                    }
                                    showServerConfigDialog = false
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryAccent),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Save Connection")
                            }
                        }
                    }
                }
            }
        }
    }
}
