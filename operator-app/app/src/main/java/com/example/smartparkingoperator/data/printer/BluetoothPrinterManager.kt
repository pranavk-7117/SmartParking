package com.example.smartparkingoperator.data.printer

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.example.smartparkingoperator.data.local.entity.ReceiptEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * BluetoothPrinterManager
 *
 * Manages connection to ESC/POS compatible Bluetooth thermal receipt printers.
 * Supports 58mm and 80mm paper widths. Uses SPP (Serial Port Profile) RFCOMM socket.
 *
 * Thread safety: all blocking operations run on Dispatchers.IO.
 * Caller must request Bluetooth permissions before calling any method.
 */
class BluetoothPrinterManager(private val context: Context) {

    companion object {
        /** Standard Bluetooth SPP UUID used by virtually all ESC/POS thermal printers. */
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

        // ESC/POS command bytes
        private val ESC  = byteArrayOf(0x1B)
        private val GS   = byteArrayOf(0x1D)
        private val INIT = byteArrayOf(0x1B, 0x40)                  // Initialize printer
        private val ALIGN_LEFT   = byteArrayOf(0x1B, 0x61, 0x00)    // Left align
        private val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)    // Center align
        private val ALIGN_RIGHT  = byteArrayOf(0x1B, 0x61, 0x02)    // Right align
        private val BOLD_ON   = byteArrayOf(0x1B, 0x45, 0x01)       // Bold on
        private val BOLD_OFF  = byteArrayOf(0x1B, 0x45, 0x00)       // Bold off
        private val DOUBLE_HEIGHT_ON  = byteArrayOf(0x1B, 0x21, 0x10) // Double height text
        private val DOUBLE_HEIGHT_OFF = byteArrayOf(0x1B, 0x21, 0x00) // Normal text
        private val LARGE_TEXT   = byteArrayOf(0x1B, 0x21, 0x30)    // Double width+height
        private val NORMAL_TEXT  = byteArrayOf(0x1B, 0x21, 0x00)    // Normal text
        private val LINE_FEED    = byteArrayOf(0x0A)
        private val CUT_PAPER    = byteArrayOf(0x1D, 0x56, 0x42, 0x00) // Full cut with feed

        // Paper widths in characters (approx)
        private const val WIDTH_58MM = 32
        private const val WIDTH_80MM = 48

