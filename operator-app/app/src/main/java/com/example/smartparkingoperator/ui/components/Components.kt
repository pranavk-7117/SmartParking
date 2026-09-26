package com.example.smartparkingoperator.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.smartparkingoperator.theme.BorderDivider
import com.example.smartparkingoperator.theme.PrimaryAccent
import com.example.smartparkingoperator.theme.StatusError
import com.example.smartparkingoperator.theme.StatusErrorBg
import com.example.smartparkingoperator.theme.StatusPending
import com.example.smartparkingoperator.theme.StatusPendingBg
import com.example.smartparkingoperator.theme.StatusSuccess
import com.example.smartparkingoperator.theme.StatusSuccessBg
import com.example.smartparkingoperator.theme.StatusWarning
import com.example.smartparkingoperator.theme.StatusWarningBg
import com.example.smartparkingoperator.theme.TextPrimary

@Composable
fun PersistentOfflineBanner(
    isOffline: Boolean,
    pendingCount: Int = 0,
    modifier: Modifier = Modifier
) {
    if (isOffline) {
        Row(
            modifier = modifier
                .fillMaxWidth()
                .background(StatusWarningBg)
                .border(1.dp, StatusWarning.copy(alpha = 0.3f))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.CloudOff,
                contentDescription = "Offline Mode",
                tint = StatusWarning,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            val text = if (pendingCount > 0) {
                "Offline Mode — $pendingCount action(s) pending sync"
            } else {
                "Offline Mode — Showing cached data"
            }
            Text(
                text = text,
                style = MaterialTheme.typography.labelMedium,
                color = StatusWarning,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

enum class BadgeStatusType {
    SUCCESS,
    WARNING,
    ERROR,
    PENDING
}

@Composable
fun StatusBadge(
    text: String,
    statusType: BadgeStatusType,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null
) {
    val (bgColor, textColor, defaultIcon) = when (statusType) {
        BadgeStatusType.SUCCESS -> Triple(StatusSuccessBg, StatusSuccess, Icons.Default.CheckCircle)
        BadgeStatusType.WARNING -> Triple(StatusWarningBg, StatusWarning, Icons.Default.Warning)
        BadgeStatusType.ERROR -> Triple(StatusErrorBg, StatusError, Icons.Default.Warning)
        BadgeStatusType.PENDING -> Triple(StatusPendingBg, StatusPending, Icons.Default.HourglassEmpty)
    }

    Row(
        modifier = modifier
            .background(bgColor, RoundedCornerShape(8.dp))
            .border(1.dp, textColor.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon ?: defaultIcon,
            contentDescription = text,
            tint = textColor,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = textColor,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun AppPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = PrimaryAccent,
            contentColor = Color.White
        ),
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp) // Minimum 48dp touch target
    ) {
        if (leadingIcon != null) {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun AppSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: ImageVector? = null
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = TextPrimary
        ),
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
    ) {
        if (leadingIcon != null) {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                tint = TextPrimary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = TextPrimary
        )
    }
}
