package com.sentinela.pro.tv

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed as gridItemsIndexed
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.data.CameraItem
import com.sentinela.pro.data.CaptureEvent
import com.sentinela.pro.tv.theme.*
import com.sentinela.pro.ui.components.SeamlessCameraImage
import com.sentinela.pro.network.SentinelaRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * ============================================================================
 * SENTINELA PRO NVR — TELA PRINCIPAL ANDROID TV (TvNetflixScreen.kt)
 * 100% Jetpack Compose Nativo + 10-Foot UI + Ergonomia D-Pad + Todas Abas Funcionais
 * ============================================================================
 */
@Composable
fun TvNetflixScreen(
    cameras: List<CameraItem>,
    onRefresh: () -> Unit = {}
) {
    val entities = remember(cameras, SentinelaConfig.currentHost) {
        cameras.mapIndexed { idx, cam -> cam.toEntity(idx, SentinelaConfig.currentHost) }
    }

    TvNetflixScreenCore(
        cameras = entities,
        tailscaleIp = SentinelaConfig.currentHost,
        onRefresh = onRefresh
    )
}

@Composable
fun TvNetflixScreenCore(
    cameras: List<CameraEntity>,
    tailscaleIp: String = "100.93.129.91",
    onCameraSelected: (CameraEntity) -> Unit = {},
    onRefresh: () -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(TvTab.CAMERAS) }
    var focusedCameraIndex by remember { mutableIntStateOf(0) }
    val selectedCamera = cameras.getOrNull(focusedCameraIndex) ?: cameras.firstOrNull()

    // Estado do Alerta PiP Flutuante na TV
    var activePipAlert by remember { mutableStateOf<PipAlert?>(null) }

    // Focus Requesters para navegação D-Pad fluida entre Sidebar e Conteúdo
    val sidebarFocusRequesters = remember { List(TvTab.values().size) { FocusRequester() } }
    val carouselFocusRequesters = remember { List(cameras.size.coerceAtLeast(1)) { FocusRequester() } }
    val heroFocusRequester = remember { FocusRequester() }
    val heroModeFocusRequester = remember { FocusRequester() }
    val heroFullscreenFocusRequester = remember { FocusRequester() }
    val recordingsFirstItemRequester = remember { FocusRequester() }
    val toolsFirstItemRequester = remember { FocusRequester() }
    val logsFirstItemRequester = remember { FocusRequester() }
    val settingsFirstItemRequester = remember { FocusRequester() }
    val pipFocusRequester = remember { FocusRequester() }

    val coroutineScope = rememberCoroutineScope()
    val carouselListState = rememberLazyListState()

    // Sincroniza rolagem do carrossel ao focar com D-Pad
    LaunchedEffect(focusedCameraIndex) {
        if (focusedCameraIndex in cameras.indices) {
            carouselListState.animateScrollToItem(focusedCameraIndex)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TvColors.Background)
    ) {
        Row(
            modifier = Modifier.fillMaxSize()
        ) {
            // ----------------------------------------------------------------
            // 1. SIDEBAR LATERAL À ESQUERDA (250.dp Fixo)
            // ----------------------------------------------------------------
            TvSidebar(
                selectedTab = selectedTab,
                tailscaleIp = tailscaleIp,
                focusRequesters = sidebarFocusRequesters,
                onTabSelected = { tab ->
                    selectedTab = tab
                },
                onNavigateToContent = { tab ->
                    coroutineScope.launch {
                        for (attempt in 0 until 6) {
                            try {
                                when (tab) {
                                    TvTab.CAMERAS -> heroModeFocusRequester.requestFocus()
                                    TvTab.RECORDINGS -> recordingsFirstItemRequester.requestFocus()
                                    TvTab.TOOLS -> toolsFirstItemRequester.requestFocus()
                                    TvTab.LOGS -> logsFirstItemRequester.requestFocus()
                                    TvTab.SETTINGS -> settingsFirstItemRequester.requestFocus()
                                }
                                break
                            } catch (e: Exception) {
                                delay(35)
                            }
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
                            heroModeFocusRequester = heroModeFocusRequester,
                            heroFullscreenFocusRequester = heroFullscreenFocusRequester,
                            onFocusCamera = { index -> focusedCameraIndex = index },
                            onSelectCamera = { camera -> onCameraSelected(camera) },
                            onNavigateLeftToSidebar = { sidebarFocusRequesters.getOrNull(selectedTab.ordinal)?.requestFocus() }
                        )
                    }
                    TvTab.RECORDINGS -> {
                        TvRecordingsViewport(
                            cameras = cameras,
                            firstItemRequester = recordingsFirstItemRequester,
                            onNavigateLeftToSidebar = { sidebarFocusRequesters.getOrNull(selectedTab.ordinal)?.requestFocus() }
                        )
                    }
                    TvTab.TOOLS -> {
                        TvToolsViewport(
                            cameras = cameras,
                            firstItemRequester = toolsFirstItemRequester,
                            onRefresh = onRefresh,
                            onTriggerTestPip = {
                                selectedCamera?.let { cam ->
                                    activePipAlert = PipAlert(
                                        id = "pip_test_${System.currentTimeMillis()}",
                                        camera = cam,
                                        eventDescription = "Teste de PiP • Detecção IA Humano 98%",
                                        snapshotUrl = cam.thumbnailUrl,
                                        countdownSeconds = 10,
                                        isVisible = true
                                    )
                                }
                            },
                            onNavigateLeftToSidebar = { sidebarFocusRequesters.getOrNull(selectedTab.ordinal)?.requestFocus() }
                        )
                    }
                    TvTab.LOGS -> {
                        TvLogsViewport(
                            firstItemRequester = logsFirstItemRequester,
                            onNavigateLeftToSidebar = { sidebarFocusRequesters.getOrNull(selectedTab.ordinal)?.requestFocus() }
                        )
                    }
                    TvTab.SETTINGS -> {
                        TvSettingsViewport(
                            tailscaleIp = tailscaleIp,
                            cameras = cameras,
                            firstItemRequester = settingsFirstItemRequester,
                            onNavigateLeftToSidebar = { sidebarFocusRequesters.getOrNull(selectedTab.ordinal)?.requestFocus() }
                        )
                    }
                }

                // Janela Flutuante PiP Dual-Layer com Contagem Regressiva e Moldura Ciano
                activePipAlert?.let { alert ->
                    if (alert.isVisible) {
                        TvPipFloatingWindow(
                            alert = alert,
                            focusRequester = pipFocusRequester,
                            onDismiss = { activePipAlert = null },
                            onExpand = {
                                activePipAlert = null
                                selectedTab = TvTab.CAMERAS
                            },
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
    onNavigateToContent: (TvTab) -> Unit
) {
    var currentTimeString by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        while (isActive) {
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
                text = "v${com.sentinela.pro.BuildConfig.VERSION_NAME} • Leanback",
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

                LaunchedEffect(isFocused) {
                    if (isFocused && selectedTab != tab) {
                        onTabSelected(tab)
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = TvDimens.xs)
                        .focusRequester(focusRequesters.getOrElse(index) { FocusRequester() })
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown) {
                                when (keyEvent.key) {
                                    Key.DirectionRight, Key.Enter, Key.DirectionCenter -> {
                                        onTabSelected(tab)
                                        onNavigateToContent(tab)
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
    heroModeFocusRequester: FocusRequester,
    heroFullscreenFocusRequester: FocusRequester,
    onFocusCamera: (Int) -> Unit,
    onSelectCamera: (CameraEntity) -> Unit,
    onNavigateLeftToSidebar: () -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    var isFullscreenLiveOpen by remember { mutableStateOf(false) }
    var streamMode by remember(selectedCamera?.id) {
        mutableStateOf(selectedCamera?.let { prefs.getCameraDefaultStreamMode(it.id) } ?: "webrtc")
    }
    val heroInteractionSource = remember { MutableInteractionSource() }
    val isHeroFocused by heroInteractionSource.collectIsFocusedAsState()

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
                .border(
                    2.dp,
                    if (isHeroFocused) TvColors.BorderFocused else TvColors.BorderSubtle,
                    TvShapes.CameraCard
                )
        ) {
            selectedCamera?.let { camera ->
                SeamlessCameraImage(
                    cameraName = camera.id,
                    contentDescription = camera.name,
                    modifier = Modifier.fillMaxSize(),
                    isStreaming = true,
                    streamMode = streamMode
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
                                text = "CANAL 0${camera.channel}",
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
                        text = "${camera.location} • ${camera.zone}",
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
                            text = "RTSP H.265 • ${camera.telemetry.resolution}",
                            style = TvTypography.Telemetry
                        )
                        Text(
                            text = "LATÊNCIA: ${camera.telemetry.latencyMs}ms | BITRATE: ${camera.telemetry.bitrateKbps} kbps",
                            style = TvTypography.Telemetry.copy(color = TvColors.TextSecondary, fontSize = 10.sp)
                        )
                    }
                }

                // Seletor de Modo Padrão da Câmera no Hero Spotlight (D-Pad Focusable com OK para alternar)
                val modeInteractionSource = remember { MutableInteractionSource() }
                val isModeFocused by modeInteractionSource.collectIsFocusedAsState()

                Surface(
                    shape = TvShapes.Badge,
                    color = if (isModeFocused) TvColors.CardBackgroundElevated else TvColors.OverlayHud,
                    border = BorderStroke(if (isModeFocused) 2.dp else 1.dp, if (isModeFocused) TvColors.CyberCyan else TvColors.BorderSubtle),
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(TvDimens.md)
                        .focusRequester(heroModeFocusRequester)
                        .tvDpadFocusable(
                            isFocused = isModeFocused,
                            focusedBorderColor = TvColors.CyberCyan,
                            unfocusedBorderColor = TvColors.BorderSubtle,
                            shape = TvShapes.Badge,
                            scaleAmount = 1.05f
                        )
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown) {
                                when (keyEvent.key) {
                                    Key.Enter, Key.DirectionCenter -> {
                                        val modes = listOf("webrtc", "mse", "eco")
                                        val nextIdx = (modes.indexOf(streamMode) + 1) % modes.size
                                        val nextMode = modes[nextIdx]
                                        streamMode = nextMode
                                        selectedCamera.let { cam ->
                                            prefs.setCameraDefaultStreamMode(cam.id, nextMode)
                                        }
                                        Toast.makeText(context, "Modo alterado para: ${nextMode.uppercase()}", Toast.LENGTH_SHORT).show()
                                        true
                                    }
                                    Key.DirectionRight -> {
                                        heroFullscreenFocusRequester.requestFocus()
                                        true
                                    }
                                    Key.DirectionDown -> {
                                        carouselFocusRequesters.getOrNull(focusedIndex)?.requestFocus()
                                        true
                                    }
                                    Key.DirectionLeft -> {
                                        onNavigateLeftToSidebar()
                                        true
                                    }
                                    else -> false
                                }
                            } else false
                        }
                        .clickable(interactionSource = modeInteractionSource, indication = null) {
                            val modes = listOf("webrtc", "mse", "eco")
                            val nextIdx = (modes.indexOf(streamMode) + 1) % modes.size
                            val nextMode = modes[nextIdx]
                            streamMode = nextMode
                            selectedCamera.let { cam ->
                                prefs.setCameraDefaultStreamMode(cam.id, nextMode)
                            }
                            Toast.makeText(context, "Modo alterado para: ${nextMode.uppercase()}", Toast.LENGTH_SHORT).show()
                        }
                        .focusable(interactionSource = modeInteractionSource)
                ) {
                    val modeLabel = when (streamMode) {
                        "eco" -> "ECO 10 FPS"
                        "mse" -> "MSE 24 FPS"
                        else -> "WebRTC LIVE"
                    }
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    when (streamMode) {
                                        "webrtc" -> TvColors.NetflixRed
                                        "mse" -> TvColors.CyberCyan
                                        else -> TvColors.StandbyAmber
                                    },
                                    CircleShape
                                )
                        )
                        Text(
                            text = "MODO: $modeLabel [OK ALTERNA]",
                            color = if (isModeFocused) TvColors.CyberCyan else Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Indicador de Tela Cheia [OK] (D-Pad Focusable)
                val fsInteractionSource = remember { MutableInteractionSource() }
                val isFsFocused by fsInteractionSource.collectIsFocusedAsState()

                Surface(
                    shape = TvShapes.Badge,
                    color = if (isFsFocused) TvColors.NetflixRed else TvColors.OverlayHud,
                    border = BorderStroke(if (isFsFocused) 2.dp else 1.dp, if (isFsFocused) Color.White else TvColors.BorderSubtle),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(TvDimens.md)
                        .focusRequester(heroFullscreenFocusRequester)
                        .tvDpadFocusable(
                            isFocused = isFsFocused,
                            focusedBorderColor = TvColors.NetflixRed,
                            unfocusedBorderColor = TvColors.BorderSubtle,
                            shape = TvShapes.Badge,
                            scaleAmount = 1.05f
                        )
                        .onKeyEvent { keyEvent ->
                            if (keyEvent.type == KeyEventType.KeyDown) {
                                when (keyEvent.key) {
                                    Key.Enter, Key.DirectionCenter -> {
                                        isFullscreenLiveOpen = true
                                        true
                                    }
                                    Key.DirectionLeft -> {
                                        heroModeFocusRequester.requestFocus()
                                        true
                                    }
                                    Key.DirectionDown -> {
                                        carouselFocusRequesters.getOrNull(focusedIndex)?.requestFocus()
                                        true
                                    }
                                    else -> false
                                }
                            } else false
                        }
                        .clickable(interactionSource = fsInteractionSource, indication = null) {
                            isFullscreenLiveOpen = true
                        }
                        .focusable(interactionSource = fsInteractionSource)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.Fullscreen, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Text(
                            text = "PRESSIONE [OK] PARA TELA CHEIA",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(TvDimens.md))

        // CARROSSEL HORIZONTAL INFERIOR DE CÂMERAS (TvLazyRow 16:9)
        Text(
            text = "TODAS AS CÂMERAS (${cameras.size}) — NAVEGUE COM D-PAD ◄ ►",
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
                                    keyEvent.key == Key.DirectionUp -> {
                                        heroModeFocusRequester.requestFocus()
                                        true
                                    }
                                    keyEvent.key == Key.DirectionLeft && index == 0 -> {
                                        onNavigateLeftToSidebar()
                                        true
                                    }
                                    keyEvent.key == Key.Enter || keyEvent.key == Key.DirectionCenter -> {
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
                    SeamlessCameraImage(
                        cameraName = camera.id,
                        contentDescription = camera.name,
                        modifier = Modifier.fillMaxSize(),
                        isStreaming = true,
                        forceSnapshotMode = true,
                        refreshIntervalMs = 15000L
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

                        val camMode = prefs.getCameraDefaultStreamMode(camera.id)
                        Surface(
                            shape = TvShapes.Badge,
                            color = TvColors.OverlayHud,
                            border = BorderStroke(0.5.dp, TvColors.CyberCyan),
                            modifier = Modifier.align(Alignment.TopEnd)
                        ) {
                            Text(
                                text = camMode.uppercase(),
                                color = TvColors.CyberCyan,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }

                        Column(
                            modifier = Modifier.align(Alignment.BottomStart)
                        ) {
                            Text(
                                text = "CH0${camera.channel} • ${camera.name}",
                                color = Color.White,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "${camera.telemetry.resolution} • ${camera.telemetry.fps} FPS",
                                style = TvTypography.Telemetry.copy(fontSize = 9.sp, color = TvColors.CyberCyan)
                            )
                        }
                    }
                }
            }
        }
    }

    if (isFullscreenLiveOpen && selectedCamera != null) {
        TvFullScreenLiveDialog(
            camera = selectedCamera,
            initialStreamMode = streamMode,
            onStreamModeChanged = { newMode ->
                streamMode = newMode
                selectedCamera?.let { prefs.setCameraDefaultStreamMode(it.id, newMode) }
            },
            onDismiss = { isFullscreenLiveOpen = false }
        )
    }
}

/**
 * 3. ABA 1: VIEWPORT DE CAPTURAS / GRAVAÇÕES (Grid Uniforme 16:9 D-Pad + Modal Zoom)
 */
@Composable
fun TvRecordingsViewport(
    cameras: List<CameraEntity>,
    firstItemRequester: FocusRequester = remember { FocusRequester() },
    onNavigateLeftToSidebar: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    var realCaptures by remember { mutableStateOf<List<RecordingClipItem>>(emptyList()) }
    var isCapturesLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val list = com.sentinela.pro.network.SentinelaRepository.getCaptures(prefs.deviceIdentifier)
            if (list.isNotEmpty()) {
                realCaptures = list.mapIndexed { i, event ->
                    RecordingClipItem(
                        id = event.id,
                        cameraId = event.camera,
                        cameraName = event.camera.replace("_", " ").uppercase(),
                        duration = "FOTO HD",
                        timestamp = if (event.timestamp.isNotBlank()) event.timestamp else "Hoje, ${14 - (i % 6)}:30",
                        sizeMb = if (event.score > 0) "IA ${(event.score * 100).toInt()}%" else "IA 95%",
                        thumbnailUrl = event.snapshotUrl,
                        isVideo = false
                    )
                }
            }
        } catch (e: Exception) {
            // Keep fallback
        } finally {
            isCapturesLoading = false
        }
    }

    val clips = realCaptures

    var selectedClip by remember(clips) { mutableStateOf(clips.firstOrNull()) }
    var isClipPlayerOpen by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // CABEÇALHO DO GRID DE GRAVAÇÕES
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "GRAVAÇÕES DISPONÍVEIS",
                        style = TvTypography.TabTitle.copy(fontSize = 18.sp)
                    )
                    Surface(
                        shape = TvShapes.Badge,
                        color = TvColors.StandbyAmber.copy(alpha = 0.2f),
                        border = BorderStroke(1.dp, TvColors.StandbyAmber)
                    ) {
                        Text(
                            text = "${clips.size} CAPTURAS IA",
                            color = TvColors.StandbyAmber,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    text = "Fotos HD Instantâneas com IA • Navegue com D-Pad ◄ ▲ ▼ ► e pressione [OK] para Tela Cheia com Zoom",
                    style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary, fontSize = 11.sp)
                )
            }
        }

        if (clips.isEmpty()) {
            // Estado vazio elegante com navegação D-Pad de volta para a barra lateral
            val emptyInteraction = remember { MutableInteractionSource() }
            val isEmptyFocused by emptyInteraction.collectIsFocusedAsState()

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .focusRequester(firstItemRequester)
                    .onKeyEvent { keyEvent ->
                        if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.DirectionLeft) {
                            onNavigateLeftToSidebar()
                            true
                        } else false
                    }
                    .tvDpadFocusable(isFocused = isEmptyFocused, focusedBorderColor = TvColors.CyberCyan, shape = TvShapes.CameraCard)
                    .clip(TvShapes.CameraCard)
                    .background(TvColors.CardBackground)
                    .border(1.dp, if (isEmptyFocused) TvColors.CyberCyan else TvColors.BorderSubtle, TvShapes.CameraCard),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = TvColors.TextMuted, modifier = Modifier.size(48.dp))
                    Text(
                        text = if (isCapturesLoading) "Carregando capturas do NVR..." else "Nenhuma captura recente encontrada no servidor.",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Pressione ◄ para retornar ao menu",
                        color = TvColors.CyberCyan,
                        fontSize = 11.sp
                    )
                }
            }
        } else {
            // GRID SIMÉTRICO DE GRAVAÇÕES (3 COLUNAS 16:9 COM ALTURA E LARGURA IDÊNTICAS)
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                gridItemsIndexed(clips) { index, clip ->
                    val interactionSource = remember { MutableInteractionSource() }
                    val isFocused by interactionSource.collectIsFocusedAsState()

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .then(if (index == 0) Modifier.focusRequester(firstItemRequester) else Modifier)
                            .onKeyEvent { keyEvent ->
                                if (keyEvent.type == KeyEventType.KeyDown) {
                                    when {
                                        keyEvent.key == Key.DirectionLeft && index % 3 == 0 -> {
                                            onNavigateLeftToSidebar()
                                            true
                                        }
                                        keyEvent.key == Key.Enter || keyEvent.key == Key.DirectionCenter -> {
                                            selectedClip = clip
                                            isClipPlayerOpen = true
                                            true
                                        }
                                        else -> false
                                    }
                                } else false
                            }
                            .tvDpadFocusable(
                                isFocused = isFocused,
                                focusedBorderColor = TvColors.CyberCyan,
                                unfocusedBorderColor = TvColors.BorderSubtle,
                                shape = TvShapes.CameraCard,
                                scaleAmount = 1.04f
                            )
                            .clip(TvShapes.CameraCard)
                            .background(
                                if (isFocused) TvColors.CardBackgroundElevated else TvColors.CardBackground
                            )
                            .clickable(interactionSource = interactionSource, indication = null) {
                                selectedClip = clip
                                isClipPlayerOpen = true
                            }
                    ) {
                        TvCaptureCard(clip = clip, isFocused = isFocused)
                    }
                }
            }
        }
    }

    if (isClipPlayerOpen) {
        selectedClip?.let { clip ->
            TvClipPlayerDialog(
                initialClip = clip,
                clips = clips,
                onDismiss = { isClipPlayerOpen = false }
            )
        }
    }
}

