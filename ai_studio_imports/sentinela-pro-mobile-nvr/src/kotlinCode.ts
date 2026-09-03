export const DESIGN_TOKENS_KOTLIN = `package com.sentinela.pro.ui.theme

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
`;

export const SCREEN_KOTLIN = `package com.sentinela.pro.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.sentinela.pro.ui.theme.*

/**
 * Modelos de Domínio do Sentinela Pro Smartphone NVR
 */
data class CameraFeed(
    val id: String,
    val name: String,
    val zone: String,
    val resolution: String = "4K HDR",
    val fps: Int = 24,
    val isLive: Boolean = true,
    val hasMotionAlert: Boolean = false,
    val detectedLabel: String? = null,
    val ipAddress: String = "100.82.14.20"
)

data class TvDevice(
    val id: String,
    val name: String,
    val room: String,
    val ipAddress: String,
    val isOnline: Boolean = true,
    val isPipActive: Boolean = false
)

enum class SentinelaTab(val title: String, val icon: ImageVector) {
    LIVE("Ao Vivo", Icons.Default.Videocam),
    CAPTURES("Capturas", Icons.Default.PhotoLibrary),
    SETTINGS("Ajustes", Icons.Default.Settings),
    MASTER("Master", Icons.Default.Star)
}

/**
 * TELA PRINCIPAL: SmartphoneYouTubeScreen
 * Suporta Feed Vertical One-Hand UI, Pinch-to-Zoom 1x-5x e Central Master VIP
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmartphoneYouTubeScreen(
    isMasterAdmin: Boolean = true,
    cameras: List<CameraFeed> = rememberMockCameras(),
    tvDevices: List<TvDevice> = rememberMockTvs(),
    onCaptureSnapshot: (CameraFeed) -> Unit = {},
    onRecordClip: (CameraFeed) -> Unit = {},
    onTestAllTvs: () -> Unit = {},
    onSimulateAiDetection: () -> Unit = {},
    onRefreshNetwork: () -> Unit = {},
    onTestTvPip: (TvDevice) -> Unit = {}
) {
    var currentTab by remember { mutableStateOf(SentinelaTab.LIVE) }
    val context = LocalContext.current

    Scaffold(
        containerColor = SentinelaColors.Background,
        topBar = {
            SentinelaTopBar(
                isMasterAdmin = isMasterAdmin,
                frigateStatus = "CONECTADO",
                tailscaleIp = "100.82.14.1"
            )
        },
        bottomBar = {
            SentinelaBottomNavigationBar(
                currentTab = currentTab,
                isMasterAdmin = isMasterAdmin,
                onTabSelected = { currentTab = it }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(SentinelaColors.Background)
        ) {
            when (currentTab) {
                SentinelaTab.LIVE -> {
                    VerticalCameraFeed(
                        cameras = cameras,
                        onCaptureSnapshot = {
                            onCaptureSnapshot(it)
                            Toast.makeText(context, "📸 Snapshot salvo: \${it.name}", Toast.LENGTH_SHORT).show()
                        },
                        onRecordClip = {
                            onRecordClip(it)
                            Toast.makeText(context, "🎬 Gravando clipe de 10s: \${it.name}", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                SentinelaTab.MASTER -> {
                    if (isMasterAdmin) {
                        MasterCentralPanel(
                            tvDevices = tvDevices,
                            onTestAllTvs = {
                                onTestAllTvs()
                                Toast.makeText(context, "🚨 Disparando PiP em TODAS as TVs!", Toast.LENGTH_SHORT).show()
                            },
                            onSimulateAiDetection = {
                                onSimulateAiDetection()
                                Toast.makeText(context, "⚡ Simulação de IA Ativada: Pessoa Detectada", Toast.LENGTH_SHORT).show()
                            },
                            onRefreshNetwork = {
                                onRefreshNetwork()
                                Toast.makeText(context, "🔄 Varrendo rede Tailscale / Mesh...", Toast.LENGTH_SHORT).show()
                            },
                            onTestTvPip = { tv ->
                                onTestTvPip(tv)
                                Toast.makeText(context, "📡 Testando PiP em: \${tv.name}", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
                SentinelaTab.CAPTURES -> {
                    CapturesPlaceholderView()
                }
                SentinelaTab.SETTINGS -> {
                    SettingsPlaceholderView(isMasterAdmin = isMasterAdmin)
                }
            }
        }
    }
}

/**
 * 1. TOP BAR COMPACTA COM STATUS
 */
@Composable
fun SentinelaTopBar(
    isMasterAdmin: Boolean,
    frigateStatus: String,
    tailscaleIp: String
) {
    Surface(
        color = SentinelaColors.Background,
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = SentinelaDimens.screenPadding, vertical = SentinelaDimens.sm),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Logotipo e Título
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(SentinelaDimens.sm)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(SentinelaColors.CardBackgroundElevated, SentinelaShapes.SmallButton)
                        .border(1.dp, SentinelaColors.BorderCyan, SentinelaShapes.SmallButton),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Sentinela Logo",
                        tint = SentinelaColors.PrimaryCyan,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "SENTINELA",
                            style = SentinelaTypography.AppHeader
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "PRO",
                            style = SentinelaTypography.AppHeader.copy(
                                color = if (isMasterAdmin) SentinelaColors.MasterGold else SentinelaColors.PrimaryCyan
                            )
                        )
                    }
                    Text(
                        text = "v2.4.0 • NVR MOBILE",
                        style = SentinelaTypography.Subtext.copy(fontSize = 9.sp, color = SentinelaColors.TextMuted)
                    )
                }
            }

            // Indicador Frigate / Tailscale
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Badge Conexão
                Surface(
                    shape = SentinelaShapes.PillBadge,
                    color = SentinelaColors.CardBackgroundElevated,
                    border = BorderStroke(1.dp, SentinelaColors.BorderStandard)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(SentinelaColors.SuccessGreen, CircleShape)
                        )
                        Text(
                            text = frigateStatus,
                            style = SentinelaTypography.BadgeText.copy(
                                color = SentinelaColors.SuccessGreen,
                                fontSize = 9.sp
                            )
                        )
                    }
                }

                if (isMasterAdmin) {
                    Surface(
                        shape = SentinelaShapes.PillBadge,
                        color = SentinelaColors.MasterGold.copy(alpha = 0.15f),
                        border = BorderStroke(1.dp, SentinelaColors.MasterGold)
                    ) {
                        Text(
                            text = "MASTER",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            style = SentinelaTypography.BadgeText.copy(
                                color = SentinelaColors.MasterGold,
                                fontSize = 9.sp
                            )
                        )
                    }
                }
            }
        }
    }
}

/**
 * 2. FEED VERTICAL DINÂMICO (Estilo YouTube Shorts / Reels)
 */
@Composable
fun VerticalCameraFeed(
    cameras: List<CameraFeed>,
    onCaptureSnapshot: (CameraFeed) -> Unit,
    onRecordClip: (CameraFeed) -> Unit
) {
    val listState = rememberLazyListState()

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = SentinelaDimens.screenPadding,
            end = SentinelaDimens.screenPadding,
            top = SentinelaDimens.sm,
            bottom = SentinelaDimens.feedGap
        ),
        verticalArrangement = Arrangement.spacedBy(SentinelaDimens.feedGap)
    ) {
        items(cameras, key = { it.id }) { camera ->
            CameraStreamCard(
                camera = camera,
                onCaptureSnapshot = { onCaptureSnapshot(camera) },
                onRecordClip = { onRecordClip(camera) }
            )
        }
    }
}

/**
 * CARD DE CÂMERA 16:9 COM PINCH-TO-ZOOM (1.0f a 5.0f) E HARDWARE DECODE
 */
@Composable
fun CameraStreamCard(
    camera: CameraFeed,
    onCaptureSnapshot: () -> Unit,
    onRecordClip: () -> Unit
) {
    var scale by remember { mutableStateOf(1.0f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    var isRecording by remember { mutableStateOf(false) }

    val animatedBorderColor by animateColorAsState(
        targetValue = if (camera.hasMotionAlert) SentinelaColors.DestructiveRed
        else if (scale > 1.05f) SentinelaColors.BorderCyan
        else SentinelaColors.BorderStandard,
        label = "borderAnim"
    )

    Card(
        shape = SentinelaShapes.CameraCard,
        colors = CardDefaults.cardColors(containerColor = SentinelaColors.CardBackground),
        border = BorderStroke(1.dp, animatedBorderColor),
        modifier = Modifier
            .fillMaxWidth()
            .shadow(4.dp, SentinelaShapes.CameraCard)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Viewport de Vídeo 16:9 com Gestos Multitoque
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(SentinelaShapes.CameraCard)
                    .background(Color.Black)
                    .pointerInput(Unit) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            scale = (scale * zoom).coerceIn(
                                SentinelaDimens.MinZoom,
                                SentinelaDimens.MaxZoom
                            )
                            val maxOffset = 300f * (scale - 1f)
                            offset = Offset(
                                x = (offset.x + pan.x).coerceIn(-maxOffset, maxOffset),
                                y = (offset.y + pan.y).coerceIn(-maxOffset, maxOffset)
                            )
                        }
                    }
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onDoubleTap = {
                                // Reset suave com duplo toque
                                scale = 1.0f
                                offset = Offset.Zero
                            }
                        )
                    }
            ) {
                // Conteúdo de Vídeo Simulado / TextureView
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer(
                            scaleX = scale,
                            scaleY = scale,
                            translationX = offset.x,
                            translationY = offset.y
                        )
                        .background(Color(0xFF0F172A)),
                    contentAlignment = Alignment.Center
                ) {
                    // Gradiente de simulação de vídeo
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.radialGradient(
                                    listOf(Color(0xFF1E293B), Color(0xFF050811))
                                )
                            )
                    )

                    // Ícone central de stream
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Videocam,
                            contentDescription = "Stream Ativo",
                            tint = SentinelaColors.PrimaryCyan.copy(alpha = 0.4f),
                            modifier = Modifier.size(36.dp)
                        )
                        Text(
                            text = "RTSP STREAM H.265 (GPU DECODE)",
                            style = SentinelaTypography.Subtext.copy(
                                fontSize = 9.sp,
                                color = SentinelaColors.TextMuted
                            )
                        )
                    }

                    // Detecção de IA Bounding Box (Se houver movimento)
                    if (camera.hasMotionAlert && camera.detectedLabel != null) {
                        Box(
                            modifier = Modifier
                                .size(width = 110.dp, height = 75.dp)
                                .align(Alignment.Center)
                                .border(2.dp, SentinelaColors.DestructiveRed, SentinelaShapes.SmallButton)
                                .background(SentinelaColors.DestructiveRed.copy(alpha = 0.1f))
                        ) {
                            Text(
                                text = "⚠️ \${camera.detectedLabel.uppercase()}",
                                style = SentinelaTypography.BadgeText.copy(
                                    fontSize = 8.sp,
                                    color = Color.White
                                ),
                                modifier = Modifier
                                    .align(Alignment.TopStart)
                                    .background(SentinelaColors.DestructiveRed)
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                // BADGES FLUTUANTES NO TOPO
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(SentinelaDimens.sm)
                        .align(Alignment.TopCenter),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Badge Nome da Câmera
                    Surface(
                        shape = SentinelaShapes.PillBadge,
                        color = SentinelaColors.BadgeBackground,
                        border = BorderStroke(1.dp, SentinelaColors.BorderStandard)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .background(SentinelaColors.PrimaryCyan, CircleShape)
                            )
                            Text(
                                text = camera.name.uppercase(),
                                style = SentinelaTypography.BadgeText
                            )
                        }
                    }

                    // Badge Resolução & FPS (24 FPS)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Surface(
                            shape = SentinelaShapes.PillBadge,
                            color = SentinelaColors.BadgeBackground
                        ) {
                            Text(
                                text = camera.resolution,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                style = SentinelaTypography.BadgeText.copy(
                                    color = SentinelaColors.TextSecondary,
                                    fontSize = 9.sp
                                )
                            )
                        }

                        Surface(
                            shape = SentinelaShapes.PillBadge,
                            color = SentinelaColors.SuccessGreen.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, SentinelaColors.SuccessGreen)
                        ) {
                            Text(
                                text = "\${camera.fps} FPS",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                                style = SentinelaTypography.BadgeText.copy(
                                    color = SentinelaColors.SuccessGreen,
                                    fontSize = 9.sp
                                )
                            )
                        }
                    }
                }

                // Indicador de Zoom Ativo
                if (scale > 1.05f) {
                    Surface(
                        shape = SentinelaShapes.PillBadge,
                        color = SentinelaColors.PrimaryCyan.copy(alpha = 0.9f),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(SentinelaDimens.sm)
                    ) {
                        Text(
                            text = String.format("%.1fx ZOOM", scale),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = SentinelaTypography.BadgeText.copy(
                                color = Color.Black,
                                fontSize = 9.sp
                            )
                        )
                    }
                }
            }

            // BARRA DE INFORMAÇÕES E BOTÕES RÁPIDOS
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = SentinelaDimens.md, vertical = SentinelaDimens.sm),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Zona e IP
                Column {
                    Text(
                        text = camera.zone,
                        style = SentinelaTypography.CardTitle
                    )
                    Text(
                        text = "IP: \${camera.ipAddress}",
                        style = SentinelaTypography.Subtext
                    )
                }

                // Botões de Ação Rápida (Tamanho Mínimo de Toque para Polegar)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(SentinelaDimens.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Botão Snapshot
                    IconButton(
                        onClick = onCaptureSnapshot,
                        modifier = Modifier
                            .size(SentinelaDimens.MinTouchTarget)
                            .background(SentinelaColors.CardBackgroundElevated, SentinelaShapes.Button)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = "Tirar Foto",
                            tint = SentinelaColors.PrimaryCyan,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    // Botão Gravar Clipe
                    IconButton(
                        onClick = {
                            isRecording = !isRecording
                            onRecordClip()
                        },
                        modifier = Modifier
                            .size(SentinelaDimens.MinTouchTarget)
                            .background(
                                if (isRecording) SentinelaColors.DestructiveRed.copy(alpha = 0.2f)
                                else SentinelaColors.CardBackgroundElevated,
                                SentinelaShapes.Button
                            )
                            .border(
                                1.dp,
                                if (isRecording) SentinelaColors.DestructiveRed else Color.Transparent,
                                SentinelaShapes.Button
                            )
                    ) {
                        Icon(
                            imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.FiberManualRecord,
                            contentDescription = "Gravar Vídeo",
                            tint = if (isRecording) SentinelaColors.DestructiveRed else SentinelaColors.TextPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 3. CENTRAL MASTER (Aba "⭐ Central Master" — Apenas se isMasterAdmin == true)
 * VIP Panel Dourado com Controles em Lote e Grade de TVs
 */
@Composable
fun MasterCentralPanel(
    tvDevices: List<TvDevice>,
    onTestAllTvs: () -> Unit,
    onSimulateAiDetection: () -> Unit,
    onRefreshNetwork: () -> Unit,
    onTestTvPip: (TvDevice) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = SentinelaDimens.screenPadding,
            end = SentinelaDimens.screenPadding,
            top = SentinelaDimens.sm,
            bottom = SentinelaDimens.feedGap
        ),
        verticalArrangement = Arrangement.spacedBy(SentinelaDimens.md)
    ) {
        // VIP Banner Dourado
        item {
            Card(
                shape = SentinelaShapes.MasterCard,
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, SentinelaShapes.MasterCard),
                border = BorderStroke(1.dp, SentinelaColors.MasterGold)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SentinelaColors.MasterGradient)
                        .padding(SentinelaDimens.screenPadding)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(SentinelaDimens.sm)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(SentinelaDimens.sm)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(SentinelaColors.MasterGold.copy(alpha = 0.2f), CircleShape)
                                    .border(1.dp, SentinelaColors.MasterGold, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = "Master Crown",
                                    tint = SentinelaColors.MasterGoldLight,
                                    modifier = Modifier.size(22.dp)
                                )
                            }

                            Column {
                                Text(
                                    text = "⭐ CENTRAL MASTER CFTV",
                                    style = SentinelaTypography.MasterTitle
                                )
                                Text(
                                    text = "Broadcast & Gestão de PiP em Todas as Smart TVs",
                                    style = SentinelaTypography.Subtext.copy(
                                        color = SentinelaColors.MasterGoldLight.copy(alpha = 0.8f)
                                    )
                                )
                            }
                        }

                        Divider(
                            color = SentinelaColors.MasterGold.copy(alpha = 0.3f),
                            thickness = 1.dp
                        )

                        // BOTÕES DE TESTE EM LOTE
                        Column(verticalArrangement = Arrangement.spacedBy(SentinelaDimens.sm)) {
                            // [🚨 Testar Todas as TVs]
                            Button(
                                onClick = onTestAllTvs,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(SentinelaDimens.MinTouchTarget),
                                shape = SentinelaShapes.Button,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = SentinelaColors.DestructiveRed
                                )
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Tv,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Text(
                                        text = "🚨 TESTAR TODAS AS TVs (BROADCAST)",
                                        style = SentinelaTypography.ActionButton
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(SentinelaDimens.sm)
                            ) {
                                // [⚡ Simular Detecção IA]
                                OutlinedButton(
                                    onClick = onSimulateAiDetection,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(SentinelaDimens.MinTouchTarget),
                                    shape = SentinelaShapes.Button,
                                    border = BorderStroke(1.dp, SentinelaColors.MasterGold),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        contentColor = SentinelaColors.MasterGoldLight
                                    )
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Bolt,
                                            contentDescription = null,
                                            tint = SentinelaColors.MasterGold,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Text(
                                            text = "⚡ SIMULAR IA",
                                            style = SentinelaTypography.ActionButton.copy(
                                                fontSize = 11.sp,
                                                color = SentinelaColors.MasterGoldLight
                                            ),
                                            maxLines = 1
                                        )
                                    }
                                }

                                // [🔄 Atualizar Status de Rede]
                                OutlinedButton(
                                    onClick = onRefreshNetwork,
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(SentinelaDimens.MinTouchTarget),
                                    shape = SentinelaShapes.Button,
                                    border = BorderStroke(1.dp, SentinelaColors.BorderStandard),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        containerColor = SentinelaColors.CardBackgroundElevated,
                                        contentColor = SentinelaColors.TextPrimary
                                    )
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Refresh,
                                            contentDescription = null,
                                            tint = SentinelaColors.PrimaryCyan,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Text(
                                            text = "🔄 ATUALIZAR",
                                            style = SentinelaTypography.ActionButton.copy(
                                                fontSize = 11.sp
                                            ),
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Título da Seção Grade de TVs
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "DISPOSITIVOS NA REDE DOMÉSTICA",
                    style = SentinelaTypography.CardTitle.copy(
                        color = SentinelaColors.TextSecondary,
                        fontSize = 11.sp
                    )
                )
                Text(
                    text = "\${tvDevices.count { it.isOnline }}/\${tvDevices.size} ONLINE",
                    style = SentinelaTypography.BadgeText.copy(
                        color = SentinelaColors.SuccessGreen,
                        fontSize = 10.sp
                    )
                )
            }
        }

        // Grade de Smart TVs Conectadas
        items(tvDevices, key = { it.id }) { tv ->
            TvDeviceMasterCard(
                tv = tv,
                onTestPip = { onTestTvPip(tv) }
            )
        }
    }
}

/**
 * CARD INDIVIDUAL DE SMART TV NO PAINEL MASTER
 */
@Composable
fun TvDeviceMasterCard(
    tv: TvDevice,
    onTestPip: () -> Unit
) {
    Card(
        shape = SentinelaShapes.CameraCard,
        colors = CardDefaults.cardColors(containerColor = SentinelaColors.CardBackground),
        border = BorderStroke(
            1.dp,
            if (tv.isPipActive) SentinelaColors.MasterGold else SentinelaColors.BorderStandard
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(SentinelaDimens.md),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Informações da TV
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(SentinelaDimens.md)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .background(
                            if (tv.isOnline) SentinelaColors.CardBackgroundElevated else Color(0xFF18181B),
                            SentinelaShapes.SmallButton
                        )
                        .border(
                            1.dp,
                            if (tv.isOnline) SentinelaColors.PrimaryCyan.copy(alpha = 0.4f) else Color.Transparent,
                            SentinelaShapes.SmallButton
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Tv,
                        contentDescription = tv.name,
                        tint = if (tv.isOnline) SentinelaColors.PrimaryCyan else SentinelaColors.TextMuted,
                        modifier = Modifier.size(22.dp)
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = tv.name,
                        style = SentinelaTypography.CardTitle
                    )
                    Text(
                        text = "\${tv.room} • \${tv.ipAddress}",
                        style = SentinelaTypography.Subtext
                    )
                }
            }

            // Status e Botão Testar PiP Individual
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(SentinelaDimens.sm)
            ) {
                // Status Badge
                Surface(
                    shape = SentinelaShapes.PillBadge,
                    color = if (tv.isOnline) SentinelaColors.SuccessGreen.copy(alpha = 0.15f)
                    else SentinelaColors.DestructiveRed.copy(alpha = 0.15f),
                    border = BorderStroke(
                        1.dp,
                        if (tv.isOnline) SentinelaColors.SuccessGreen else SentinelaColors.DestructiveRed
                    )
                ) {
                    Text(
                        text = if (tv.isOnline) "ONLINE" else "OFFLINE",
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        style = SentinelaTypography.BadgeText.copy(
                            color = if (tv.isOnline) SentinelaColors.SuccessGreen else SentinelaColors.DestructiveRed,
                            fontSize = 9.sp
                        )
                    )
                }

                // Botão de Disparo Individual
                Button(
                    onClick = onTestPip,
                    enabled = tv.isOnline,
                    shape = SentinelaShapes.SmallButton,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SentinelaColors.CardBackgroundElevated,
                        contentColor = SentinelaColors.PrimaryCyan,
                        disabledContainerColor = Color(0xFF1E293B).copy(alpha = 0.5f),
                        disabledContentColor = SentinelaColors.TextMuted
                    ),
                    border = BorderStroke(1.dp, SentinelaColors.BorderStandard),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    modifier = Modifier.height(36.dp)
                ) {
                    Text(
                        text = "TESTAR PiP",
                        style = SentinelaTypography.ActionButton.copy(fontSize = 10.sp)
                    )
                }
            }
        }
    }
}

/**
 * 4. BOTTOM NAVIGATION BAR ESTILIZADA (Thumb Ergonomics - One-Hand UI)
 */
@Composable
fun SentinelaBottomNavigationBar(
    currentTab: SentinelaTab,
    isMasterAdmin: Boolean,
    onTabSelected: (SentinelaTab) -> Unit
) {
    Surface(
        color = SentinelaColors.BottomBarBackground,
        modifier = Modifier
            .fillMaxWidth()
            .height(SentinelaDimens.BottomBarHeight)
            .navigationBarsPadding(),
        border = BorderStroke(1.dp, SentinelaColors.BorderStandard)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = SentinelaDimens.sm),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val tabs = buildList {
                add(SentinelaTab.LIVE)
                add(SentinelaTab.CAPTURES)
                add(SentinelaTab.SETTINGS)
                if (isMasterAdmin) {
                    add(SentinelaTab.MASTER)
                }
            }

            tabs.forEach { tab ->
                val isSelected = currentTab == tab
                val isMaster = tab == SentinelaTab.MASTER

                val selectedTint = if (isMaster) SentinelaColors.MasterGold else SentinelaColors.PrimaryCyan
                val unselectedTint = SentinelaColors.TextMuted

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable { onTabSelected(tab) }
                        .padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(if (isSelected) 36.dp else 32.dp)
                            .background(
                                if (isSelected) {
                                    if (isMaster) SentinelaColors.MasterGold.copy(alpha = 0.15f)
                                    else SentinelaColors.PrimaryCyan.copy(alpha = 0.12f)
                                } else Color.Transparent,
                                CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = tab.title,
                            tint = if (isSelected) selectedTint else unselectedTint,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Text(
                        text = if (isMaster) "⭐ Master" else tab.title,
                        style = SentinelaTypography.ActionButton.copy(
                            fontSize = 10.sp,
                            color = if (isSelected) selectedTint else unselectedTint
                        ),
                        maxLines = 1
                    )
                }
            }
        }
    }
}

/**
 * Visualizações Auxiliares
 */
@Composable
fun CapturesPlaceholderView() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(SentinelaDimens.screenPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.PhotoLibrary,
            contentDescription = null,
            tint = SentinelaColors.PrimaryCyan,
            modifier = Modifier.size(48.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "GALERIA DE CAPTURAS E GRAVAÇÕES",
            style = SentinelaTypography.CardTitle
        )
        Text(
            text = "Snapshots e gravações salvas localmente e no Frigate NVR.",
            style = SentinelaTypography.Subtext,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}

@Composable
fun SettingsPlaceholderView(isMasterAdmin: Boolean) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(SentinelaDimens.screenPadding),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "CONFIGURAÇÕES DO SISTEMA",
            style = SentinelaTypography.AppHeader
        )
        Card(
            shape = SentinelaShapes.CameraCard,
            colors = CardDefaults.cardColors(containerColor = SentinelaColors.CardBackground),
            border = BorderStroke(1.dp, SentinelaColors.BorderStandard),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "Servidor Frigate NVR: 100.82.14.1:5000", style = SentinelaTypography.Subtext)
                Text(text = "Rede VPN: Tailscale Mesh (Ativa)", style = SentinelaTypography.Subtext)
                Text(text = "Codec de Aceleração: MediaCodec H.265 120Hz", style = SentinelaTypography.Subtext)
                Text(
                    text = "Permissão Master Admin: \${if (isMasterAdmin) "ATIVADO ⭐" else "DESATIVADO"}",
                    style = SentinelaTypography.Subtext.copy(
                        color = if (isMasterAdmin) SentinelaColors.MasterGold else SentinelaColors.TextSecondary
                    )
                )
            }
        }
    }
}

/**
 * Mock Data para Visualização e Preview
 */
@Composable
fun rememberMockCameras() = remember {
    listOf(
        CameraFeed(
            id = "cam_01",
            name = "Portão Principal & Garagem",
            zone = "Entrada Frontal",
            resolution = "4K HDR",
            fps = 24,
            hasMotionAlert = true,
            detectedLabel = "Pessoa Detectada",
            ipAddress = "100.82.14.10"
        ),
        CameraFeed(
            id = "cam_02",
            name = "Piscina & Área Gourmet",
            zone = "Quintal dos Fundos",
            resolution = "2K 1440p",
            fps = 24,
            hasMotionAlert = false,
            ipAddress = "100.82.14.11"
        ),
        CameraFeed(
            id = "cam_03",
            name = "Corredor Lateral Oeste",
            zone = "Perímetro Sensível",
            resolution = "1080p 60fps",
            fps = 24,
            hasMotionAlert = false,
            ipAddress = "100.82.14.12"
        ),
        CameraFeed(
            id = "cam_04",
            name = "Hall de Entrada & Sala",
            zone = "Interno Térreo",
            resolution = "2K 1440p",
            fps = 24,
            hasMotionAlert = false,
            ipAddress = "100.82.14.13"
        )
    )
}

@Composable
fun rememberMockTvs() = remember {
    listOf(
        TvDevice(id = "tv_01", name = "Sala de Estar (LG OLED 65\\")", room = "Living Principal", ipAddress = "192.168.1.120", isOnline = true),
        TvDevice(id = "tv_02", name = "Suíte Master (Samsung QLED 55\\")", room = "Quarto Casal", ipAddress = "192.168.1.121", isOnline = true),
        TvDevice(id = "tv_03", name = "Área Gourmet (TCL Roku 50\\")", room = "Churrasqueira", ipAddress = "192.168.1.122", isOnline = true),
        TvDevice(id = "tv_04", name = "Escritório (Android TV 43\\")", room = "Home Office", ipAddress = "192.168.1.123", isOnline = false)
    )
}

/**
 * Preview do Jetpack Compose para Android Studio
 */
@Preview(showBackground = true, backgroundColor = 0xFF090D16, device = "spec:width=412dp,height=915dp")
@Composable
fun SmartphoneYouTubeScreenPreview() {
    MaterialTheme {
        SmartphoneYouTubeScreen(isMasterAdmin = true)
    }
}
`;

