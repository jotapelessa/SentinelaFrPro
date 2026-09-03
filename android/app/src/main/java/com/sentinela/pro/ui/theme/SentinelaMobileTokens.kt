package com.sentinela.pro.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * SENTINELA PRO — DESIGN SYSTEM TOKENS
 * Mobile Obsidian & Master Gold Architecture
 * Target: Android Smartphones (e.g. Moto G54 5G 120Hz OLED/IPS)
 */
object SentinelaColors {
    // Canvas & Surfaces
    val Background = Color(0xFF090D16)             // Fundo escuro profundo do feed vertical
    val BottomBarBackground = Color(0xFF0F0F13)    // Barra inferior de navegação
    val CardBackground = Color(0xFF111827)         // Cartões de câmeras e streaming
    val CardBackgroundElevated = Color(0xFF1F2937) // Superfície elevada

    // Borders
    val BorderStandard = Color(0xFF1F2937)         // Borda sutil padrão
    val BorderCyan = Color(0xFF06B6D4)             // Borda de câmera ativa
    val BorderGold = Color(0xFFF59E0B)             // Borda do card Master

    // Accents & Brand
    val PrimaryCyan = Color(0xFF22D3EE)            // Cor primária dos ícones e títulos
    val SuccessGreen = Color(0xFF10B981)           // Status conectado e taxa de quadros (24 FPS)
    val DestructiveRed = Color(0xFFE11D48)         // Botões de reset/limpeza e alertas

    // Master VIP Gold
    val MasterGold = Color(0xFFF59E0B)             // Dourado vibrante do selo Master
    val MasterGoldLight = Color(0xFFFDE68A)        // Texto e destaques do Master
    val MasterGradient = Brush.horizontalGradient(
        listOf(Color(0xFF78350F), Color(0xFF451A03)) // Gradiente VIP da Central Master
    )
    val MasterGradientVertical = Brush.verticalGradient(
        listOf(Color(0xFF78350F), Color(0xFF2E1005))
    )

    // Typography
    val TextPrimary = Color(0xFFFFFFFF)
    val TextSecondary = Color(0xFF94A3B8)
    val TextMuted = Color(0xFF64748B)

    // Overlays
    val VideoOverlayScrim = Color(0x99000000)
    val BadgeBackground = Color(0xCC090D16)
}

object SentinelaDimens {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val screenPadding = 16.dp
    val feedGap = 16.dp

    // Ergonomia One-Hand UI
    val MinTouchTarget = 48.dp                     // Área mínima de toque com o polegar
    val BottomBarHeight = 64.dp                    // Altura da barra de navegação inferior

    // Gestos
    const val MinZoom = 1.0f
    const val MaxZoom = 5.0f
}

object SentinelaShapes {
    val Button = RoundedCornerShape(12.dp)
    val SmallButton = RoundedCornerShape(8.dp)
    val CameraCard = RoundedCornerShape(16.dp)
    val MasterCard = RoundedCornerShape(16.dp)
    val PillBadge = RoundedCornerShape(20.dp)
    val ActionChip = RoundedCornerShape(10.dp)
}

object SentinelaTypography {
    val AppHeader = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.Black,
        color = SentinelaColors.TextPrimary,
        letterSpacing = 0.5.sp
    )

    val CardTitle = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = SentinelaColors.TextPrimary
    )

    val ActionButton = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        color = SentinelaColors.TextPrimary
    )

    val Subtext = TextStyle(
        fontSize = 11.sp,
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Normal,
        color = SentinelaColors.TextSecondary
    )

    val BadgeText = TextStyle(
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace,
        color = SentinelaColors.TextPrimary
    )

    val MasterTitle = TextStyle(
        fontSize = 15.sp,
        fontWeight = FontWeight.Black,
        color = SentinelaColors.MasterGoldLight
    )
}