        private val timeFormatter = SimpleDateFormat("dd MMM yyyy, hh:mm:ss a", Locale.getDefault())
    }

    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    /** The currently connected Bluetooth device (null if not connected). */
    var connectedDevice: BluetoothDevice? = null
        private set

    val isConnected: Boolean
        get() = bluetoothSocket?.isConnected == true && outputStream != null

    // ── Permission check ────────────────────────────────────────────────────

    fun hasBluetoothPermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) ==
                    PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) ==
                    PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) ==
                    PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADMIN) ==
                    PackageManager.PERMISSION_GRANTED
        }
    }

    fun isBluetoothEnabled(): Boolean {
        val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return bm?.adapter?.isEnabled == true
    }

    // ── Device discovery ─────────────────────────────────────────────────────

    /**
     * Returns the list of already-paired Bluetooth devices.
     * Callers must hold BLUETOOTH_CONNECT permission on Android 12+.
     */
    @SuppressLint("MissingPermission")
    fun getPairedDevices(): List<BluetoothDevice> {
        if (!hasBluetoothPermissions()) return emptyList()
        val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return bm?.adapter?.bondedDevices?.toList() ?: emptyList()
    }

    // ── Connection ──────────────────────────────────────────────────────────

    /**
     * Connects to a paired Bluetooth device using SPP RFCOMM socket.
     * Returns Result.success(Unit) on success, Result.failure on error.
     * Safe to call multiple times; disconnects existing connection first.
     */
    @SuppressLint("MissingPermission")
    suspend fun connect(device: BluetoothDevice): Result<Unit> = withContext(Dispatchers.IO) {
        if (!hasBluetoothPermissions()) {
            return@withContext Result.failure(SecurityException("Bluetooth permissions not granted"))
        }

        disconnect()

        try {
            val socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            // Cancel discovery before connecting — reduces overhead
            val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            bm?.adapter?.cancelDiscovery()

            socket.connect()
            bluetoothSocket = socket
            outputStream = socket.outputStream
            connectedDevice = device
            Result.success(Unit)
        } catch (e: IOException) {
            bluetoothSocket = null
            outputStream = null
            connectedDevice = null
            Result.failure(Exception("Failed to connect to ${device.name ?: device.address}: ${e.message}"))
        }
    }

    /** Safely disconnects from the current Bluetooth device. */
    fun disconnect() {
        try {
            outputStream?.close()
        } catch (_: IOException) {}
        try {
            bluetoothSocket?.close()
        } catch (_: IOException) {}
        outputStream = null
        bluetoothSocket = null
        connectedDevice = null
    }

    // ── Printing ─────────────────────────────────────────────────────────────

    /**
     * Prints a formatted parking receipt to the connected ESC/POS printer.
     * Returns Result.success(Unit) if print succeeded, Result.failure with error.
     * Will NOT reconnect automatically — caller should check isConnected first.
     *
     * @param receipt  The authoritative receipt entity from the backend.
     * @param paperWidth  58 or 80 — determines line width. Default 58.
     */
    suspend fun printReceipt(
        receipt: ReceiptEntity,
        paperWidth: Int = 58
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val out = outputStream
            ?: return@withContext Result.failure(IOException("Printer not connected"))

        val lineWidth = if (paperWidth >= 80) WIDTH_80MM else WIDTH_58MM
        val divider = "-".repeat(lineWidth)

        try {
            val buffer = buildReceiptBytes(receipt, lineWidth, divider)
            out.write(buffer)
            out.flush()
            Result.success(Unit)
        } catch (e: IOException) {
            // Mark socket as broken
            disconnect()
            Result.failure(Exception("Print failed: ${e.message}"))
        }
    }

    /**
     * Prints a short test pattern to verify printer connectivity.
     */
    suspend fun printTestPage(): Result<Unit> = withContext(Dispatchers.IO) {
        val out = outputStream
            ?: return@withContext Result.failure(IOException("Printer not connected"))
        try {
            val buf = mutableListOf<Byte>()
            buf.addAll(INIT.toList())
            buf.addAll(ALIGN_CENTER.toList())
            buf.addAll(BOLD_ON.toList())
            buf.addAll("  ParkIT Printer Test  ".toByteArray().toList())
            buf.addAll(LINE_FEED.toList())
            buf.addAll(BOLD_OFF.toList())
            buf.addAll("Connection OK".toByteArray().toList())
            buf.addAll(LINE_FEED.toList())
            buf.addAll(LINE_FEED.toList())
            buf.addAll(LINE_FEED.toList())
            buf.addAll(CUT_PAPER.toList())
            out.write(buf.toByteArray())
            out.flush()
            Result.success(Unit)
        } catch (e: IOException) {
            disconnect()
            Result.failure(Exception("Test print failed: ${e.message}"))
        }
    }

    // ── ESC/POS byte builder ─────────────────────────────────────────────────

    private fun buildReceiptBytes(
        receipt: ReceiptEntity,
        lineWidth: Int,
        divider: String
    ): ByteArray {
        val buf = mutableListOf<Byte>()

        fun write(bytes: ByteArray)   { buf.addAll(bytes.toList()) }
        fun writeln(text: String = "") { buf.addAll((text + "\n").toByteArray().toList()) }
        fun row(left: String, right: String): String {
            val pad = (lineWidth - left.length - right.length).coerceAtLeast(1)
            return left + " ".repeat(pad) + right
        }

        // Init + header
        write(INIT)
        write(ALIGN_CENTER)
        write(BOLD_ON)
        write(DOUBLE_HEIGHT_ON)

        val siteLine = if (receipt.siteName.isNotBlank()) receipt.siteName.uppercase() else "PARKIT"
        writeln(siteLine)

        write(DOUBLE_HEIGHT_OFF)
        write(BOLD_OFF)

        if (receipt.siteAddress.isNotBlank()) writeln(receipt.siteAddress)
        writeln()

        write(BOLD_ON)
        writeln("PARKING RECEIPT")
        write(BOLD_OFF)
        writeln(divider)
        writeln()

        // Receipt details
        write(ALIGN_LEFT)

        if (receipt.ticketId.isNotBlank()) writeln(row("Ticket ID:", receipt.ticketId))
        writeln(row("Vehicle No:", receipt.vehicleNumber))
        if (receipt.vehicleType.isNotBlank()) writeln(row("Category:", receipt.vehicleType))
        if (receipt.slotCode.isNotBlank()) writeln(row("Slot:", receipt.slotCode))
        writeln()
        writeln(row("Date:", timeFormatter.format(Date(receipt.inTime)).substringBefore(",")))
        writeln(row("In-Time:", SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date(receipt.inTime))))
        writeln(row("Out-Time:", SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date(receipt.outTime))))
        val durText = receipt.durationText.ifBlank {
            val m = receipt.durationMinutes; val h = m / 60; val r = m % 60
            if (h > 0) "${h}h ${r}m" else "${r}m"
        }
        writeln(row("Duration:", durText))
        writeln(row("Rate:", "Rs.${String.format(Locale.US, "%.2f", receipt.ratePerHour)}/hr"))
        writeln()

        writeln(divider)

        // Total amount — large bold
        write(ALIGN_CENTER)
        write(LARGE_TEXT)
        write(BOLD_ON)
        writeln("Rs.${String.format(Locale.US, "%.2f", receipt.amount)}")
        write(BOLD_OFF)
        write(NORMAL_TEXT)
        write(ALIGN_LEFT)

        writeln(row("Payment:", receipt.paymentMethod.ifBlank { "Cash / UPI at Exit" }))
        writeln(row("Status:", if (receipt.paymentStatus == "PENDING") "PENDING SYNC" else "PAID"))
        writeln()
        writeln(divider)

        // Footer
        write(ALIGN_CENTER)
        writeln()
        writeln("Thank you -- Drive Safe!")
        writeln("Automated Parking Management System")
        writeln()

        // Feed and cut
        write(LINE_FEED)
        write(LINE_FEED)
        write(LINE_FEED)
        write(CUT_PAPER)

        return buf.toByteArray()
    }
}
