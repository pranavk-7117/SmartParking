package com.example.smartparkingoperator.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * ThermalReceiptCard
 *
 * Renders an on-screen replica of the physical thermal parking receipt matching
 * the frontend receipt (ReceiptModal.tsx) and physical thermal paper standards.
 */
@Composable
fun ThermalReceiptCard(
    receipt: ReceiptEntity,
    modifier: Modifier = Modifier
) {
    val dateFormatter = SimpleDateFormat("dd MMM yyyy", Locale.US)
    val timeFormatter = SimpleDateFormat("hh:mm:ss a", Locale.getDefault())

    val ticketCode = receipt.ticketId.ifBlank {
        "PK-${receipt.sessionId.take(8).uppercase()}"
    }

    val displaySite = receipt.siteName.ifBlank { "PARKIT – CAMP" }.uppercase()
    val displayAddress = receipt.siteAddress.ifBlank { "Camp Area, Pune, Maharashtra" }
    val displayVehicleType = receipt.vehicleType.ifBlank { "Car" }
    val displaySlot = receipt.slotCode.ifBlank { "C-01" }

    val formattedDate = dateFormatter.format(Date(receipt.inTime))
    val formattedInTime = timeFormatter.format(Date(receipt.inTime))
    val formattedOutTime = timeFormatter.format(Date(receipt.outTime))

    val durationText = receipt.durationText.ifBlank {
        val totalMins = receipt.durationMinutes
        val hrs = totalMins / 60
        val mins = totalMins % 60
        if (hrs > 0) "${hrs}h ${mins}m" else "${mins}m"
    }

    val hourlyRateText = "₹${receipt.ratePerHour.toInt()}/hr"
    val computedAmount = String.format(Locale.US, "%.2f", receipt.amount)

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, Color(0xFFD1D5DB), RoundedCornerShape(8.dp))
    ) {
        Column(
            modifier = Modifier
                .padding(20.dp)
                .fillMaxWidth()
        ) {
            // Header
            Text(
                text = displaySite,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Black,
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                color = Color(0xFF111827),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Automated Gate Facility",
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                color = Color(0xFF6B7280),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "PARKING RECEIPT",
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                color = Color(0xFF111827),
                letterSpacing = 1.sp,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))
            ReceiptDottedDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // Line Items
            ReceiptMonospaceRow("Ticket ID:", ticketCode, isValueBold = true)
            ReceiptMonospaceRow("Vehicle No:", receipt.vehicleNumber, isValueBold = true)
            ReceiptMonospaceRow("Category:", displayVehicleType)
            ReceiptMonospaceRow("Slot Allocated:", displaySlot, isValueBold = true)
            ReceiptMonospaceRow("Date:", formattedDate)
            ReceiptMonospaceRow("In-Time:", formattedInTime)
            ReceiptMonospaceRow("Out-Time:", formattedOutTime)
            ReceiptMonospaceRow("Duration:", durationText)
            ReceiptMonospaceRow("Hourly Rate:", hourlyRateText)

            Spacer(modifier = Modifier.height(12.dp))
            ReceiptDottedDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // Total Amount
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "TOTAL AMOUNT:",
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 14.sp,
                    color = Color(0xFF111827)
                )
                Text(
                    text = "₹$computedAmount",
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    fontSize = 17.sp,
                    color = Color(0xFF111827)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Payment: ${receipt.paymentMethod.ifBlank { "Cash / UPI Paid at Exit" }}",
                fontSize = 10.sp,
                color = Color(0xFF9CA3AF)
            )

            Spacer(modifier = Modifier.height(12.dp))
            ReceiptDottedDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // Footer
            Text(
                text = "Thank you — Drive Safe!",
                fontWeight = FontWeight.SemiBold,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                color = Color(0xFF4B5563),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "Automated Parking Management System",
                fontSize = 9.5.sp,
                textAlign = TextAlign.Center,
                color = Color(0xFF9CA3AF),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun ReceiptMonospaceRow(
    label: String,
    value: String,
    isValueBold: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontFamily = FontFamily.Monospace,
            fontSize = 11.5.sp,
            color = Color(0xFF6B7280)
        )
        Text(
            text = value,
            fontFamily = FontFamily.Monospace,
            fontSize = 11.5.sp,
            fontWeight = if (isValueBold) FontWeight.Bold else FontWeight.Normal,
            color = Color(0xFF111827)
        )
    }
}

@Composable
private fun ReceiptDottedDivider() {
    Text(
        text = "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -",
        fontFamily = FontFamily.Monospace,
        fontSize = 10.sp,
        color = Color(0xFFD1D5DB),
        maxLines = 1,
        modifier = Modifier.fillMaxWidth()
    )
}
