package com.sentinela.pro.data

data class CameraItem(
    val name: String,
    val friendlyName: String = name,
    val enabled: Boolean = true
)

data class CaptureEvent(
    val id: String,
    val camera: String,
    val label: String,
    val score: Int = 0,
    val timestamp: String = "",
    val snapshotUrl: String = "",
    val clipUrl: String = "",
    val hasClip: Boolean = true,
    val retained: Boolean = false,
    val duration: Double? = null,
    val durationFormatted: String? = null,
    val type: String = "video",
    val hasSnapshot: Boolean = true
) {
    val isPhoto: Boolean
        get() = !hasClip || type.equals("photo", ignoreCase = true) || label.contains("foto", ignoreCase = true)

    val displayDuration: String
        get() = if (isPhoto) "FOTO HD" else (durationFormatted ?: if (duration != null && duration > 0) String.format("%02d:%02d", (duration / 60).toInt(), (duration % 60).toInt()) else "00:15")
}

data class TelemetryData(
    val serverOnline: Boolean = true,
    val tailscaleOnline: Boolean = true,
    val cpuPercent: Double = 0.0,
    val cpuTemp: Double = 0.0,
    val ramPercent: Double = 0.0,
    val ramUsedMb: Long = 0,
    val ramTotalMb: Long = 0,
    val uptime: String = "Online",
    val telegramConfigured: Boolean = true,
    val telegramPaused: Boolean = false,
    val rxKbs: Double = 0.0,
    val txKbs: Double = 0.0
)

data class AuditLogEntry(
    val id: Int,
    val createdAt: String,
    val module: String,
    val action: String,
    val severity: String,
    val details: String,
    val clientIp: String = "127.0.0.1"
)

data class DiagnosticStatus(
    val frigateOnline: Boolean = true,
    val frigateVersion: String = "0.17",
    val go2rtcOnline: Boolean = true,
    val mqttConnected: Boolean = true,
    val gpuAvailable: Boolean = true
)

data class SpeedTestResult(
    val downloadMbps: Double = 0.0,
    val pingMs: Long = 0,
    val jitterMs: Long = 0,
    val status: String = "Pronto",
    val isRunning: Boolean = false
)

enum class PipSize(val label: String, val width: Int, val height: Int) {
    EXTRA_SMALL("Extra Pequeno (320x180)", 320, 180),
    SMALL("Pequeno (480x270)", 480, 270),
    MEDIUM_SMALL("Médio-Pequeno (640x360)", 640, 360),
    MEDIUM("Médio (800x450)", 800, 450),
    MEDIUM_LARGE("Médio-Grande (960x540)", 960, 540),
    LARGE("Grande (1120x630)", 1120, 630),
    EXTRA_LARGE("Extra Grande (1280x720)", 1280, 720),
    CINEMA("Cinema (1440x810)", 1440, 810)
}

enum class PipPosition(val label: String, val gravity: Int) {
    TOP_RIGHT("Superior Direito", android.view.Gravity.TOP or android.view.Gravity.END),
    TOP_LEFT("Superior Esquerdo", android.view.Gravity.TOP or android.view.Gravity.START),
    BOTTOM_RIGHT("Inferior Direito", android.view.Gravity.BOTTOM or android.view.Gravity.END),
    BOTTOM_LEFT("Inferior Esquerdo", android.view.Gravity.BOTTOM or android.view.Gravity.START),
    TOP_CENTER("Superior Centro", android.view.Gravity.TOP or android.view.Gravity.CENTER_HORIZONTAL),
    BOTTOM_CENTER("Inferior Centro", android.view.Gravity.BOTTOM or android.view.Gravity.CENTER_HORIZONTAL),
    CENTER_LEFT("Centro Esquerdo", android.view.Gravity.CENTER_VERTICAL or android.view.Gravity.START),
    CENTER_RIGHT("Centro Direito", android.view.Gravity.CENTER_VERTICAL or android.view.Gravity.END)
}

enum class PipDuration(val label: String, val seconds: Int) {
    D_5S("5 Segundos", 5),
    D_10S("10 Segundos", 10),
    D_15S("15 Segundos", 15),
    D_20S("20 Segundos", 20),
    D_30S("30 Segundos", 30),
    D_45S("45 Segundos", 45),
    D_60S("60 Segundos", 60),
    INFINITE("Infinito (Manual)", 0)
}