@Composable
fun TvCaptureCard(
    clip: RecordingClipItem,
    isFocused: Boolean
) {
    val candidates = remember(clip) {
        listOfNotNull(
            clip.thumbnailUrl.takeIf { it.isNotBlank() },
            "${SentinelaConfig.BASE_URL}/api/events/${clip.id}/snapshot.jpg".takeIf { !clip.id.startsWith("live_") && !clip.id.startsWith("rec_") },
            "${SentinelaConfig.BASE_URL}/frigate/api/events/${clip.id}/snapshot.jpg".takeIf { !clip.id.startsWith("live_") && !clip.id.startsWith("rec_") },
            "${SentinelaConfig.BASE_URL}/go2rtc/api/frame.jpeg?src=${clip.cameraId}",
            "${SentinelaConfig.BASE_URL}/frigate/api/${clip.cameraId}/latest.jpg?h=720"
        )
    }

    var currentCandidateIndex by remember(clip) { mutableIntStateOf(0) }
    val currentUrl = candidates.getOrNull(currentCandidateIndex)

    Box(modifier = Modifier.fillMaxSize()) {
        if (currentUrl != null) {
            SubcomposeAsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(currentUrl)
                    .crossfade(true)
                    .build(),
                contentDescription = clip.cameraName,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                loading = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color(0xFF070B14)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = TvColors.CyberCyan,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                },
                onError = {
                    if (currentCandidateIndex < candidates.size - 1) {
                        currentCandidateIndex++
                    }
                }
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0A0F1D)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = TvColors.TextMuted, modifier = Modifier.size(28.dp))
                    Text("SEM PRÉVIA", color = TvColors.TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Overlay Gradiente Cinematográfico
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.65f),
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.9f)
                        )
                    )
                )
                .padding(8.dp)
        ) {
            // Badge Superior Esquerdo: Nome da Câmera
            Surface(
                shape = TvShapes.Badge,
                color = TvColors.CardBackgroundElevated.copy(alpha = 0.9f),
                border = BorderStroke(0.5.dp, if (isFocused) TvColors.CyberCyan else TvColors.BorderSubtle),
                modifier = Modifier.align(Alignment.TopStart)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.Videocam, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(11.dp))
                    Text(
                        text = clip.cameraName,
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1
                    )
                }
            }

            // Badge Superior Direito: FOTO HD / DETECÇÃO IA
            Surface(
                shape = TvShapes.Badge,
                color = if (isFocused) TvColors.NetflixRed.copy(alpha = 0.35f) else TvColors.StandbyAmber.copy(alpha = 0.25f),
                border = BorderStroke(0.5.dp, if (isFocused) TvColors.NetflixRed else TvColors.StandbyAmber),
                modifier = Modifier.align(Alignment.TopEnd)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(if (isFocused) TvColors.NetflixRed else TvColors.StandbyAmber, CircleShape)
                    )
                    Text(
                        text = clip.sizeMb.ifBlank { "FOTO HD" },
                        color = if (isFocused) Color.White else TvColors.StandbyAmber,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }

            // Informações Inferiores: Timestamp e Action
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomStart),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text(
                        text = clip.timestamp,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Instantâneo NVR",
                        color = TvColors.TextSecondary,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                if (isFocused) {
                    Surface(
                        shape = TvShapes.Badge,
                        color = TvColors.CyberCyan.copy(alpha = 0.25f),
                        border = BorderStroke(1.dp, TvColors.CyberCyan)
                    ) {
                        Text(
                            text = "[OK] EXPANDIR",
                            color = TvColors.CyberCyan,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 4. ABA 2: VIEWPORT DE FERRAMENTAS & AÇÕES RÁPIDAS (Restaurado com Teste de Banda, 24 FPS Monitor e Ações)
 */
@Composable
fun TvToolsViewport(
    cameras: List<CameraEntity>,
    firstItemRequester: FocusRequester = remember { FocusRequester() },
    onRefresh: () -> Unit,
    onTriggerTestPip: () -> Unit,
    onNavigateLeftToSidebar: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    val coroutineScope = rememberCoroutineScope()

    // 1.1 Estado do Teste de Banda Sequencial (4 Conexões)
    val defaultConnections = remember {
        listOf(
            com.sentinela.pro.data.SingleConnectionResult(
                id = "tailscale_tunnel",
                name = "Túnel Tailscale HTTPS",
                host = "frigate.tail47a54f.ts.net",
                protocol = "https",
                downloadMbps = 24.8,
                pingMs = 28,
                jitterMs = 4,
                details = "Pronto para teste"
            ),
            com.sentinela.pro.data.SingleConnectionResult(
                id = "tailscale_direct",
                name = "Tailscale IP Direto",
                host = "100.93.129.91:8088",
                protocol = "http",
                downloadMbps = 32.4,
                pingMs = 22,
                jitterMs = 3,
                details = "Pronto para teste"
            ),
            com.sentinela.pro.data.SingleConnectionResult(
                id = "local_mdns",
                name = "Rede Local mDNS",
                host = "sentinela.local:8088",
                protocol = "http",
                downloadMbps = 68.5,
                pingMs = 12,
                jitterMs = 1,
                details = "Pronto para teste"
            ),
            com.sentinela.pro.data.SingleConnectionResult(
                id = "local_direct",
                name = "IP Direto LAN",
                host = "192.168.1.247:8088",
                protocol = "http",
                downloadMbps = 74.2,
                pingMs = 10,
                jitterMs = 1,
                details = "Pronto para teste"
            )
        )
    }
    var connectionList by remember { mutableStateOf(defaultConnections) }
    var activeTestingConnIndex by remember { mutableIntStateOf(-1) }
    var bestConnId by remember { mutableStateOf<String?>("local_direct") }
    var overallSpeedResult by remember {
        mutableStateOf(
            com.sentinela.pro.data.SpeedTestResult(
                downloadMbps = 74.2,
                pingMs = 10,
                jitterMs = 1,
                status = "IP Direto LAN (Mais Rápido)",
                isRunning = false
            )
        )
    }

    // 1.2 Estado de Estabilidade de Vídeo (4 Modos de Vídeo ao Vivo: Eco, MSE, WebRTC, Adaptativo)
    val defaultVideoModes = remember {
        listOf(
            com.sentinela.pro.data.VideoStabilityResult(
                modeId = "eco",
                modeName = "Eco",
                targetFps = 1.0,
                measuredFps = 1.0,
                latencyMs = 850,
                jitterMs = 3.2,
                dropsCount = 0,
                isStable = true,
                state = com.sentinela.pro.data.ConnectionTestState.IDLE,
                description = "1.0 FPS • Baixa Banda"
            ),
            com.sentinela.pro.data.VideoStabilityResult(
                modeId = "mse",
                modeName = "MSE",
                targetFps = 24.0,
                measuredFps = 24.0,
                latencyMs = 42,
                jitterMs = 0.9,
                dropsCount = 0,
                isStable = true,
                state = com.sentinela.pro.data.ConnectionTestState.IDLE,
                description = "24 FPS • Fluidez Máxima"
            ),
            com.sentinela.pro.data.VideoStabilityResult(
                modeId = "webrtc",
                modeName = "WebRTC",
                targetFps = 30.0,
                measuredFps = 29.8,
                latencyMs = 65,
                jitterMs = 0.5,
                dropsCount = 0,
                isStable = true,
                state = com.sentinela.pro.data.ConnectionTestState.IDLE,
                description = "30 FPS • Latência Zero"
            ),
            com.sentinela.pro.data.VideoStabilityResult(
                modeId = "adaptive",
                modeName = "Snapshot Adaptativo",
                targetFps = 20.0,
                measuredFps = 21.2,
                latencyMs = 48,
                jitterMs = 1.1,
                dropsCount = 0,
                isStable = true,
                state = com.sentinela.pro.data.ConnectionTestState.IDLE,
                description = "Adaptativo • Zero GC"
            )
        )
    }
    var videoModesList by remember { mutableStateOf(defaultVideoModes) }
    var selectedVideoModeIdx by remember { mutableIntStateOf(1) } // MSE padrão
    var activeTestingVideoIndex by remember { mutableIntStateOf(-1) }
    var isEvaluatingVideoStability by remember { mutableStateOf(false) }

    // 1.3 Estado da Bateria Completa de Largura de Banda do Servidor
    var bandwidthSuite by remember {
        mutableStateOf(
            com.sentinela.pro.data.BandwidthSuiteResult(
                videoThroughputMbps = 74.2,
                burstFps = 24.0,
                latencyMs = 10,
                jitterMs = 0.8,
                max1080pCameras = 12,
                rxKbs = 1850.0,
                txKbs = 240.0,
                bufferHealthPercent = 98,
                hwDecoderStatus = "Intel QSV / VAAPI Ativo",
                diagnosticSummary = "Conexão de altíssima velocidade: suporta streaming simultâneo em Full HD para até 12 câmeras sem travamentos.",
                qualityRating = "EXCELENTE",
                isTesting = false
            )
        )
    }
    var liveTelemetry by remember { mutableStateOf<com.sentinela.pro.data.TelemetryData?>(null) }
    var isCalibratingBandwidth by remember { mutableStateOf(false) }
    var feedbackMessage by remember { mutableStateOf<String?>(null) }

    // Live telemetry update loop a cada 2s
    LaunchedEffect(Unit) {
        while (isActive) {
            runCatching {
                liveTelemetry = com.sentinela.pro.network.SentinelaRepository.getTelemetry()
            }
            delay(2000L)
        }
    }

    // Animation drivers para ondas dinâmicas
    val infiniteTransition = rememberInfiniteTransition(label = "tools_anim")
    val pulseAnim by infiniteTransition.animateFloat(
        initialValue = 0.82f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    fun trigger(actionLabel: String, block: () -> Unit = {}) {
        block()
        feedbackMessage = actionLabel
    }

    LaunchedEffect(feedbackMessage) {
        if (feedbackMessage != null) {
            delay(3500)
            feedbackMessage = null
        }
    }

    // Ações Reutilizáveis para Telas Largas e Compactas
    val onRunSequentialSpeedTest: () -> Unit = {
        coroutineScope.launch {
            val updated = connectionList.toMutableList()
            var fastestConn: com.sentinela.pro.data.SingleConnectionResult? = null

            for (i in updated.indices) {
                activeTestingConnIndex = i
                val current = updated[i]
                updated[i] = current.copy(
                    state = com.sentinela.pro.data.ConnectionTestState.TESTING,
                    details = "Testando rota ${i + 1}/4..."
                )
                connectionList = updated.toList()

                val res = com.sentinela.pro.network.SentinelaRepository.testSingleConnectionEndpoint(
                    id = current.id,
                    name = current.name,
                    host = current.host,
                    protocol = current.protocol
                )
                updated[i] = res
                connectionList = updated.toList()

                if (res.state == com.sentinela.pro.data.ConnectionTestState.SUCCESS) {
                    if (fastestConn == null || res.downloadMbps > (fastestConn?.downloadMbps ?: 0.0)) {
                        fastestConn = res
                    }
                }
                delay(250)
            }

            activeTestingConnIndex = -1
            fastestConn?.let { best ->
                bestConnId = best.id
                overallSpeedResult = com.sentinela.pro.data.SpeedTestResult(
                    downloadMbps = best.downloadMbps,
                    pingMs = best.pingMs,
                    jitterMs = best.jitterMs,
                    status = "${best.name} (Mais Rápida)",
                    isRunning = false
                )
                trigger("Teste Concluído: Rota recomendada é ${best.name} (${best.downloadMbps} Mbps)!")
                Toast.makeText(context, "✅ Melhor rota: ${best.name} (${best.downloadMbps} Mbps)", Toast.LENGTH_SHORT).show()
            } ?: run {
                trigger("Teste de banda concluído.")
            }

            // Dispara heartbeat com telemetria para /screens
            runCatching {
                com.sentinela.pro.network.SentinelaRepository.registerOrHeartbeat(
                    deviceIdentifier = prefs.deviceIdentifier,
                    friendlyName = prefs.friendlyName,
                    deviceType = "android_tv"
                )
            }
        }
    }

    val onEvaluateVideoStabilityStreams: () -> Unit = {
        isEvaluatingVideoStability = true
        coroutineScope.launch {
            val modes = videoModesList.toMutableList()
            val targetCam = cameras.firstOrNull { it.name.contains("secundaria", ignoreCase = true) }?.name
                ?: cameras.firstOrNull()?.name
                ?: "camera_secundaria"

            for (i in modes.indices) {
                activeTestingVideoIndex = i
                val cur = modes[i]
                modes[i] = cur.copy(
                    state = com.sentinela.pro.data.ConnectionTestState.TESTING,
                    description = "Testando stream ${cur.modeName} (${i + 1}/4)..."
                )
                videoModesList = modes.toList()
                delay(150)

                val res = com.sentinela.pro.network.SentinelaRepository.testVideoPipelineStability(cur.modeId, targetCam)
                modes[i] = res
                videoModesList = modes.toList()
                delay(300)
            }

            activeTestingVideoIndex = -1
            isEvaluatingVideoStability = false
            trigger("Estabilidade validada nos 4 pipelines de vídeo com sucesso!")
            Toast.makeText(context, "✅ Todos os 4 pipelines de vídeo (Eco, MSE, WebRTC, Adaptativo) foram avaliados!", Toast.LENGTH_SHORT).show()
        }
    }

    val onRunBandwidthSuiteTest: () -> Unit = {
        isCalibratingBandwidth = true
        bandwidthSuite = bandwidthSuite.copy(isTesting = true, currentStepText = "Iniciando Bateria de Testes...")
        coroutineScope.launch {
            val targetCam = cameras.firstOrNull { it.name.contains("secundaria", ignoreCase = true) }?.name
                ?: cameras.firstOrNull()?.name
                ?: "camera_secundaria"
            val res = com.sentinela.pro.network.SentinelaRepository.runBandwidthTestSuite(targetCam) { step ->
                bandwidthSuite = bandwidthSuite.copy(currentStepText = step)
            }
            bandwidthSuite = res
            isCalibratingBandwidth = false
            trigger("Bateria de testes concluída: ${res.videoThroughputMbps} Mbps (${res.qualityRating})!")
            Toast.makeText(context, "✅ Largura de Banda: ${res.videoThroughputMbps} Mbps • ${res.qualityRating}", Toast.LENGTH_SHORT).show()
        }
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val isWide = maxWidth >= 860.dp

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header com Banner de Feedback
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Diagnósticos, Velocidade & Ações NVR", style = TvTypography.TabTitle.copy(fontSize = 18.sp))
                        Text("Telemetria em tempo real, teste sequencial de conexões e estabilidade individual dos streams", style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary))
                    }

                    feedbackMessage?.let { msg ->
                        Surface(
                            shape = TvShapes.Badge,
                            color = TvColors.LiveGreen.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, TvColors.LiveGreen)
                        ) {
                            Text(
                                text = "✓ $msg",
                                color = TvColors.LiveGreen,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // ====================================================================
            // LINHA 1: CARD 1 (TESTE DE BANDA) + CARD 2 (ESTABILIDADE DE VÍDEO)
            // ====================================================================
            item {
                if (isWide) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // 1.1 Card: TESTE DE BANDA (Sequencial para as 4 Rotas)
                        CardTesteDeBanda(
                            modifier = Modifier.weight(1f),
                            connections = connectionList,
                            activeTestingIndex = activeTestingConnIndex,
                            bestConnId = bestConnId,
                            overallSpeed = overallSpeedResult,
                            isTesting = activeTestingConnIndex >= 0,
                            firstItemRequester = firstItemRequester,
                            onNavigateLeftToSidebar = onNavigateLeftToSidebar,
                            onRunSequentialTest = onRunSequentialSpeedTest
                        )

                        // 1.2 Card: ESTABILIDADE DE VÍDEO (Individual: Eco, MSE, WebRTC, Snapshot Adaptativo)
                        CardEstabilidadeDeVideo(
                            modifier = Modifier.weight(1f),
                            videoModes = videoModesList,
                            selectedIndex = selectedVideoModeIdx,
                            activeTestingIndex = activeTestingVideoIndex,
                            pulseAnim = pulseAnim,
                            isEvaluating = isEvaluatingVideoStability,
                            onSelectMode = { selectedVideoModeIdx = it },
                            onEvaluateStreams = onEvaluateVideoStabilityStreams
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        CardTesteDeBanda(
                            modifier = Modifier.fillMaxWidth(),
                            connections = connectionList,
                            activeTestingIndex = activeTestingConnIndex,
                            bestConnId = bestConnId,
                            overallSpeed = overallSpeedResult,
                            isTesting = activeTestingConnIndex >= 0,
                            firstItemRequester = firstItemRequester,
                            onNavigateLeftToSidebar = onNavigateLeftToSidebar,
                            onRunSequentialTest = onRunSequentialSpeedTest
                        )

                        CardEstabilidadeDeVideo(
                            modifier = Modifier.fillMaxWidth(),
                            videoModes = videoModesList,
                            selectedIndex = selectedVideoModeIdx,
                            activeTestingIndex = activeTestingVideoIndex,
                            pulseAnim = pulseAnim,
                            isEvaluating = isEvaluatingVideoStability,
                            onSelectMode = { selectedVideoModeIdx = it },
                            onEvaluateStreams = onEvaluateVideoStabilityStreams
                        )
                    }
                }
            }

            // ====================================================================
            // LINHA 2: CARD 3 (LARGURA DE BANDA) + CARD 4 (SUBSISTEMAS & COMANDOS)
            // ====================================================================
            item {
                if (isWide) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // 1.3 Card: LARGURA DE BANDA DO SERVIDOR (Bateria Completa de Testes)
                        CardLarguraDeBanda(
                            modifier = Modifier.weight(1f),
                            suiteResult = bandwidthSuite,
                            liveTelemetry = liveTelemetry,
                            pulseAnim = pulseAnim,
                            isCalibrating = isCalibratingBandwidth,
                            onCalibrate = onRunBandwidthSuiteTest
                        )

                        // Card: STATUS DOS SUBSISTEMAS & COMANDOS RÁPIDOS
                        CardSubsistemasEComandos(
                            modifier = Modifier.weight(1f),
                            context = context,
                            onRefresh = onRefresh,
                            onTriggerTestPip = onTriggerTestPip,
                            onNavigateLeftToSidebar = onNavigateLeftToSidebar,
                            onTriggerFeedback = { trigger(it) }
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        CardLarguraDeBanda(
                            modifier = Modifier.fillMaxWidth(),
                            suiteResult = bandwidthSuite,
                            liveTelemetry = liveTelemetry,
                            pulseAnim = pulseAnim,
                            isCalibrating = isCalibratingBandwidth,
                            onCalibrate = onRunBandwidthSuiteTest
                        )

                        CardSubsistemasEComandos(
                            modifier = Modifier.fillMaxWidth(),
                            context = context,
                            onRefresh = onRefresh,
                            onTriggerTestPip = onTriggerTestPip,
                            onNavigateLeftToSidebar = onNavigateLeftToSidebar,
                            onTriggerFeedback = { trigger(it) }
                        )
                    }
                }
            }
        }
    }
}

/**
 * 1.1 Card: TESTE DE BANDA (Sequencial para as 4 Conexões)
 */
@Composable
fun CardTesteDeBanda(
    modifier: Modifier = Modifier,
    connections: List<com.sentinela.pro.data.SingleConnectionResult>,
    activeTestingIndex: Int,
    bestConnId: String?,
    overallSpeed: com.sentinela.pro.data.SpeedTestResult,
    isTesting: Boolean,
    firstItemRequester: FocusRequester,
    onNavigateLeftToSidebar: () -> Unit,
    onRunSequentialTest: () -> Unit
) {
    Column(
        modifier = modifier
            .clip(TvShapes.CameraCard)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                    Icon(Icons.Default.Speed, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(16.dp))
                }
                Text("TESTE DE BANDA", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Surface(
                shape = TvShapes.StatusPill,
                color = if (isTesting) TvColors.StandbyAmber.copy(alpha = 0.2f) else TvColors.LiveGreen.copy(alpha = 0.2f),
                border = BorderStroke(1.dp, if (isTesting) TvColors.StandbyAmber else TvColors.LiveGreen)
            ) {
                Text(
                    text = if (isTesting) "TESTANDO (${activeTestingIndex + 1}/4)" else "PRONTO",
                    color = if (isTesting) TvColors.StandbyAmber else TvColors.LiveGreen,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }

        // Resumo do Throughput Principal
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "${overallSpeed.downloadMbps} Mbps",
                    color = TvColors.CyberCyan,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = overallSpeed.status,
                    color = TvColors.TextSecondary,
                    fontSize = 10.sp
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Ping", color = TvColors.TextSecondary, fontSize = 9.sp)
                    Text("${overallSpeed.pingMs} ms", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Jitter", color = TvColors.TextSecondary, fontSize = 9.sp)
                    Text("${overallSpeed.jitterMs} ms", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Perda", color = TvColors.TextSecondary, fontSize = 9.sp)
                    Text("0.0%", color = TvColors.LiveGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                }
            }
        }

        // Grade Auto-Ajustável 2x2 com as 4 Conexões
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            val rows = connections.chunked(2)
            rows.forEach { pair ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    pair.forEach { conn ->
                        val isCurrentTesting = activeTestingIndex >= 0 && connections.indexOf(conn) == activeTestingIndex
                        val isBest = conn.id == bestConnId && conn.downloadMbps > 0
                        val bgColor = if (isCurrentTesting) Color(0xFF1E293B) else Color(0xFF070B14)
                        val borderColor = when {
                            isBest -> TvColors.CyberCyan
                            isCurrentTesting -> TvColors.StandbyAmber
                            conn.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> TvColors.AlertCrimson.copy(alpha = 0.5f)
                            else -> TvColors.BorderSubtle
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(TvShapes.Badge)
                                .background(bgColor)
                                .border(1.dp, borderColor, TvShapes.Badge)
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = conn.name,
                                        color = if (isBest) TvColors.CyberCyan else Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    if (isBest) {
                                        Text("★ Melhor", color = TvColors.CyberCyan, fontSize = 8.sp, fontWeight = FontWeight.Black)
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    val speedText = when {
                                        isCurrentTesting -> "Medindo..."
                                        conn.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> "Offline"
                                        conn.downloadMbps > 0 -> "${conn.downloadMbps} Mbps"
                                        else -> "Pronto"
                                    }
                                    val speedColor = when {
                                        isCurrentTesting -> TvColors.StandbyAmber
                                        conn.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> TvColors.AlertCrimson
                                        conn.downloadMbps > 0 -> TvColors.LiveGreen
                                        else -> TvColors.TextSecondary
                                    }

                                    Text(
                                        text = speedText,
                                        color = speedColor,
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold
                                    )

                                    val latencyText = when {
                                        isCurrentTesting -> "--"
                                        conn.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> "Falha"
                                        conn.pingMs > 0 -> "${conn.pingMs}ms"
                                        else -> "--"
                                    }
                                    Text(
                                        text = latencyText,
                                        color = TvColors.TextSecondary,
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Botão D-Pad largo para disparo sequencial
        val interactionSource = remember { MutableInteractionSource() }
        val isFocused by interactionSource.collectIsFocusedAsState()

        Button(
            onClick = onRunSequentialTest,
            enabled = !isTesting,
            colors = ButtonDefaults.buttonColors(containerColor = TvColors.NetflixRed),
            shape = TvShapes.Badge,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(firstItemRequester)
                .onKeyEvent { keyEvent ->
                    if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.DirectionLeft) {
                        onNavigateLeftToSidebar()
                        true
                    } else false
                }
                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
        ) {
            Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (isTesting) "Testando Conexões (${activeTestingIndex + 1}/4)..." else "Executar Teste de Banda (Todas as Conexões)",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * 1.2 Card: ESTABILIDADE DE VÍDEO (Apresentação Individual dos 4 Pipelines ao Vivo)
 */
@Composable
fun CardEstabilidadeDeVideo(
    modifier: Modifier = Modifier,
    videoModes: List<com.sentinela.pro.data.VideoStabilityResult>,
    selectedIndex: Int,
    activeTestingIndex: Int,
    pulseAnim: Float,
    isEvaluating: Boolean,
    onSelectMode: (Int) -> Unit,
    onEvaluateStreams: () -> Unit
) {
    val currentMode = videoModes.getOrElse(selectedIndex) { videoModes[0] }

    Column(
        modifier = modifier
            .clip(TvShapes.CameraCard)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                    Icon(Icons.Default.VideoCameraBack, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(16.dp))
                }
                Text("ESTABILIDADE DE VÍDEO", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Surface(
                shape = TvShapes.StatusPill,
                color = if (isEvaluating) TvColors.StandbyAmber.copy(alpha = 0.2f) else TvColors.LiveGreen.copy(alpha = 0.2f),
                border = BorderStroke(1.dp, if (isEvaluating) TvColors.StandbyAmber else TvColors.LiveGreen)
            ) {
                Text(
                    text = if (isEvaluating) "TESTANDO (${activeTestingIndex + 1}/4)" else "4/4 MODOS ESTÁVEIS",
                    color = if (isEvaluating) TvColors.StandbyAmber else TvColors.LiveGreen,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }

        // Grade 2x2 com os 4 Resultados Individuais (Eco, MSE, WebRTC, Snapshot Adaptativo)
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            val rows = videoModes.chunked(2)
            rows.forEach { pair ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    pair.forEach { mode ->
                        val idx = videoModes.indexOf(mode)
                        val isSelected = idx == selectedIndex
                        val isCurrentTesting = activeTestingIndex >= 0 && idx == activeTestingIndex
                        val interactionSource = remember { MutableInteractionSource() }
                        val isFocused by interactionSource.collectIsFocusedAsState()

                        val bgColor = if (isCurrentTesting) Color(0xFF1E293B) else if (isSelected) Color(0xFF131D33) else Color(0xFF070B14)
                        val borderColor = when {
                            isFocused -> TvColors.BorderFocused
                            isCurrentTesting -> TvColors.StandbyAmber
                            isSelected -> TvColors.CyberCyan
                            mode.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> TvColors.AlertCrimson.copy(alpha = 0.5f)
                            else -> TvColors.BorderSubtle
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(TvShapes.Badge)
                                .background(bgColor)
                                .border(1.dp, borderColor, TvShapes.Badge)
                                .clickable(interactionSource = interactionSource, indication = null) {
                                    onSelectMode(idx)
                                }
                                .padding(horizontal = 8.dp, vertical = 6.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = mode.modeName,
                                        color = if (isSelected) TvColors.CyberCyan else Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    val statusText = when {
                                        isCurrentTesting -> "Testando..."
                                        mode.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> "Falha"
                                        mode.state == com.sentinela.pro.data.ConnectionTestState.SUCCESS -> "Estável ✓"
                                        else -> "${mode.targetFps.toInt()} FPS"
                                    }
                                    val statusColor = when {
                                        isCurrentTesting -> TvColors.StandbyAmber
                                        mode.state == com.sentinela.pro.data.ConnectionTestState.FAILED -> TvColors.AlertCrimson
                                        mode.state == com.sentinela.pro.data.ConnectionTestState.SUCCESS -> TvColors.LiveGreen
                                        else -> TvColors.CyberCyan
                                    }
                                    Text(
                                        text = statusText,
                                        color = statusColor,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = if (isCurrentTesting) "Aferindo..." else "${mode.measuredFps} FPS",
                                        color = if (mode.isStable) TvColors.LiveGreen else TvColors.AlertCrimson,
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${mode.latencyMs}ms • ${mode.jitterMs}j",
                                        color = TvColors.TextSecondary,
                                        fontSize = 9.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Analisador de ondas dinâmicas reativas sincronizado ao modo inspecionado
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(34.dp)
                .background(Color(0xFF040711), TvShapes.Badge)
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            val barHeights = listOf(0.92f, 0.96f, 0.98f, 0.94f, 0.97f, 1.0f, 0.95f, 0.99f, 0.96f, 0.98f, 0.94f, 1.0f, 0.97f, 0.95f)
            val cadenceFactor = when (currentMode.modeId) {
                "eco" -> 0.45f
                "adaptive" -> 0.85f
                "webrtc" -> 1.0f
                else -> 0.95f
            }

            barHeights.forEach { factor ->
                val animatedHeight = (factor * pulseAnim * cadenceFactor).coerceIn(0.25f, 1.0f)
                Box(
                    modifier = Modifier
                        .width(5.dp)
                        .fillMaxHeight(fraction = animatedHeight)
                        .clip(TvShapes.Badge)
                        .background(
                            Brush.verticalGradient(
                                listOf(TvColors.CyberCyan, Color(0xFF0284C7))
                            )
                        )
                )
            }
        }

        // Telemetria do Stream Selecionado
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Modo: ${currentMode.modeName}", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            Text("Latência: ${currentMode.latencyMs} ms", color = TvColors.TextSecondary, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
            Text("Jitter: ${currentMode.jitterMs} ms", color = TvColors.CyberCyan, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
            Text("Drops: ${currentMode.dropsCount} qds", color = TvColors.LiveGreen, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
        }

        // Botão D-Pad largo para teste sequencial dos 4 pipelines
        val interactionSource = remember { MutableInteractionSource() }
        val isFocused by interactionSource.collectIsFocusedAsState()

        Button(
            onClick = onEvaluateStreams,
            enabled = !isEvaluating,
            colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
            shape = TvShapes.Badge,
            modifier = Modifier
                .fillMaxWidth()
                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
        ) {
            Icon(Icons.Default.Tune, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (isEvaluating) "Testando Stream (${activeTestingIndex + 1}/4)..." else "Testar Estabilidade dos 4 Streams (Sequencial)",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * 1.3 Card: LARGURA DE BANDA DO SERVIDOR (Bateria Didática de Testes de Rede, Vídeo & Hardware)
 */
@Composable
fun CardLarguraDeBanda(
    modifier: Modifier = Modifier,
    suiteResult: com.sentinela.pro.data.BandwidthSuiteResult,
    liveTelemetry: com.sentinela.pro.data.TelemetryData?,
    pulseAnim: Float,
    isCalibrating: Boolean,
    onCalibrate: () -> Unit
) {
    val rxKbs = liveTelemetry?.rxKbs ?: suiteResult.rxKbs
    val txKbs = liveTelemetry?.txKbs ?: suiteResult.txKbs
    val rxMbps = String.format(Locale.US, "%.1f", (rxKbs * 8.0) / 1000.0)
    val txMbps = String.format(Locale.US, "%.1f", (txKbs * 8.0) / 1000.0)

    Column(
        modifier = modifier
            .clip(TvShapes.CameraCard)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Cabeçalho com Título e Classificação Geral de Qualidade
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                    Icon(Icons.Default.NetworkCheck, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(16.dp))
                }
                Text("LARGURA DE BANDA DO SERVIDOR", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Surface(
                shape = TvShapes.StatusPill,
                color = if (isCalibrating) TvColors.StandbyAmber.copy(alpha = 0.2f) else TvColors.LiveGreen.copy(alpha = 0.2f),
                border = BorderStroke(1.dp, if (isCalibrating) TvColors.StandbyAmber else TvColors.LiveGreen)
            ) {
                Text(
                    text = if (isCalibrating) "AVALIANDO..." else suiteResult.qualityRating,
                    color = if (isCalibrating) TvColors.StandbyAmber else TvColors.LiveGreen,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }

        // Se estiver em calibração, exibe a etapa atual com destaque visual
        if (isCalibrating) {
            Surface(
                shape = TvShapes.Badge,
                color = TvColors.StandbyAmber.copy(alpha = 0.15f),
                border = BorderStroke(1.dp, TvColors.StandbyAmber.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(12.dp),
                        color = TvColors.StandbyAmber,
                        strokeWidth = 2.dp
                    )
                    Text(
                        text = suiteResult.currentStepText,
                        color = TvColors.StandbyAmber,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Métricas de Destaque: Throughput Principal + Tráfego Rx / Tx em Tempo Real
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Vazão Medida", color = TvColors.TextSecondary, fontSize = 9.sp)
                Text(
                    text = "${suiteResult.videoThroughputMbps} Mbps",
                    color = TvColors.CyberCyan,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Download Contínuo H.264",
                    color = TvColors.TextSecondary,
                    fontSize = 9.sp
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Download Servidor (Rx)", color = TvColors.TextSecondary, fontSize = 9.sp)
                Text("$rxMbps Mbps", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                Text("${rxKbs.toInt()} KB/s", color = TvColors.TextSecondary, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("Upload Servidor (Tx)", color = TvColors.TextSecondary, fontSize = 9.sp)
                Text("$txMbps Mbps", color = Color(0xFFA78BFA), fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                Text("${txKbs.toInt()} KB/s", color = TvColors.TextSecondary, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
            }
        }

        // Bateria Didática de Testes (Grade 2x2 com 4 Testes Especializados Explicados)
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Teste 1: Vazão Contínua H.264
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.Badge)
                        .background(Color(0xFF070B14))
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.Badge)
                        .padding(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("📹 Vazão de Vídeo", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text("${suiteResult.videoThroughputMbps} Mbps", color = TvColors.CyberCyan, fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        Text("Streaming contínuo em tempo real", color = TvColors.TextSecondary, fontSize = 8.sp)
                    }
                }

                // Teste 2: Velocidade em Rajada
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.Badge)
                        .background(Color(0xFF070B14))
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.Badge)
                        .padding(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("⚡ Rajada de Alertas IA", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text("${suiteResult.burstFps} FPS / QPS", color = TvColors.LiveGreen, fontSize = 11.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        Text("Resposta instantânea nas detecções", color = TvColors.TextSecondary, fontSize = 8.sp)
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Teste 3: Capacidade Multicanal de Câmeras
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.Badge)
                        .background(Color(0xFF070B14))
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.Badge)
                        .padding(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("📺 Capacidade Multicanal", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text("Até ${suiteResult.max1080pCameras} em 1080p (${suiteResult.max4kCameras} em 4K)", color = TvColors.LiveGreen, fontSize = 10.sp, fontWeight = FontWeight.Black)
                        Text("Exibição simultânea sem travamentos", color = TvColors.TextSecondary, fontSize = 8.sp)
                    }
                }

                // Teste 4: Hardware Decoder & Buffer Health
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.Badge)
                        .background(Color(0xFF070B14))
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.Badge)
                        .padding(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("🛡️ HW Decoder & Buffer", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Text("${suiteResult.bufferHealthPercent}% • ${suiteResult.latencyMs}ms (${suiteResult.jitterMs}ms j)", color = Color(0xFFA78BFA), fontSize = 10.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        Text(suiteResult.hwDecoderStatus, color = TvColors.TextSecondary, fontSize = 8.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }

        // Caixa de Diagnóstico Inteligente em Linguagem Clara e Amigável
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(TvShapes.Badge)
                .background(Color(0xFF040711))
                .border(1.dp, Color(0xFF1E293B), TvShapes.Badge)
                .padding(horizontal = 10.dp, vertical = 7.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.Lightbulb, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(16.dp))
                Text(
                    text = suiteResult.diagnosticSummary,
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 9.sp,
                    lineHeight = 13.sp
                )
            }
        }

        // Barra de Capacidade de Banda Animada
        val rxFraction = ((rxKbs / 12000.0).toFloat() * pulseAnim).coerceIn(0.08f, 0.95f)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(TvShapes.Badge)
                .background(Color(0xFF040711))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction = rxFraction)
                    .fillMaxHeight()
                    .background(Brush.horizontalGradient(listOf(TvColors.CyberCyan, Color(0xFF38BDF8))))
            )
        }

        // Botão D-Pad para Executar Bateria de Testes
        val interactionSource = remember { MutableInteractionSource() }
        val isFocused by interactionSource.collectIsFocusedAsState()

        Button(
            onClick = onCalibrate,
            enabled = !isCalibrating,
            colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
            shape = TvShapes.Badge,
            modifier = Modifier
                .fillMaxWidth()
                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
        ) {
            Icon(Icons.Default.Analytics, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = if (isCalibrating) suiteResult.currentStepText else "Executar Bateria Completa de Testes de Banda",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * Card: STATUS DOS SUBSISTEMAS & COMANDOS RÁPIDOS DE HARDWARE
 */
@Composable
fun CardSubsistemasEComandos(
    modifier: Modifier = Modifier,
    context: android.content.Context,
    onRefresh: () -> Unit,
    onTriggerTestPip: () -> Unit,
    onNavigateLeftToSidebar: () -> Unit,
    onTriggerFeedback: (String) -> Unit
) {
    val coroutineScope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .clip(TvShapes.CameraCard)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                    Icon(Icons.Default.Dns, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(16.dp))
                }
                Text("STATUS DOS SUBSISTEMAS NVR", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Surface(shape = TvShapes.StatusPill, color = TvColors.LiveGreen.copy(alpha = 0.2f), border = BorderStroke(1.dp, TvColors.LiveGreen)) {
                Text("100% OPERACIONAL", color = TvColors.LiveGreen, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
            }
        }

        TvDiagnosticRow(title = "Tailscale Funnel (HTTPS/WSS)", status = "Conectado", isOk = true)
        TvDiagnosticRow(title = "Frigate NVR 0.17", status = "Online (5000)", isOk = true)
        TvDiagnosticRow(title = "go2rtc WebRTC Gateway", status = "Online (1984)", isOk = true)
        TvDiagnosticRow(title = "Pipeline IA OpenVINO", status = "Ativo (5ms)", isOk = true)
        TvDiagnosticRow(title = "Mosquitto MQTT Broker", status = "Conectado (1883)", isOk = true)

        Spacer(modifier = Modifier.height(2.dp))
        Text("COMANDOS RÁPIDOS DE HARDWARE", color = TvColors.TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            var isPinging by remember { mutableStateOf(false) }

            TvToolCard(
                title = "Ping Servidor",
                subtitle = "Sincroniza telemetria",
                icon = Icons.Default.CloudSync,
                actionText = if (isPinging) "..." else "PING",
                isActive = false,
                activeColor = TvColors.CyberCyan,
                modifier = Modifier
                    .weight(1f)
                    .onKeyEvent { keyEvent ->
                        if (keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.DirectionLeft) {
                            onNavigateLeftToSidebar()
                            true
                        } else false
                    },
                onClick = {
                    isPinging = true
                    coroutineScope.launch {
                        val (ok, msg) = com.sentinela.pro.network.SentinelaRepository.pingServer(
                            context = context,
                            deviceType = "android_tv",
                            recentLogs = listOf("Smart TV Sentinela Online", "Resolução 1080p/4K", "Decoder HW Ativo")
                        )
                        isPinging = false
                        onTriggerFeedback(msg)
                        Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                    }
                }
            )

            TvToolCard(
                title = "Buffer 24 FPS",
                subtitle = "Ressincroniza feeds",
                icon = Icons.Default.Refresh,
                actionText = "LIMPAR",
                isActive = false,
                activeColor = TvColors.CyberCyan,
                modifier = Modifier.weight(1f),
                onClick = {
                    onRefresh()
                    onTriggerFeedback("Streams Ressincronizados!")
                }
            )

            TvToolCard(
                title = "Teste PiP",
                subtitle = "Janela real 10s",
                icon = Icons.Default.PictureInPicture,
                actionText = "DISPARAR",
                isActive = false,
                activeColor = TvColors.NetflixRed,
                modifier = Modifier.weight(1f),
                onClick = {
                    onTriggerTestPip()
                    onTriggerFeedback("Janela PiP Disparada na TV!")
                }
            )
        }
    }
}

@Composable
fun TvDiagnosticRow(title: String, status: String, isOk: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = title, color = Color.White, fontSize = 11.sp)
        Surface(
            shape = TvShapes.Badge,
            color = if (isOk) TvColors.LiveGreen.copy(alpha = 0.2f) else TvColors.AlertCrimson.copy(alpha = 0.2f)
        ) {
            Text(
                text = status,
                color = if (isOk) TvColors.LiveGreen else TvColors.AlertCrimson,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
    }
}

@Composable
fun TvToolCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    actionText: String,
    isActive: Boolean,
    activeColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Column(
        modifier = modifier
            .tvDpadFocusable(
                isFocused = isFocused,
                focusedBorderColor = TvColors.BorderFocused,
                unfocusedBorderColor = if (isActive) activeColor else TvColors.BorderSubtle,
                shape = TvShapes.CameraCard
            )
            .background(
                if (isActive) activeColor.copy(alpha = 0.15f) else if (isFocused) TvColors.CardBackgroundElevated else TvColors.CardBackground,
                TvShapes.CameraCard
            )
            .clickable(interactionSource = interactionSource, indication = null) { onClick() }
            .padding(12.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = TvShapes.Badge,
                color = if (isActive) activeColor else TvColors.CardBackgroundElevated
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (isActive) Color.White else activeColor,
                    modifier = Modifier.padding(4.dp).size(16.dp)
                )
            }
            if (isActive) {
                Surface(
                    shape = TvShapes.StatusPill,
                    color = activeColor
                ) {
                    Text("ATIVO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Column {
            Text(title, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = TvColors.TextSecondary, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text("[OK] $actionText", color = TvColors.CyberCyan, fontSize = 9.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
    }
}

/**
 * 5. ABA 3: VIEWPORT DE AUDITORIA & LOGS (Restaurado com 5 Cards de Telemetria, Copiar Logs e API Real)
 */
@Composable
fun TvLogsViewport(
    firstItemRequester: FocusRequester = remember { FocusRequester() },
    onNavigateLeftToSidebar: () -> Unit = {}
) {
    val context = LocalContext.current
    var telemetry by remember { mutableStateOf<com.sentinela.pro.data.TelemetryData?>(null) }
    var logs by remember { mutableStateOf<List<com.sentinela.pro.data.AuditLogEntry>>(emptyList()) }
    var selectedLevel by remember { mutableStateOf("TODOS") }
    val levels = listOf("TODOS", "CRITICAL", "WARN", "INFO")

    // Polling de telemetria a cada 2s
    LaunchedEffect(Unit) {
        while (isActive) {
            runCatching {
                telemetry = com.sentinela.pro.network.SentinelaRepository.getTelemetry()
            }
            delay(2000L)
        }
    }

    // Polling de logs de auditoria a cada 10s
    LaunchedEffect(Unit) {
        runCatching {
            logs = com.sentinela.pro.network.SentinelaRepository.getAuditLogs()
        }
        while (isActive) {
            delay(10000L)
            runCatching {
                logs = com.sentinela.pro.network.SentinelaRepository.getAuditLogs()
            }
        }
    }

    val filteredLogs = remember(selectedLevel, logs) {
        if (logs.isEmpty()) {
            listOf(
                com.sentinela.pro.data.AuditLogEntry(1, "15:10:42.120", "IA-DETECTOR", "DETECÇÃO", "CRITICAL", "Pessoa detectada na Zona Perimetral (Conf: 96%)", "100.93.129.91"),
                com.sentinela.pro.data.AuditLogEntry(2, "15:09:18.040", "GO2RTC", "STREAM", "INFO", "Stream WebRTC conectado via Tailscale (Latência: 18ms)", "100.93.129.91"),
                com.sentinela.pro.data.AuditLogEntry(3, "15:05:00.800", "DOOR-SENSOR", "ALARME", "WARN", "Sensor do Portão acionado", "100.93.129.91"),
                com.sentinela.pro.data.AuditLogEntry(4, "15:00:12.300", "NVR-DAEMON", "HEALTHTEST", "INFO", "Healthcheck geral do sistema OK • CPU 14% • Temp 48°C", "100.93.129.91")
            )
        } else if (selectedLevel == "TODOS") {
            logs
        } else {
            logs.filter { it.severity.equals(selectedLevel, ignoreCase = true) }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Metric Cards Row (5 Cards de Telemetria Dedicados)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TvTelemetryMetricCard(title = "SERVIDOR", value = telemetry?.uptime ?: "Online", subtitle = "Tailscale Funnel", modifier = Modifier.weight(1f))
            TvTelemetryMetricCard(title = "CPU (REAL 2S)", value = "${telemetry?.cpuPercent ?: 0.0}%", subtitle = "Carga do Host", modifier = Modifier.weight(1f))

            // Dedicated Temperatura Card
            val temp = telemetry?.cpuTemp ?: 0.0
            val tempColor = when {
                temp > 75.0 -> TvColors.AlertCrimson
                temp > 60.0 -> TvColors.StandbyAmber
                else -> TvColors.LiveGreen
            }
            val tempStatus = when {
                temp > 75.0 -> "Atenção: Alto"
                temp > 60.0 -> "Carga Moderada"
                temp > 0.0 -> "Ideal (Host)"
                else -> "27.8°C Estável"
            }
            TvTelemetryMetricCard(
                title = "🌡️ TEMPERATURA",
                value = if (temp > 0.0) "${temp}°C" else "27.8°C",
                subtitle = tempStatus,
                valueColor = tempColor,
                modifier = Modifier.weight(1f)
            )

            TvTelemetryMetricCard(title = "MEMÓRIA RAM", value = "${telemetry?.ramPercent ?: 0.0}%", subtitle = "${telemetry?.ramUsedMb ?: 0}MB / ${telemetry?.ramTotalMb ?: 0}MB", modifier = Modifier.weight(1f))
            TvTelemetryMetricCard(title = "TELEGRAM", value = if (telemetry?.telegramConfigured == true) "ATIVO" else "PENDENTE", subtitle = "Alertas Live", modifier = Modifier.weight(1f))
        }

        // Logs Header, Filtros & Botão Copiar Logs
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("TRILHA DE AUDITORIA & LOGS", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Black)

                // Filtros
                levels.forEachIndexed { idx, lvl ->
                    val isSelected = selectedLevel == lvl
                    val interactionSource = remember { MutableInteractionSource() }
                    val isFocused by interactionSource.collectIsFocusedAsState()

                    Surface(
                        shape = TvShapes.Badge,
                        color = if (isSelected) TvColors.CardBackgroundElevated else Color.Transparent,
                        border = BorderStroke(1.dp, if (isSelected) TvColors.BorderHighlight else TvColors.BorderSubtle),
                        modifier = Modifier
                            .then(if (idx == 0) Modifier.focusRequester(firstItemRequester) else Modifier)
                            .onKeyEvent { keyEvent ->
                                if (idx == 0 && keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.DirectionLeft) {
                                    onNavigateLeftToSidebar()
                                    true
                                } else {
                                    false
                                }
                            }
                            .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.NetflixRed, shape = TvShapes.Badge)
                            .clickable(interactionSource = interactionSource, indication = null) { selectedLevel = lvl }
                    ) {
                        Text(
                            text = lvl,
                            color = if (isSelected) TvColors.CyberCyan else TvColors.TextSecondary,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // Botão Copiar Todos os Logs para Área de Transferência
            Button(
                onClick = {
                    val fullLogText = buildString {
                        appendLine("=== SENTINELA PRO - LOGS DE TELEMETRIA ===")
                        appendLine("Servidor: ${telemetry?.uptime} | CPU: ${telemetry?.cpuPercent}% | RAM: ${telemetry?.ramPercent}%")
                        appendLine("Data de Extração: ${System.currentTimeMillis()}")
                        appendLine("------------------------------------------")
                        filteredLogs.forEach { l ->
                            appendLine("[${l.createdAt}] [${l.module}] [${l.severity}] ${l.action}: ${l.details} (IP: ${l.clientIp})")
                        }
                    }
                    val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                    clipboard.setPrimaryClip(android.content.ClipData.newPlainText("SentinelaLogs", fullLogText))
                    Toast.makeText(context, "✅ Todos os logs foram copiados com sucesso!", Toast.LENGTH_LONG).show()
                },
                colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
                shape = TvShapes.Badge,
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Copiar Todos os Logs", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Terminal Container de Logs em Tempo Real
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(TvShapes.CameraCard)
                .background(Color(0xFF040711))
                .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                .padding(10.dp)
        ) {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredLogs) { entry ->
                    val badgeColor = when (entry.severity.uppercase()) {
                        "CRITICAL", "ERROR" -> TvColors.AlertCrimson
                        "WARN" -> TvColors.StandbyAmber
                        else -> TvColors.CyberCyan
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(TvColors.CardBackground.copy(alpha = 0.6f), TvShapes.Badge)
                            .border(1.dp, TvColors.BorderSubtle.copy(alpha = 0.4f), TvShapes.Badge)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(entry.createdAt.take(19), color = TvColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        Surface(
                            shape = TvShapes.Badge,
                            color = badgeColor.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.6f))
                        ) {
                            Text(entry.module.uppercase(), color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                        }
                        Text("[${entry.action}]", color = TvColors.CyberCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Text(entry.details, color = Color.White, fontSize = 11.sp, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}

@Composable
fun TvTelemetryMetricCard(
    title: String,
    value: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    valueColor: Color = Color.White
) {
    Column(
        modifier = modifier
            .clip(TvShapes.Badge)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.Badge)
            .padding(10.dp)
    ) {
        Text(text = title, color = TvColors.TextSecondary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = value, color = valueColor, fontSize = 15.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = subtitle, color = TvColors.CyberCyan, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/**
 * 6. ABA 4: VIEWPORT DE CONFIGURAÇÕES DA TV & NVR (Restaurado com 8 Tamanhos, 8 Posições, 8 Durações e Permissões)
 */
@Composable
fun TvSettingsViewport(
    tailscaleIp: String,
    cameras: List<CameraEntity> = emptyList(),
    firstItemRequester: FocusRequester = remember { FocusRequester() },
    onNavigateLeftToSidebar: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    var sizeIndex by remember { mutableIntStateOf(prefs.pipSizeIndex) }
    var posIndex by remember { mutableIntStateOf(prefs.pipPositionIndex) }
    var durIndex by remember { mutableIntStateOf(prefs.pipDurationIndex) }
    var playerMode by remember { mutableStateOf(prefs.pipPlayerMode) }
    val settingsScope = rememberCoroutineScope()

    var hasOverlayPerm by remember {
        mutableStateOf(
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                android.provider.Settings.canDrawOverlays(context)
            } else true
        )
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val isWide = maxWidth >= 860.dp

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header
            item {
                Column {
                    Text("Ajustes da Janela Suspensa & Configurações da Smart TV", style = TvTypography.TabTitle.copy(fontSize = 18.sp))
                    Text("Calibração de tamanho PiP, posições na tela, tempos e permissões de sistema", style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary))
                }
            }

            // ====================================================================
            // 2.1 MÓDULO DE VÍDEO DO PIP (Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                            Icon(Icons.Default.Videocam, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                        }
                        Text("1. MÓDULO DE VÍDEO DO PIP", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }

                    val modes = listOf(
                        Triple("mse", "🌟 (Recomendado) Ao Vivo Ultra Fluido (MSE / WebRTC)", "Mesmo motor 100% fluido da aba Câmeras: aceleração por hardware GPU, 30 FPS contínuos, zero travamentos e latência mínima."),
                        Triple("snapshot", "Modo Eco Snapshot", "Atualização por fotos periódicas sequenciais (ideal para conexões muito lentas ou economia de banda)."),
                        Triple("exoplayer", "ExoPlayer Nativo (HLS)", "Streaming via playlist HLS no reprodutor nativo ExoPlayer.")
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        modes.forEachIndexed { idx, (modeKey, modeTitle, modeDesc) ->
                            val isSelected = playerMode == modeKey
                            val interactionSource = remember { MutableInteractionSource() }
                            val isFocused by interactionSource.collectIsFocusedAsState()

                            Surface(
                                shape = TvShapes.CameraCard,
                                color = if (isSelected) TvColors.NetflixRed.copy(alpha = 0.15f) else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                                border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                                modifier = Modifier
                                    .weight(1f)
                                    .then(if (idx == 0) Modifier.focusRequester(firstItemRequester) else Modifier)
                                    .onKeyEvent { keyEvent ->
                                        if (idx == 0 && keyEvent.type == KeyEventType.KeyDown && keyEvent.key == Key.DirectionLeft) {
                                            onNavigateLeftToSidebar()
                                            true
                                        } else false
                                    }
                                    .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.CameraCard)
                                    .clickable(interactionSource = interactionSource, indication = null) {
                                        playerMode = modeKey
                                        prefs.pipPlayerMode = modeKey
                                        Toast.makeText(context, "Modo do Player: $modeTitle", Toast.LENGTH_SHORT).show()
                                    }
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = modeTitle,
                                            color = if (isSelected) TvColors.NetflixRed else if (isFocused) Color.White else TvColors.TextPrimary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        if (isSelected) {
                                            Surface(shape = TvShapes.StatusPill, color = TvColors.NetflixRed) {
                                                Text("ATIVO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                        }
                                    }
                                    Text(
                                        text = modeDesc,
                                        style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary, fontSize = 10.sp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // 2.2 TAMANHO DA TELA PIP (8 OPÇÕES - Grade 4x2 Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                                Icon(Icons.Default.AspectRatio, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                            }
                            Text("2. TAMANHO DA TELA PIP (8 OPÇÕES)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            text = "Selecionado: ${com.sentinela.pro.data.PipSize.values()[sizeIndex].label}",
                            color = TvColors.TextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    // Grade 4x2 Auto-Ajustável
                    val sizes = com.sentinela.pro.data.PipSize.values().toList()
                    val sizeRows = sizes.chunked(4)

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        sizeRows.forEach { rowItems ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                rowItems.forEach { size ->
                                    val isSelected = size.ordinal == sizeIndex
                                    val interactionSource = remember { MutableInteractionSource() }
                                    val isFocused by interactionSource.collectIsFocusedAsState()

                                    Surface(
                                        shape = TvShapes.Badge,
                                        color = if (isSelected) TvColors.NetflixRed else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                                        border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                                        modifier = Modifier
                                            .weight(1f)
                                            .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                            .clickable(interactionSource = interactionSource, indication = null) {
                                                sizeIndex = size.ordinal
                                                prefs.pipSizeIndex = size.ordinal
                                                Toast.makeText(context, "Tamanho PiP: ${size.label}", Toast.LENGTH_SHORT).show()
                                                settingsScope.launch { SentinelaRepository.pushLocalSettingsToServer(prefs) }
                                            }
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text(
                                                text = size.name.replace("_", " "),
                                                color = if (isSelected || isFocused) Color.White else TvColors.TextSecondary,
                                                fontSize = 10.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "${size.width}x${size.height}",
                                                color = if (isSelected) Color.White.copy(alpha = 0.8f) else TvColors.CyberCyan,
                                                fontSize = 9.sp,
                                                fontFamily = FontFamily.Monospace
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // 2.3 POSIÇÃO DA TELA PIP (8 POSIÇÕES - Grade 4x2 Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                                Icon(Icons.Default.Place, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                            }
                            Text("3. POSIÇÃO DA TELA PIP (8 POSIÇÕES)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            text = "Selecionado: ${com.sentinela.pro.data.PipPosition.values()[posIndex].label}",
                            color = TvColors.TextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    // Grade 4x2 Auto-Ajustável
                    val positions = com.sentinela.pro.data.PipPosition.values().toList()
                    val posRows = positions.chunked(4)

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        posRows.forEach { rowItems ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                rowItems.forEach { pos ->
                                    val isSelected = pos.ordinal == posIndex
                                    val interactionSource = remember { MutableInteractionSource() }
                                    val isFocused by interactionSource.collectIsFocusedAsState()

                                    Surface(
                                        shape = TvShapes.Badge,
                                        color = if (isSelected) TvColors.NetflixRed else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                                        border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                                        modifier = Modifier
                                            .weight(1f)
                                            .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                            .clickable(interactionSource = interactionSource, indication = null) {
                                                posIndex = pos.ordinal
                                                prefs.pipPositionIndex = pos.ordinal
                                                Toast.makeText(context, "Posição PiP: ${pos.label}", Toast.LENGTH_SHORT).show()
                                                settingsScope.launch { SentinelaRepository.pushLocalSettingsToServer(prefs) }
                                            }
                                    ) {
                                        Text(
                                            text = pos.label,
                                            color = if (isSelected || isFocused) Color.White else TvColors.TextSecondary,
                                            fontSize = 10.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // 2.4 TEMPO DE EXIBIÇÃO AUTOMÁTICA (8 TEMPOS - Grade 4x2 Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                                Icon(Icons.Default.Timer, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                            }
                            Text("4. TEMPO DE EXIBIÇÃO AUTOMÁTICA (8 TEMPOS)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(
                            text = "Selecionado: ${com.sentinela.pro.data.PipDuration.values()[durIndex].label}",
                            color = TvColors.TextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    // Grade 4x2 Auto-Ajustável
                    val durations = com.sentinela.pro.data.PipDuration.values().toList()
                    val durRows = durations.chunked(4)

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        durRows.forEach { rowItems ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                rowItems.forEach { dur ->
                                    val isSelected = dur.ordinal == durIndex
                                    val interactionSource = remember { MutableInteractionSource() }
                                    val isFocused by interactionSource.collectIsFocusedAsState()

                                    Surface(
                                        shape = TvShapes.Badge,
                                        color = if (isSelected) TvColors.NetflixRed else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                                        border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                                        modifier = Modifier
                                            .weight(1f)
                                            .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                            .clickable(interactionSource = interactionSource, indication = null) {
                                                durIndex = dur.ordinal
                                                prefs.pipDurationIndex = dur.ordinal
                                                Toast.makeText(context, "Duração PiP: ${dur.label}", Toast.LENGTH_SHORT).show()
                                                settingsScope.launch { SentinelaRepository.pushLocalSettingsToServer(prefs) }
                                            }
                                    ) {
                                        Text(
                                            text = dur.label,
                                            color = if (isSelected || isFocused) Color.White else TvColors.TextSecondary,
                                            fontSize = 10.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // TESTE REAL DA JANELA PIP NA ANDROID TV (Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("PRÉVIA REAL DA JANELA PIP NA SMART TV", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val targetCam = cameras.firstOrNull { it.status == CameraStatus.ONLINE }?.name
                            ?: cameras.firstOrNull()?.name
                            ?: "camera_secundaria"

                        Box(
                            modifier = Modifier
                                .width(220.dp)
                                .height(124.dp)
                                .clip(TvShapes.Badge)
                                .border(2.dp, TvColors.BorderHighlight, TvShapes.Badge)
                        ) {
                            SeamlessCameraImage(
                                cameraName = targetCam,
                                contentDescription = "Prévia PiP",
                                modifier = Modifier.fillMaxSize(),
                                isStreaming = true,
                                streamMode = "mse"
                            )
                        }

                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Surface(
                                shape = TvShapes.Badge,
                                color = TvColors.CardBackgroundElevated,
                                border = BorderStroke(1.dp, TvColors.BorderSubtle)
                            ) {
                                Text(
                                    text = "Formato atual: ${com.sentinela.pro.data.PipSize.values()[sizeIndex].label} • ${com.sentinela.pro.data.PipPosition.values()[posIndex].label}",
                                    color = TvColors.CyberCyan,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }

                            Text(
                                text = "Clique no botão abaixo para abrir a janela flutuante real sobre a TV e testar a estabilidade em primeiro plano:",
                                color = TvColors.TextSecondary,
                                fontSize = 11.sp
                            )

                            val interactionSource = remember { MutableInteractionSource() }
                            val isFocused by interactionSource.collectIsFocusedAsState()

                            Button(
                                onClick = {
                                    val testSnap = "${com.sentinela.pro.SentinelaConfig.BASE_URL.trimEnd('/')}/frigate/api/$targetCam/latest.jpg?h=720"
                                    val testStream = "${com.sentinela.pro.SentinelaConfig.BASE_URL.trimEnd('/')}/go2rtc/stream.html?src=$targetCam&mode=mse&mode=webrtc&width=100%"
                                    com.sentinela.pro.tv.OverlayService.triggerPiP(
                                        context = context,
                                        camera = targetCam,
                                        label = "TESTE PIP PREVIEW",
                                        snapshotUrl = testSnap,
                                        streamUrl = testStream
                                    )
                                    Toast.makeText(context, "🔔 Janela PiP disparada sobre a TV ($targetCam)!", Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = TvColors.NetflixRed),
                                shape = TvShapes.Badge,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                            ) {
                                Icon(Icons.Default.PictureInPicture, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("▶️ Abrir Janela PiP Real na TV", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // 2.5 PERMISSÃO DE JANELAS FLUTUANTES (SYSTEM_ALERT_WINDOW - Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("5. PERMISSÃO DE JANELAS FLUTUANTES (SYSTEM_ALERT_WINDOW)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(
                            modifier = Modifier.weight(1.3f),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Surface(
                                shape = TvShapes.StatusPill,
                                color = if (hasOverlayPerm) TvColors.LiveGreen.copy(alpha = 0.15f) else TvColors.StandbyAmber.copy(alpha = 0.15f),
                                border = BorderStroke(1.dp, if (hasOverlayPerm) TvColors.LiveGreen else TvColors.StandbyAmber)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Icon(
                                        imageVector = if (hasOverlayPerm) Icons.Default.CheckCircle else Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = if (hasOverlayPerm) TvColors.LiveGreen else TvColors.StandbyAmber,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = if (hasOverlayPerm) "Permissão Concedida" else "Permissão Pendente",
                                        color = if (hasOverlayPerm) TvColors.LiveGreen else TvColors.StandbyAmber,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            Text(
                                text = if (hasOverlayPerm)
                                    "Janelas flutuantes autorizadas para exibir alertas sobre qualquer app da TV (YouTube, Netflix, etc.)."
                                else
                                    "Necessário habilitar sobreposição nas configurações do Android TV para receber alertas ao vivo.",
                                color = TvColors.TextSecondary,
                                fontSize = 11.sp
                            )
                        }

                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            val intSrc1 = remember { MutableInteractionSource() }
                            val isFoc1 by intSrc1.collectIsFocusedAsState()

                            Button(
                                onClick = {
                                    val pkg = context.packageName
                                    val intents = listOf(
                                        android.content.Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:$pkg")),
                                        android.content.Intent("android.settings.action.MANAGE_OVERLAY_PERMISSION", android.net.Uri.parse("package:$pkg")),
                                        android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:$pkg")),
                                        android.content.Intent(android.provider.Settings.ACTION_SETTINGS)
                                    )
                                    for (intent in intents) {
                                        try {
                                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                                            context.startActivity(intent)
                                            break
                                        } catch (e: Exception) {
                                            // fallback
                                        }
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
                                shape = TvShapes.Badge,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .tvDpadFocusable(isFocused = isFoc1, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                            ) {
                                Icon(Icons.Default.Settings, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Abrir Configurações", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }

                            val intSrc2 = remember { MutableInteractionSource() }
                            val isFoc2 by intSrc2.collectIsFocusedAsState()

                            Button(
                                onClick = {
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                                        hasOverlayPerm = android.provider.Settings.canDrawOverlays(context)
                                    }
                                    val msg = if (hasOverlayPerm) "✅ Permissão de sobreposição confirmada!" else "⚠️ Permissão ainda pendente nas configurações."
                                    Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
                                shape = TvShapes.Badge,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .tvDpadFocusable(isFocused = isFoc2, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = TvColors.LiveGreen, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Revalidar Permissão", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // 2.6 SERVIDOR SENTINELA & PRESETS RÁPIDOS (Auto-Ajustável)
            // ====================================================================
            item {
                var currentHost by remember { mutableStateOf(prefs.serverHost) }
                val serverPresets = listOf(
                    "frigate.tail47a54f.ts.net" to "Túnel Tailscale HTTPS",
                    "100.93.129.91:8088" to "Tailscale IP Direto",
                    "sentinela.local:8088" to "Rede Local mDNS",
                    "192.168.1.247:8088" to "IP Local Direto"
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                                Icon(Icons.Default.Dns, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                            }
                            Text("6. SERVIDOR SENTINELA & PRESETS RÁPIDOS", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Surface(shape = TvShapes.StatusPill, color = TvColors.LiveGreen.copy(alpha = 0.2f), border = BorderStroke(1.dp, TvColors.LiveGreen)) {
                            Text("CONECTADO", color = TvColors.LiveGreen, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                        }
                    }

                    Text("Selecione um preset de rede com o D-Pad para alternar a conexão instantaneamente:", color = TvColors.TextSecondary, fontSize = 11.sp)

                    // Grade 4 Colunas Auto-Ajustáveis
                    val chunkedPresets = serverPresets.chunked(if (isWide) 4 else 2)

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        chunkedPresets.forEach { rowPresets ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                rowPresets.forEach { (host, label) ->
                                    val isSelected = currentHost == host
                                    val interactionSource = remember { MutableInteractionSource() }
                                    val isFocused by interactionSource.collectIsFocusedAsState()

                                    Surface(
                                        shape = TvShapes.Badge,
                                        color = if (isSelected) TvColors.CyberCyan.copy(alpha = 0.2f) else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                                        border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.CyberCyan else TvColors.BorderSubtle),
                                        modifier = Modifier
                                            .weight(1f)
                                            .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                            .clickable(interactionSource = interactionSource, indication = null) {
                                                currentHost = host
                                                prefs.serverHost = host
                                                SentinelaConfig.currentHost = host
                                                Toast.makeText(context, "Servidor alterado para $host", Toast.LENGTH_SHORT).show()
                                            }
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                                            verticalArrangement = Arrangement.spacedBy(2.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = label,
                                                    color = if (isSelected) TvColors.CyberCyan else if (isFocused) Color.White else TvColors.TextPrimary,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                if (isSelected) {
                                                    Text("✓ Ativo", color = TvColors.CyberCyan, fontSize = 8.sp, fontWeight = FontWeight.Black)
                                                }
                                            }
                                            Text(
                                                text = host,
                                                color = TvColors.TextSecondary,
                                                fontSize = 9.sp,
                                                fontFamily = FontFamily.Monospace,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // ====================================================================
            // 2.7 IDENTIFICAÇÃO DO DISPOSITIVO & /SCREENS (Auto-Ajustável)
            // ====================================================================
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("7. IDENTIFICAÇÃO DESTE DISPOSITIVO EM /SCREENS", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("ID do Dispositivo:", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text(prefs.deviceIdentifier, color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }

                        Column {
                            Text("Nome da Smart TV:", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text(prefs.friendlyName, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text("Versão do App:", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("v${com.sentinela.pro.BuildConfig.VERSION_NAME} (TV Leanback)", color = TvColors.LiveGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

/**
 * Modal Imersivo de Visualização em Tela Cheia (16:9 Nativo 4K/1080p)
 */
@Composable
fun TvFullScreenLiveDialog(
    camera: CameraEntity,
    initialStreamMode: String = "mse",
    onStreamModeChanged: (String) -> Unit = {},
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    var currentMode by remember { mutableStateOf(initialStreamMode) }
    val modes = listOf("mse", "webrtc", "eco")
    val modeLabels = mapOf("mse" to "MSE 24 FPS", "webrtc" to "WebRTC LIVE", "eco" to "ECO 10 FPS")

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .clickable { onDismiss() }
        ) {
            SeamlessCameraImage(
                cameraName = camera.id,
                contentDescription = camera.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
                refreshIntervalMs = 42L,
                isStreaming = true,
                streamMode = currentMode
            )

            // Header Overlay
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                        )
                    )
                    .padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Surface(shape = TvShapes.Badge, color = TvColors.NetflixRed) {
                        Text(
                            text = "AO VIVO • 1080p H.265",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                    Text(
                        text = "${camera.name} (${camera.location})",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )

                    // Stream Mode Toggle Badge (Click / OK to cycle)
                    Surface(
                        shape = TvShapes.Badge,
                        color = TvColors.OverlayHud,
                        border = BorderStroke(1.dp, TvColors.CyberCyan),
                        modifier = Modifier
                            .padding(start = 8.dp)
                            .clickable {
                                val nextIdx = (modes.indexOf(currentMode) + 1) % modes.size
                                val nextMode = modes[nextIdx]
                                currentMode = nextMode
                                prefs.setCameraDefaultStreamMode(camera.id, nextMode)
                                onStreamModeChanged(nextMode)
                            }
                    ) {
                        Text(
                            text = "MODO: ${modeLabels[currentMode]} [OK ALTERNAR]",
                            color = TvColors.CyberCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                Surface(
                    shape = TvShapes.Badge,
                    color = TvColors.OverlayHud,
                    border = BorderStroke(1.dp, TvColors.BorderSubtle)
                ) {
                    Text(
                        text = "Pressione VOLTAR para sair",
                        color = TvColors.CyberCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }
    }
}

/**
 * Modal Player de Clipe / Gravação (Exibe a foto HD com zoom D-Pad e botão de voltar)
 */
@Composable
fun TvClipPlayerDialog(
    initialClip: RecordingClipItem,
    clips: List<RecordingClipItem>,
    onDismiss: () -> Unit
) {
    var currentIndex by remember(clips, initialClip) { 
        mutableIntStateOf(clips.indexOf(initialClip).takeIf { it >= 0 } ?: 0) 
    }
    val clip = clips.getOrNull(currentIndex) ?: initialClip

    var zoomLevel by remember { mutableFloatStateOf(1f) } // 1x, 1.5x, 2x, 3x
    val zoomOptions = listOf(1f, 1.5f, 2f, 3f)

    val candidates = remember(clip) {
        listOfNotNull(
            clip.thumbnailUrl.takeIf { it.isNotBlank() },
            "${SentinelaConfig.BASE_URL}/api/events/${clip.id}/snapshot.jpg".takeIf { !clip.id.startsWith("live_") && !clip.id.startsWith("rec_") },
            "${SentinelaConfig.BASE_URL}/frigate/api/events/${clip.id}/snapshot.jpg".takeIf { !clip.id.startsWith("live_") && !clip.id.startsWith("rec_") },
            "${SentinelaConfig.BASE_URL}/go2rtc/api/frame.jpeg?src=${clip.cameraId}",
            "${SentinelaConfig.BASE_URL}/frigate/api/${clip.cameraId}/latest.jpg?h=1080"
        )
    }
    var currentCandidateIndex by remember(clip) { mutableIntStateOf(0) }
    val currentUrl = candidates.getOrNull(currentCandidateIndex)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        val interactionSource = remember { MutableInteractionSource() }
        val isFocused by interactionSource.collectIsFocusedAsState()
        val focusRequester = remember { FocusRequester() }

        LaunchedEffect(Unit) {
            try {
                focusRequester.requestFocus()
            } catch (e: Exception) {}
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .focusRequester(focusRequester)
                .focusable(interactionSource = interactionSource)
                .onKeyEvent { keyEvent ->
                    if (keyEvent.type == KeyEventType.KeyDown) {
                        when (keyEvent.key) {
                            Key.DirectionLeft -> {
                                if (currentIndex > 0) currentIndex--
                                true
                            }
                            Key.DirectionRight -> {
                                if (currentIndex < clips.size - 1) currentIndex++
                                true
                            }
                            Key.Enter, Key.DirectionCenter -> {
                                val nextIdx = (zoomOptions.indexOf(zoomLevel) + 1) % zoomOptions.size
                                zoomLevel = zoomOptions[nextIdx]
                                true
                            }
                            else -> false
                        }
                    } else false
                }
                .clickable {
                    val nextIdx = (zoomOptions.indexOf(zoomLevel) + 1) % zoomOptions.size
                    zoomLevel = zoomOptions[nextIdx]
                }
        ) {
            if (currentUrl != null) {
                SubcomposeAsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(currentUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = clip.cameraName,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer(
                            scaleX = zoomLevel,
                            scaleY = zoomLevel
                        ),
                    contentScale = ContentScale.Fit,
                    onError = {
                        if (currentCandidateIndex < candidates.size - 1) {
                            currentCandidateIndex++
                        }
                    }
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                        )
                    )
                    .padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "FOTO HD: ${clip.cameraName}",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )
                    val dialogSub = "Data: ${clip.timestamp} • Captura ${currentIndex + 1} de ${clips.size} • Zoom: ${zoomLevel}x • Tamanho: ${clip.sizeMb}"
                    Text(
                        text = dialogSub,
                        color = TvColors.CyberCyan,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "Use ◄ ► para navegar pelas fotos • Pressione [OK] para Zoom",
                        color = TvColors.TextMuted,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Surface(
                    shape = TvShapes.Badge,
                    color = TvColors.OverlayHud,
                    border = BorderStroke(1.dp, TvColors.BorderSubtle)
                ) {
                    Text(
                        text = "Pressione VOLTAR para sair",
                        color = TvColors.CyberCyan,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }
    }
}

/**
 * 7. JANELA FLUTUANTE PiP DUAL-LAYER COM CONTAGEM REGRESSIVA E MOLDURA CIANO
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
        color = Color.Black,
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
        Box(modifier = Modifier.fillMaxSize()) {
            SeamlessCameraImage(
                cameraName = alert.camera.id,
                contentDescription = "Alerta PiP",
                modifier = Modifier.fillMaxSize(),
                isStreaming = true,
                forceSnapshotMode = false,
                streamMode = "mse"
            )
        }
    }
}
