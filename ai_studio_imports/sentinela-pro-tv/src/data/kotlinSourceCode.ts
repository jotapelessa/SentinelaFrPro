export const KOTLIN_THEME_TOKENS_CODE = `package com.sentinela.nvr.tv.theme

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * ============================================================================
 * SENTINELA PRO — ANDROID TV (JETPACK COMPOSE DESIGN SYSTEM)
 * Centralized Design Tokens (TvObsidianTheme)
 * Ergonomia 10-Foot UI para Smart TV Widescreen 16:9 (1080p / 4K UHD)
 * ============================================================================
 */
object TvColors {
    // 1. Paleta de Cores (Cores HEX Exatas)
    val Background = Color(0xFF070B14)              // Fundo principal Dark Obsidian cinematográfico
    val SidebarBackground = Color(0xFF090D18)       // Fundo da Sidebar vertical esquerda
    val CardBackground = Color(0xFF0E1424)          // Superfície dos cards de câmeras
    val CardBackgroundElevated = Color(0xFF161F36)  // Superfície elevada de destaque
    val OverlayHud = Color(0xCC050E1A)              // Fundo translúcido do HUD de alertas PiP
    val BorderSubtle = Color(0xFF1E293B)            // Borda sutil padrão
    val BorderHighlight = Color(0xFF06B6D4)         // Borda Ciano Neon
    val BorderFocused = Color(0xFFFFFFFF)           // Borda Branca de foco D-Pad
    val NetflixRed = Color(0xFFE50914)              // Vermelho Hero — Foco e Seleção D-Pad
    val CyberCyan = Color(0xFF22D3EE)               // Ciano para status e streaming
    val LiveGreen = Color(0xFF10B981)               // Verde esmeralda para status Online e 24 FPS
    val StandbyAmber = Color(0xFFF59E0B)            // Modo Standby
    val AlertCrimson = Color(0xFFEF4444)            // Gravação ativa e alertas críticos
    
    // Tipografia / Neutros
    val TextPrimary = Color(0xFFFFFFFF)
    val TextSecondary = Color(0xFF94A3B8)
    val TextMuted = Color(0xFF475569)
}

object TvDimens {
    // 2. Espaçamentos & Dimensões
    val xs: Dp = 4.dp
    val sm: Dp = 8.dp
    val md: Dp = 16.dp
    val lg: Dp = 24.dp
    val xl: Dp = 32.dp

    val SidebarWidth: Dp = 250.dp                   // Barra lateral fixa esquerda
    val GridMinCardWidth: Dp = 320.dp               // Cards com aspectRatio(16f/9f)
    val FocusBorderWidth: Dp = 2.dp
    val PipWidth: Dp = 380.dp
    val PipHeight: Dp = 220.dp
}

object TvShapes {
    // 3. Formas (Shapes) & Bordas
    val MenuItem = RoundedCornerShape(10.dp)
    val CameraCard = RoundedCornerShape(14.dp)
    val StatusPill = RoundedCornerShape(20.dp)
    val PipWindow = RoundedCornerShape(16.dp)
    val Badge = RoundedCornerShape(6.dp)
}

object TvTypography {
    // 4. Tipografia & Hierarquia 10-Foot UI
    val Logo = TextStyle(
        fontSize = 22.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 2.sp,
        color = TvColors.NetflixRed
    )

    val TabTitle = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        color = TvColors.TextPrimary
    )

    val MenuItem = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = TvColors.TextSecondary
    )

    val MenuItemFocused = TextStyle(
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = TvColors.TextPrimary
    )

    val Telemetry = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 11.sp,
        fontWeight = FontWeight.Normal,
        color = TvColors.CyberCyan
    )

    val Clock = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        color = TvColors.TextPrimary
    )
}

/**
 * Modificador de Foco D-Pad com Elevação, Escala Suave (1.04x) e Borda de Alto Contraste
 */
@Composable
fun Modifier.tvDpadFocusable(
    isFocused: Boolean,
    focusedBorderColor: Color = TvColors.BorderFocused,
    unfocusedBorderColor: Color = TvColors.BorderSubtle,
    shape: androidx.compose.ui.graphics.Shape = TvShapes.CameraCard,
    scaleAmount: Float = 1.04f,
    elevation: Dp = 12.dp
): Modifier {
    val animatedScale by animateFloatAsState(
        targetValue = if (isFocused) scaleAmount else 1f,
        animationSpec = tween(durationMillis = 180),
        label = "DpadScaleAnimation"
    )

    return this
        .scale(animatedScale)
        .then(
            if (isFocused) {
                Modifier
                    .shadow(elevation, shape, clip = false, spotColor = TvColors.NetflixRed, ambientColor = TvColors.CyberCyan)
                    .border(BorderStroke(TvDimens.FocusBorderWidth, focusedBorderColor), shape)
            } else {
                Modifier.border(BorderStroke(1.dp, unfocusedBorderColor), shape)
            }
        )
}
`;

