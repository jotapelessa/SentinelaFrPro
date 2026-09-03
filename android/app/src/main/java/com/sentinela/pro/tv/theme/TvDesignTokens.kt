package com.sentinela.pro.tv.theme

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sentinela.pro.data.CameraItem

// ============================================================================
// 🎨 DESIGN TOKENS CENTRALIZADOS — ANDROID TV (TvDesignTokens.kt)
// ============================================================================

object TvColors {
    val Background = Color(0xFF070B14)          // Deep Netflix Dark Obsidian
    val SidebarBackground = Color(0xFF090D18)   // Fundo da barra lateral esquerda
    val CardBackground = Color(0xFF0E1424)      // Superfície dos cards
    val CardBackgroundElevated = Color(0xFF161F36) // Superfície em foco
    val OverlayHud = Color(0xCC050E1A)          // Fundo translúcido do HUD PiP

    val BorderSubtle = Color(0xFF1E293B)        // Borda sutil padrão
    val BorderHighlight = Color(0xFF06B6D4)     // Ciano Neon
    val BorderFocused = Color(0xFFFFFFFF)       // Branco alto contraste foco D-Pad

    val NetflixRed = Color(0xFFE50914)          // Vermelho Hero — Foco D-Pad
    val CyberCyan = Color(0xFF22D3EE)           // Ciano de dados e status
    val LiveGreen = Color(0xFF10B981)           // Verde Online / 24 FPS
    val StandbyAmber = Color(0xFFF59E0B)        // Modo Standby
    val AlertCrimson = Color(0xFFEF4444)        // Ponto de gravação e alarmes

    val TextPrimary = Color(0xFFFFFFFF)
    val TextSecondary = Color(0xFF94A3B8)
    val TextMuted = Color(0xFF475569)
}

object TvDimens {
    val xs = 4.dp
    val sm = 8.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp

    val SidebarWidth = 250.dp
    val GridMinCardWidth = 200.dp
    val PipWidth = 320.dp
    val PipHeight = 200.dp
}

object TvShapes {
    val MenuItem = RoundedCornerShape(10.dp)
    val CameraCard = RoundedCornerShape(14.dp)
    val StatusPill = RoundedCornerShape(20.dp)
    val Badge = RoundedCornerShape(6.dp)
    val PipWindow = RoundedCornerShape(14.dp)
}

object TvTypography {
    val Logo = TextStyle(
        color = TvColors.NetflixRed,
        fontSize = 22.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 2.sp
    )
    val TabTitle = TextStyle(
        color = TvColors.TextPrimary,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold
    )
    val MenuItem = TextStyle(
        color = TvColors.TextSecondary,
        fontSize = 13.sp,
        fontWeight = FontWeight.Normal
    )
    val MenuItemFocused = TextStyle(
        color = TvColors.TextPrimary,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold
    )
    val Clock = TextStyle(
        color = TvColors.TextPrimary,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace
    )
    val Telemetry = TextStyle(
        color = TvColors.TextPrimary,
        fontSize = 11.sp,
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.SemiBold
    )
}

// Modifier Extension para Foco D-Pad suave e elegante
@Composable
fun Modifier.tvDpadFocusable(
    isFocused: Boolean,
    focusedBorderColor: Color = TvColors.NetflixRed,
    unfocusedBorderColor: Color = Color.Transparent,
    shape: Shape = TvShapes.MenuItem,
    scaleAmount: Float = 1.04f
): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (isFocused) scaleAmount else 1.0f,
        animationSpec = tween(120),
        label = "tvFocusScale"
    )
    return this
        .scale(scale)
        .border(
            BorderStroke(
                width = if (isFocused) 2.dp else 1.dp,
                color = if (isFocused) focusedBorderColor else unfocusedBorderColor
            ),
            shape = shape
        )
}

// ============================================================================
// 📦 ENUMS & MODELOS DE DADOS PARA A TV
// ============================================================================

enum class TvTab(val title: String) {
    CAMERAS("Câmeras"),
    RECORDINGS("Capturas"),
    TOOLS("Ferramentas"),
    LOGS("Logs"),
    SETTINGS("Configurações")
}

enum class CameraStatus {
    ONLINE,
    ALERT,
    RECORDING,
    STANDBY
}

data class CameraStreamTelemetry(
    val resolution: String = "1080p",
    val fps: Int = 24,
    val latencyMs: Int = 120,
    val bitrateKbps: Int = 2048
)

data class DetectionBox(
    val label: String,
    val confidence: Float,
    val alertColorHex: Long = 0xFFEF4444,
    val normX: Float = 10f,
    val normY: Float = 10f
)

data class CameraEntity(
    val id: String,
    val name: String,
    val channel: Int = 1,
    val location: String = "Área Externa",
    val zone: String = "Perímetro Principal",
    val status: CameraStatus = CameraStatus.ONLINE,
    val thumbnailUrl: String = "",
    val streamUrl: String = "",
    val telemetry: CameraStreamTelemetry = CameraStreamTelemetry(),
    val activeDetections: List<DetectionBox> = emptyList()
)

data class PipAlert(
    val id: String,
    val camera: CameraEntity,
    val eventDescription: String,
    val snapshotUrl: String,
    val countdownSeconds: Int = 10,
    val isVisible: Boolean = true
)

data class RecordingClipItem(
    val id: String,
    val cameraId: String,
    val cameraName: String,
    val duration: String,
    val timestamp: String,
    val sizeMb: String,
    val thumbnailUrl: String
)

data class LogEntryItem(
    val id: String,
    val timestamp: String,
    val level: String, // "CRITICAL", "SECURITY", "WARN", "INFO"
    val source: String,
    val message: String
)

// Helper para converter CameraItem do projeto em CameraEntity
fun CameraItem.toEntity(index: Int, host: String): CameraEntity {
    val cleanHost = host.removePrefix("http://").removePrefix("https://").trimEnd('/')
    val snapUrl = "http://$cleanHost:5000/api/${this.name}/latest.jpg"
    val stream = "http://$cleanHost:1984/api/stream.html?src=${this.name}&mode=webrtc,mse,mp4"
    return CameraEntity(
        id = this.name,
        name = this.friendlyName.ifBlank { this.name.replace("_", " ").replaceFirstChar { it.uppercase() } },
        channel = index + 1,
        location = "Vigilância Sentinela",
        zone = "Zona 01",
        status = CameraStatus.ONLINE,
        thumbnailUrl = snapUrl,
        streamUrl = stream,
        telemetry = CameraStreamTelemetry(resolution = "1080p", fps = 24, latencyMs = 85, bitrateKbps = 1800)
    )
}