export const VIEWMODEL_KOTLIN = `package com.sentinela.pro.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sentinela.pro.ui.screens.CameraFeed
import com.sentinela.pro.ui.screens.TvDevice
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SentinelaUiState(
    val isMasterAdmin: Boolean = true,
    val frigateServerOnline: Boolean = true,
    val tailscaleConnected: Boolean = true,
    val cameras: List<CameraFeed> = emptyList(),
    val tvDevices: List<TvDevice> = emptyList(),
    val isBatchTestingActive: Boolean = false,
    val activeDetectionAlert: String? = null
)

class SentinelaViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SentinelaUiState())
    val uiState: StateFlow<SentinelaUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        _uiState.update { state ->
            state.copy(
                isMasterAdmin = true,
                cameras = listOf(
                    CameraFeed("cam_01", "Portão Principal & Garagem", "Entrada Frontal", "4K HDR", 24, true, true, "Pessoa Detectada"),
                    CameraFeed("cam_02", "Piscina & Área Gourmet", "Quintal dos Fundos", "2K 1440p", 24, true, false, null),
                    CameraFeed("cam_03", "Corredor Lateral Oeste", "Perímetro Sensível", "1080p 60fps", 24, true, false, null),
                    CameraFeed("cam_04", "Hall de Entrada & Sala", "Interno Térreo", "2K 1440p", 24, true, false, null)
                ),
                tvDevices = listOf(
                    TvDevice("tv_01", "Sala de Estar (LG OLED 65\\")", "Living Principal", "192.168.1.120", true),
                    TvDevice("tv_02", "Suíte Master (Samsung QLED 55\\")", "Quarto Casal", "192.168.1.121", true),
                    TvDevice("tv_03", "Área Gourmet (TCL Roku 50\\")", "Churrasqueira", "192.168.1.122", true),
                    TvDevice("tv_04", "Escritório (Android TV 43\\")", "Home Office", "192.168.1.123", false)
                )
            )
        }
    }

    fun triggerBatchTvTest() {
        viewModelScope.launch {
            _uiState.update { it.copy(isBatchTestingActive = true) }
            // Simula envio de comando MQTT/Websocket para o broker
            _uiState.update { state ->
                state.copy(
                    tvDevices = state.tvDevices.map { it.copy(isPipActive = it.isOnline) }
                )
            }
        }
    }

    fun triggerSingleTvPip(tvId: String) {
        _uiState.update { state ->
            state.copy(
                tvDevices = state.tvDevices.map {
                    if (it.id == tvId) it.copy(isPipActive = !it.isPipActive) else it
                }
            )
        }
    }

    fun simulateAiDetection() {
        _uiState.update { state ->
            state.copy(
                activeDetectionAlert = "Pessoa detectada na Garagem",
                cameras = state.cameras.map {
                    if (it.id == "cam_01") it.copy(hasMotionAlert = true, detectedLabel = "Intruso / Pessoa")
                    else it
                }
            )
        }
    }

    fun toggleMasterAdmin(enabled: Boolean) {
        _uiState.update { it.copy(isMasterAdmin = enabled) }
    }
}
`;