export const KOTLIN_MODELS_CODE = `package com.sentinela.nvr.tv.model

enum class CameraStatus {
    ONLINE,
    STANDBY,
    ALERT,
    RECORDING
}

enum class TvTab(val title: String, val iconResName: String) {
    CAMERAS("Câmeras", "ic_tv_camera"),
    RECORDINGS("Capturas", "ic_tv_video"),
    TOOLS("Ferramentas", "ic_tv_tools"),
    LOGS("Logs", "ic_tv_logs"),
    SETTINGS("Configurações", "ic_tv_settings")
}

data class DetectedObject(
    val id: String,
    val label: String,
    val confidence: Float,
    val normX: Float,
    val normY: Float,
    val normWidth: Float,
    val normHeight: Float,
    val alertColorHex: Long
)

data class CameraTelemetry(
    val ip: String,
    val codec: String = "H.265 Main 10",
    val resolution: String = "3840x2160 (4K UHD)",
    val fps: Float = 24.0f,
    val bitrateKbps: Int = 8420,
    val latencyMs: Int = 32,
    val cpuPercent: Int = 18,
    val temperatureC: Float = 44.2f
)

data class CameraEntity(
    val id: String,
    val channel: Int,
    val name: String,
    val location: String,
    val zone: String,
    val status: CameraStatus,
    val isRecording: Boolean,
    val hasPtz: Boolean,
    val hasAudio: Boolean,
    val motionEventsCount: Int,
    val streamUrl: String,
    val thumbnailUrl: String,
    val telemetry: CameraTelemetry,
    val activeDetections: List<DetectedObject> = emptyList()
)

data class PipAlert(
    val id: String,
    val camera: CameraEntity,
    val eventTitle: String,
    val eventDescription: String,
    val timestamp: String,
    val snapshotUrl: String,
    val countdownSeconds: Int = 10,
    val isVisible: Boolean = true
)
`;

export const KOTLIN_SCREEN_CODE = `package com.sentinela.nvr.tv.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.sentinela.nvr.tv.model.*
import com.sentinela.nvr.tv.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * ============================================================================
 * SENTINELA PRO NVR — TELA PRINCIPAL ANDROID TV (TvNetflixScreen.kt)
 * 100% Jetpack Compose Nativo + 10-Foot UI + Ergonomia D-Pad
 * ============================================================================
 */
@Composable
fun TvNetflixScreen(
    cameras: List<CameraEntity>,
    activePipAlert: PipAlert? = null,
    tailscaleIp: String = "100.84.21.9",
    onCameraSelected: (CameraEntity) -> Unit = {},
    onDismissPip: () -> Unit = {},
    onExpandPipToHero: (CameraEntity) -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(TvTab.CAMERAS) }
    var focusedCameraIndex by remember { mutableIntStateOf(0) }
    val selectedCamera = cameras.getOrNull(focusedCameraIndex) ?: cameras.firstOrNull()

    // Focus Requesters para navegação por controle remoto
    val sidebarFocusRequesters = remember { List(TvTab.values().size) { FocusRequester() } }
    val carouselFocusRequesters = remember { List(cameras.size.coerceAtLeast(1)) { FocusRequester() } }
    val heroFocusRequester = remember { FocusRequester() }
    val pipFocusRequester = remember { FocusRequester() }

    val coroutineScope = rememberCoroutineScope()
    val carouselListState = rememberLazyListState()

    // Efeito para sincronizar rolagem do carrossel ao focar com D-Pad
    LaunchedEffect(focusedCameraIndex) {
        if (focusedCameraIndex in cameras.indices) {
            carouselListState.animateScrollToItem(focusedCameraIndex)
        }
    }

    // Estrutura em Row(Modifier.fillMaxSize()) conforme especificação
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TvColors.Background)
    ) {
        Row(
            modifier = Modifier.fillMaxSize()
        ) {
            // ----------------------------------------------------------------
            // 1. SIDEBAR LATERAL À ESQUERDA (250.dp)
            // ----------------------------------------------------------------
            TvSidebar(
                selectedTab = selectedTab,
                tailscaleIp = tailscaleIp,
                focusRequesters = sidebarFocusRequesters,
                onTabSelected = { tab ->
                    selectedTab = tab
                },
                onNavigateToContent = {
                    coroutineScope.launch {
                        if (selectedTab == TvTab.CAMERAS && cameras.isNotEmpty()) {
                            carouselFocusRequesters.getOrNull(focusedCameraIndex)?.requestFocus()
                        }
                    }
                }
            )

            // ----------------------------------------------------------------
            // 2. VIEWPORT DE CONTEÚDO À DIREITA (weight(1f))
            // ----------------------------------------------------------------
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(horizontal = TvDimens.lg, vertical = TvDimens.md)
            ) {
                when (selectedTab) {
                    TvTab.CAMERAS -> {
                        TvCamerasViewport(
                            cameras = cameras,
                            selectedCamera = selectedCamera,
                            focusedIndex = focusedCameraIndex,
                            carouselState = carouselListState,
                            carouselFocusRequesters = carouselFocusRequesters,
                            heroFocusRequester = heroFocusRequester,
                            onFocusCamera = { index ->
                                focusedCameraIndex = index
                            },
                            onSelectCamera = { camera ->
                                onCameraSelected(camera)
                            },
                            onNavigateLeftToSidebar = {
                                sidebarFocusRequesters.getOrNull(0)?.requestFocus()
                            }
                        )
                    }
                    TvTab.RECORDINGS -> TvPlaceholderViewport(title = "Capturas & Linha do Tempo CFTV")
                    TvTab.TOOLS -> TvPlaceholderViewport(title = "Ferramentas & Calibração PTZ / NVR")
                    TvTab.LOGS -> TvPlaceholderViewport(title = "Auditoria & Logs de Segurança em Tempo Real")
                    TvTab.SETTINGS -> TvPlaceholderViewport(title = "Configurações da TV & Decodificador H.265")
                }

                // Janela Flutuante PiP Dual-Layer com Contagem Regressiva e Moldura Ciano
                activePipAlert?.let { alert ->
                    if (alert.isVisible) {
                        TvPipFloatingWindow(
                            alert = alert,
                            focusRequester = pipFocusRequester,
                            onDismiss = onDismissPip,
                            onExpand = { onExpandPipToHero(alert.camera) },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(top = TvDimens.md, end = TvDimens.md)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 1. SIDEBAR COMPONENT (250.dp Fixo)
 */
@Composable
fun TvSidebar(
    selectedTab: TvTab,
    tailscaleIp: String,
    focusRequesters: List<FocusRequester>,
    onTabSelected: (TvTab) -> Unit,
    onNavigateToContent: () -> Unit
) {
    var currentTimeString by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        while (true) {
            currentTimeString = sdf.format(Date())
            delay(1000)
        }
    }

    Column(
        modifier = Modifier
            .width(TvDimens.SidebarWidth)
            .fillMaxHeight()
            .background(TvColors.SidebarBackground)
            .border(width = 1.dp, color = TvColors.BorderSubtle)
            .padding(TvDimens.md),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // CABEÇALHO DA SIDEBAR
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Start
        ) {
            // Logo "SENTINELA" em vermelho Netflix + Badge "TV PRO"
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(TvDimens.sm)
            ) {
                Text(
                    text = "SENTINELA",
                    style = TvTypography.Logo
                )
                Surface(
                    shape = TvShapes.Badge,
                    color = TvColors.NetflixRed
                ) {
                    Text(
                        text = "TV PRO",
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.ExtraBold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Text(
                text = "v2.4.0-TV • Leanback",
                style = TvTypography.Telemetry.copy(color = TvColors.TextMuted),
                modifier = Modifier.padding(top = 2.dp, bottom = TvDimens.sm)
            )

            // Pílula 🟢 ONLINE • 24 FPS
            Surface(
                shape = TvShapes.StatusPill,
                color = TvColors.LiveGreen.copy(alpha = 0.15f),
                border = BorderStroke(1.dp, TvColors.LiveGreen.copy(alpha = 0.6f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .background(TvColors.LiveGreen, CircleShape)
                    )
                    Text(
                        text = "ONLINE • 24 FPS",
                        color = TvColors.LiveGreen,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            Spacer(modifier = Modifier.height(TvDimens.lg))

            // MENU VERTICAL D-PAD FOCUSABLE
            TvTab.values().forEachIndexed { index, tab ->
                val interactionSource = remember { MutableInteractionSource() }
                val isFocused by interactionSource.collectIsFocusedAsState()
                val isSelected = selectedTab == tab

                val icon = when (tab) {
                    TvTab.CAMERAS -> Icons.Default.Videocam
                    TvTab.RECORDINGS -> Icons.Default.Movie
                    TvTab.TOOLS -> Icons.Default.FlashOn
                    TvTab.LOGS -> Icons.Default.Analytics
                    TvTab.SETTINGS -> Icons.Default.Settings
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = TvDimens.xs)
                        .focusRequester(focusRequesters.getOrElse(index) { FocusRequester() })
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown) {
                                when (keyEvent.key) {
                                    Key.DirectionRight, Key.Enter, Key.DpadCenter -> {
                                        onTabSelected(tab)
                                        onNavigateToContent()
                                        true
                                    }
                                    else -> false
                                }
                            } else false
                        }
                        .tvDpadFocusable(
                            isFocused = isFocused,
                            focusedBorderColor = TvColors.NetflixRed,
                            unfocusedBorderColor = if (isSelected) TvColors.BorderHighlight else Color.Transparent,
                            shape = TvShapes.MenuItem,
                            scaleAmount = 1.03f
                        )
                        .background(
                            color = when {
                                isFocused -> TvColors.CardBackgroundElevated
                                isSelected -> TvColors.CardBackground
                                else -> Color.Transparent
                            },
                            shape = TvShapes.MenuItem
                        )
                        .clickable(interactionSource = interactionSource, indication = null) {
                            onTabSelected(tab)
                        }
                        .padding(horizontal = TvDimens.md, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(TvDimens.md)
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = tab.title,
                        tint = when {
                            isFocused -> TvColors.NetflixRed
                            isSelected -> TvColors.CyberCyan
                            else -> TvColors.TextSecondary
                        },
                        modifier = Modifier.size(18.dp)
                    )

                    Text(
                        text = tab.title,
                        style = if (isFocused || isSelected) TvTypography.MenuItemFocused else TvTypography.MenuItem,
                        color = when {
                            isFocused -> TvColors.TextPrimary
                            isSelected -> TvColors.CyberCyan
                            else -> TvColors.TextSecondary
                        }
                    )
                }
            }
        }

        // RODAPÉ: RELÓGIO DIGITAL & TAILSCALE IP
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(TvColors.CardBackground.copy(alpha = 0.5f), TvShapes.MenuItem)
                .padding(TvDimens.sm),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = "Relógio",
                    tint = TvColors.CyberCyan,
                    modifier = Modifier.size(13.dp)
                )
                Text(
                    text = currentTimeString.ifEmpty { "--:--:--" },
                    style = TvTypography.Clock
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(TvColors.LiveGreen, CircleShape)
                )
                Text(
                    text = "tailscale0: $tailscaleIp",
                    style = TvTypography.Telemetry.copy(fontSize = 9.sp, color = TvColors.TextMuted),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/**
 * 2. ABA 0: VIEWPORT DE CÂMERAS (Hero Spotlight + Carrossel Inferior)
 */
@Composable
fun TvCamerasViewport(
    cameras: List<CameraEntity>,
    selectedCamera: CameraEntity?,
    focusedIndex: Int,
    carouselState: androidx.compose.foundation.lazy.LazyListState,
    carouselFocusRequesters: List<FocusRequester>,
    heroFocusRequester: FocusRequester,
    onFocusCamera: (Int) -> Unit,
    onSelectCamera: (CameraEntity) -> Unit,
    onNavigateLeftToSidebar: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // HERO SPOTLIGHT COM CÂMERA SELECIONADA EM DESTAQUE (16:9)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(TvShapes.CameraCard)
                .background(TvColors.CardBackground)
                .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
        ) {
            selectedCamera?.let { camera ->
                // Imagem de Stream RTSP simulado
                AsyncImage(
                    model = camera.thumbnailUrl,
                    contentDescription = camera.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Overlay Gradiente Cinematográfico
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.5f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.85f)
                                )
                            )
                        )
                )

                // HUD DE TELEMETRIA SUPERIOR ESQUERDO
                Column(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(TvDimens.md)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(TvDimens.sm)
                    ) {
                        Surface(
                            shape = TvShapes.Badge,
                            color = TvColors.NetflixRed
                        ) {
                            Text(
                                text = "CANAL 0\${camera.channel}",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }

                        Text(
                            text = camera.name,
                            style = TvTypography.TabTitle.copy(fontSize = 18.sp)
                        )
                    }

                    Text(
                        text = "\${camera.location} • \${camera.zone}",
                        style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary),
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                // HUD DE TELEMETRIA SUPERIOR DIREITO
                Surface(
                    shape = TvShapes.CameraCard,
                    color = TvColors.OverlayHud,
                    border = BorderStroke(1.dp, TvColors.BorderSubtle),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(TvDimens.md)
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalAlignment = Alignment.End
                    ) {
                        Text(
                            text = "RTSP H.265 • \${camera.telemetry.resolution}",
                            style = TvTypography.Telemetry
                        )
                        Text(
                            text = "LATÊNCIA: \${camera.telemetry.latencyMs}ms | BITRATE: \${camera.telemetry.bitrateKbps} kbps",
                            style = TvTypography.Telemetry.copy(color = TvColors.TextSecondary, fontSize = 10.sp)
                        )
                    }
                }

                // CAIXAS DE DETECÇÃO DE IA (Bounding Boxes)
                camera.activeDetections.forEach { detection ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(
                                start = (detection.normX * 8).dp,
                                top = (detection.normY * 4).dp
                            )
                    ) {
                        Surface(
                            shape = TvShapes.Badge,
                            color = Color(detection.alertColorHex).copy(alpha = 0.2f),
                            border = BorderStroke(2.dp, Color(detection.alertColorHex)),
                            modifier = Modifier
                                .size(width = 140.dp, height = 90.dp)
                        ) {
                            Text(
                                text = "\${detection.label} (\${(detection.confidence * 100).toInt()}%)",
                                color = Color(detection.alertColorHex),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(4.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(TvDimens.md))

        // CARROSSEL HORIZONTAL INFERIOR DE CÂMERAS (TvLazyRow 16:9)
        Text(
            text = "TODAS AS CÂMERAS (\${cameras.size}) — NAVEGUE COM D-PAD ◄ ►",
            style = TvTypography.MenuItemFocused.copy(fontSize = 12.sp, color = TvColors.TextSecondary),
            modifier = Modifier.padding(start = 4.dp, bottom = 6.dp)
        )

        LazyRow(
            state = carouselState,
            horizontalArrangement = Arrangement.spacedBy(TvDimens.md),
            modifier = Modifier
                .fillMaxWidth()
                .height(115.dp)
        ) {
            itemsIndexed(cameras) { index, camera ->
                val interactionSource = remember { MutableInteractionSource() }
                val isFocused by interactionSource.collectIsFocusedAsState()

                Box(
                    modifier = Modifier
                        .width(TvDimens.GridMinCardWidth)
                        .aspectRatio(16f / 9f)
                        .focusRequester(carouselFocusRequesters.getOrElse(index) { FocusRequester() })
                        .onFocusChanged { focusState ->
                            if (focusState.isFocused) {
                                onFocusCamera(index)
                            }
                        }
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown) {
                                when {
                                    keyEvent.key == Key.DirectionLeft && index == 0 -> {
                                        onNavigateLeftToSidebar()
                                        true
                                    }
                                    keyEvent.key == Key.Enter || keyEvent.key == Key.DpadCenter -> {
                                        onSelectCamera(camera)
                                        true
                                    }
                                    else -> false
                                }
                            } else false
                        }
                        .tvDpadFocusable(
                            isFocused = isFocused,
                            focusedBorderColor = TvColors.BorderFocused,
                            unfocusedBorderColor = if (index == focusedIndex) TvColors.BorderHighlight else TvColors.BorderSubtle,
                            shape = TvShapes.CameraCard,
                            scaleAmount = 1.04f
                        )
                        .clip(TvShapes.CameraCard)
                        .background(
                            if (isFocused) TvColors.CardBackgroundElevated else TvColors.CardBackground
                        )
                        .clickable(interactionSource = interactionSource, indication = null) {
                            onFocusCamera(index)
                            onSelectCamera(camera)
                        }
                ) {
                    AsyncImage(
                        model = camera.thumbnailUrl,
                        contentDescription = camera.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    // Overlay de Informações do Card
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                                )
                            )
                            .padding(TvDimens.sm)
                    ) {
                        // Badge de Status
                        Surface(
                            shape = TvShapes.Badge,
                            color = when (camera.status) {
                                CameraStatus.ALERT -> TvColors.AlertCrimson
                                CameraStatus.RECORDING -> TvColors.AlertCrimson.copy(alpha = 0.8f)
                                CameraStatus.ONLINE -> TvColors.LiveGreen.copy(alpha = 0.8f)
                                CameraStatus.STANDBY -> TvColors.StandbyAmber
                            },
                            modifier = Modifier.align(Alignment.TopStart)
                        ) {
                            Text(
                                text = camera.status.name,
                                color = Color.White,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }

                        Column(
                            modifier = Modifier.align(Alignment.BottomStart)
                        ) {
                            Text(
                                text = "CH0\${camera.channel} • \${camera.name}",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "\${camera.telemetry.resolution} • \${camera.telemetry.fps} FPS",
                                style = TvTypography.Telemetry.copy(fontSize = 9.sp, color = TvColors.CyberCyan)
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * 3. JANELA FLUTUANTE PiP DUAL-LAYER COM CONTAGEM REGRESSIVA E MOLDURA CIANO
 */
@Composable
fun TvPipFloatingWindow(
    alert: PipAlert,
    focusRequester: FocusRequester,
    onDismiss: () -> Unit,
    onExpand: () -> Unit,
    modifier: Modifier = Modifier
) {
    var remainingSeconds by remember { mutableIntStateOf(alert.countdownSeconds) }
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    LaunchedEffect(alert.id) {
        remainingSeconds = alert.countdownSeconds
        while (remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
        onDismiss()
    }

    Surface(
        shape = TvShapes.PipWindow,
        color = TvColors.OverlayHud,
        border = BorderStroke(2.dp, if (isFocused) TvColors.BorderFocused else TvColors.BorderHighlight),
        shadowElevation = 16.dp,
        modifier = modifier
            .width(TvDimens.PipWidth)
            .height(TvDimens.PipHeight)
            .focusRequester(focusRequester)
            .tvDpadFocusable(
                isFocused = isFocused,
                focusedBorderColor = TvColors.BorderFocused,
                unfocusedBorderColor = TvColors.BorderHighlight,
                shape = TvShapes.PipWindow,
                scaleAmount = 1.03f
            )
            .clickable(interactionSource = interactionSource, indication = null) {
                onExpand()
            }
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // CABEÇALHO DO ALERTA PIP
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(TvColors.AlertCrimson.copy(alpha = 0.25f))
                    .padding(horizontal = TvDimens.sm, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(TvColors.AlertCrimson, CircleShape)
                    )
                    Text(
                        text = "ALERTA PiP • \${alert.camera.name}",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Surface(
                    shape = TvShapes.StatusPill,
                    color = TvColors.CardBackground
                ) {
                    Text(
                        text = "\${remainingSeconds}s",
                        style = TvTypography.Telemetry.copy(color = TvColors.CyberCyan),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            // SNAPSHOT LIVE DO EVENTO
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                AsyncImage(
                    model = alert.snapshotUrl,
                    contentDescription = "Snapshot Alerta",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f))
                            )
                        )
                        .padding(TvDimens.sm)
                ) {
                    Text(
                        text = alert.eventDescription,
                        color = Color.White,
                        fontSize = 10.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.align(Alignment.BottomStart)
                    )
                }
            }

            // AÇÕES D-PAD NO PiP
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(TvColors.CardBackgroundElevated)
                    .padding(horizontal = TvDimens.sm, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Pressione [OK] para Expandir",
                    style = TvTypography.Telemetry.copy(fontSize = 9.sp, color = TvColors.CyberCyan)
                )
                Text(
                    text = "[VOLTAR] Fechar",
                    style = TvTypography.Telemetry.copy(fontSize = 9.sp, color = TvColors.TextMuted)
                )
            }
        }
    }
}

/**
 * Viewport Genérico para Outras Abas (Capturas, Ferramentas, Logs, Configurações)
 */
@Composable
fun TvPlaceholderViewport(title: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .clip(TvShapes.CameraCard)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(TvDimens.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.Tv,
            contentDescription = null,
            tint = TvColors.NetflixRed,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(TvDimens.md))
        Text(
            text = title,
            style = TvTypography.TabTitle.copy(fontSize = 20.sp)
        )
        Text(
            text = "Módulo otimizado para Android TV / Leanback (D-Pad Focusable)",
            style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary),
            modifier = Modifier.padding(top = TvDimens.sm)
        )
    }
}
`;
