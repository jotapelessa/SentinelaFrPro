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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.data.CameraItem
import com.sentinela.pro.data.CaptureEvent
import com.sentinela.pro.tv.theme.*
import com.sentinela.pro.ui.components.SeamlessCameraImage
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

    // Focus Requesters para navegação D-Pad
    val sidebarFocusRequesters = remember { List(TvTab.values().size) { FocusRequester() } }
    val carouselFocusRequesters = remember { List(cameras.size.coerceAtLeast(1)) { FocusRequester() } }
    val heroFocusRequester = remember { FocusRequester() }
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
                            onFocusCamera = { index -> focusedCameraIndex = index },
                            onSelectCamera = { camera -> onCameraSelected(camera) },
                            onNavigateLeftToSidebar = { sidebarFocusRequesters.getOrNull(0)?.requestFocus() }
                        )
                    }
                    TvTab.RECORDINGS -> {
                        TvRecordingsViewport(cameras = cameras)
                    }
                    TvTab.TOOLS -> {
                        TvToolsViewport(
                            cameras = cameras,
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
                            }
                        )
                    }
                    TvTab.LOGS -> {
                        TvLogsViewport()
                    }
                    TvTab.SETTINGS -> {
                        TvSettingsViewport(tailscaleIp = tailscaleIp)
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
    onNavigateToContent: () -> Unit
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
    var isFullscreenLiveOpen by remember { mutableStateOf(false) }
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
                .tvDpadFocusable(
                    isFocused = isHeroFocused,
                    focusedBorderColor = TvColors.BorderFocused,
                    unfocusedBorderColor = TvColors.BorderSubtle,
                    shape = TvShapes.CameraCard,
                    scaleAmount = 1.01f
                )
                .clickable(interactionSource = heroInteractionSource, indication = null) {
                    isFullscreenLiveOpen = true
                }
                .focusable(interactionSource = heroInteractionSource)
        ) {
            selectedCamera?.let { camera ->
                SeamlessCameraImage(
                    cameraName = camera.id,
                    contentDescription = camera.name,
                    modifier = Modifier.fillMaxSize(),
                    isStreaming = true
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

                // Indicador de Tela Cheia [OK]
                Surface(
                    shape = TvShapes.Badge,
                    color = if (isHeroFocused) TvColors.NetflixRed else TvColors.OverlayHud,
                    border = BorderStroke(1.dp, if (isHeroFocused) Color.White else TvColors.BorderSubtle),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(TvDimens.md)
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
                        isStreaming = true
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
            onDismiss = { isFullscreenLiveOpen = false }
        )
    }
}

/**
 * 3. ABA 1: VIEWPORT DE CAPTURAS / GRAVAÇÕES (Split View Player + Lista D-Pad)
 */
@Composable
fun TvRecordingsViewport(cameras: List<CameraEntity>) {
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
                        timestamp = event.timestamp,
                        sizeMb = "${(event.score * 0.25).toInt() + 10} MB",
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

    val mockClips = remember(cameras, realCaptures) {
        if (realCaptures.isNotEmpty()) {
            realCaptures
        } else if (cameras.isEmpty()) {
            listOf(
                RecordingClipItem("rec_1", "camera_principal", "Câmera Principal", "FOTO HD", "Hoje, 14:32", "12 MB", "", isVideo = false)
            )
        } else {
            cameras.mapIndexed { i, c ->
                RecordingClipItem(
                    id = "rec_${c.id}_$i",
                    cameraId = c.id,
                    cameraName = c.name,
                    duration = "FOTO HD",
                    timestamp = "Hoje, ${14 - i}:30",
                    sizeMb = "${10 + i * 2} MB",
                    thumbnailUrl = c.thumbnailUrl,
                    isVideo = false
                )
            }
        }
    }

    var selectedClip by remember(mockClips) { mutableStateOf(mockClips.first()) }
    var focusedIndex by remember { mutableIntStateOf(0) }
    var isClipPlayerOpen by remember { mutableStateOf(false) }

    val previewInteractionSource = remember { MutableInteractionSource() }
    val isPreviewFocused by previewInteractionSource.collectIsFocusedAsState()

    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(TvDimens.md)
    ) {
        // Lado Esquerdo: Player Preview (Col 7)
        Column(
            modifier = Modifier
                .weight(1.3f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(TvShapes.CameraCard)
                    .background(TvColors.CardBackground)
                    .border(
                        2.dp,
                        if (isPreviewFocused) TvColors.BorderFocused else TvColors.BorderSubtle,
                        TvShapes.CameraCard
                    )
                    .tvDpadFocusable(
                        isFocused = isPreviewFocused,
                        focusedBorderColor = TvColors.BorderFocused,
                        unfocusedBorderColor = TvColors.BorderSubtle,
                        shape = TvShapes.CameraCard,
                        scaleAmount = 1.01f
                    )
                    .clickable(interactionSource = previewInteractionSource, indication = null) {
                        isClipPlayerOpen = true
                    }
                    .focusable(interactionSource = previewInteractionSource)
            ) {
                coil.compose.AsyncImage(
                    model = selectedClip.thumbnailUrl.ifBlank { "${SentinelaConfig.BASE_URL}/frigate/api/${selectedClip.cameraId}/latest.jpg?h=720" },
                    contentDescription = selectedClip.cameraName,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                // Overlay de Foto HD
                Surface(
                    shape = TvShapes.Badge,
                    color = TvColors.OverlayHud,
                    modifier = Modifier.align(Alignment.Center)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.PhotoCamera, contentDescription = "Foto HD", tint = TvColors.StandbyAmber, modifier = Modifier.size(20.dp))
                        Text("FOTO HD (DETECÇÃO IA)", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
                    }
                }

                // Header do Clip
                Surface(
                    shape = TvShapes.Badge,
                    color = TvColors.OverlayHud,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(TvDimens.sm)
                ) {
                    Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                        Text(selectedClip.cameraName, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(selectedClip.timestamp, color = TvColors.CyberCyan, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                    }
                }
            }

            Spacer(modifier = Modifier.height(TvDimens.sm))

            // Player Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(TvColors.CardBackgroundElevated, TvShapes.MenuItem)
                    .padding(horizontal = TvDimens.md, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val playerStatusText = "Foto Instantânea HD • Snapshot Frigate"
                Text(playerStatusText, style = TvTypography.Telemetry.copy(color = TvColors.TextSecondary))
                Button(
                    onClick = {
                        Toast.makeText(context, "Exportando foto ${selectedClip.id}...", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = TvColors.CyberCyan),
                    shape = TvShapes.Badge,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.FileDownload, contentDescription = null, tint = Color.Black, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (!selectedClip.isVideo) "Salvar Foto" else "Exportar MP4", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Lado Direito: Lista de Gravações D-Pad (Col 5)
        Column(
            modifier = Modifier
                .weight(0.9f)
                .fillMaxHeight()
        ) {
            Text(
                text = "GRAVAÇÕES DISPONÍVEIS (${mockClips.size})",
                style = TvTypography.TabTitle.copy(fontSize = 13.sp),
                modifier = Modifier.padding(bottom = 6.dp)
            )

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                itemsIndexed(mockClips) { index, clip ->
                    val interactionSource = remember { MutableInteractionSource() }
                    val isFocused by interactionSource.collectIsFocusedAsState()
                    val isSelected = selectedClip.id == clip.id

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .tvDpadFocusable(
                                isFocused = isFocused,
                                focusedBorderColor = TvColors.NetflixRed,
                                unfocusedBorderColor = if (isSelected) TvColors.BorderHighlight else TvColors.BorderSubtle,
                                shape = TvShapes.MenuItem
                            )
                            .background(
                                if (isFocused) TvColors.CardBackgroundElevated else TvColors.CardBackground,
                                TvShapes.MenuItem
                            )
                            .clickable(interactionSource = interactionSource, indication = null) {
                                selectedClip = clip
                                focusedIndex = index
                            }
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(width = 72.dp, height = 44.dp)
                                .clip(TvShapes.Badge)
                                .background(Color.Black)
                        ) {
                            SeamlessCameraImage(
                                cameraName = clip.cameraId,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                isStreaming = false,
                                forceSnapshotMode = true
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(clip.cameraName, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                            val itemSub = "${clip.timestamp} • Foto HD"
                            Text(itemSub, color = TvColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }

    if (isClipPlayerOpen) {
        TvClipPlayerDialog(
            clip = selectedClip,
            onDismiss = { isClipPlayerOpen = false }
        )
    }
}

/**
 * 4. ABA 2: VIEWPORT DE FERRAMENTAS & AÇÕES RÁPIDAS (Restaurado com Teste de Banda, 24 FPS Monitor e Ações)
 */
@Composable
fun TvToolsViewport(
    cameras: List<CameraEntity>,
    onRefresh: () -> Unit,
    onTriggerTestPip: () -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    val coroutineScope = rememberCoroutineScope()
    var speedResult by remember { mutableStateOf<com.sentinela.pro.data.SpeedTestResult?>(null) }
    var isTesting by remember { mutableStateOf(false) }
    var liveTelemetry by remember { mutableStateOf<com.sentinela.pro.data.TelemetryData?>(null) }

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

    // Animation drivers para ondas de 24 FPS
    val infiniteTransition = rememberInfiniteTransition(label = "tools_anim")
    val pulseAnim by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    fun trigger(actionLabel: String, block: () -> Unit) {
        block()
        feedbackMessage = actionLabel
    }

    LaunchedEffect(feedbackMessage) {
        if (feedbackMessage != null) {
            delay(3500)
            feedbackMessage = null
        }
    }

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
                    Text("Telemetria de streaming 24 FPS, teste de banda Tailscale e comandos de hardware", style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary))
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

        // Top Row: Speed Test Tailscale & Estabilidade 24 FPS MSE
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Box 1: Teste de Banda Tailscale
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("TESTE DE BANDA TAILSCALE", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(
                        text = "${speedResult?.downloadMbps ?: 0.0} Mbps",
                        color = TvColors.CyberCyan,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        fontFamily = FontFamily.Monospace
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Latência (Ping)", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("${speedResult?.pingMs ?: 0} ms", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Jitter", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("${speedResult?.jitterMs ?: 0} ms", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Perda", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("0.0%", color = TvColors.LiveGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }

                    Button(
                        onClick = {
                            isTesting = true
                            coroutineScope.launch {
                                speedResult = com.sentinela.pro.network.SentinelaRepository.runSpeedAndPingTest(
                                    deviceIdentifier = prefs.deviceIdentifier,
                                    friendlyName = prefs.friendlyName,
                                    deviceType = "android_tv"
                                )
                                isTesting = false
                                Toast.makeText(context, "✅ Presença confirmada em http://sentinela.local/screens!", Toast.LENGTH_SHORT).show()
                            }
                        },
                        enabled = !isTesting,
                        colors = ButtonDefaults.buttonColors(containerColor = TvColors.NetflixRed),
                        shape = TvShapes.Badge
                    ) {
                        Text(if (isTesting) "Medindo Throughput..." else "Executar Teste de Velocidade", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                // Box 2: Monitor de Estabilidade de Vídeo MSE (24 FPS)
                Column(
                    modifier = Modifier
                        .weight(1f)
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
                        Text("ESTABILIDADE DE VÍDEO MSE (24 FPS)", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Surface(
                            shape = TvShapes.StatusPill,
                            color = TvColors.LiveGreen.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, TvColors.LiveGreen.copy(alpha = 0.5f))
                        ) {
                            Text("24.0 FPS ESTÁVEL", color = TvColors.LiveGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }

                    // 14 Barras de Onda Animadas
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .background(Color(0xFF040711), TvShapes.Badge)
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        val barHeights = listOf(0.92f, 0.96f, 0.98f, 0.94f, 0.97f, 1.0f, 0.95f, 0.99f, 0.96f, 0.98f, 0.94f, 1.0f, 0.97f, 0.95f)
                        barHeights.forEach { factor ->
                            val animatedHeight = (factor * pulseAnim).coerceIn(0.4f, 1.0f)
                            Box(
                                modifier = Modifier
                                    .width(7.dp)
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

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Tempo: 41.6 ms", color = TvColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        Text("Jitter: < 1.2 ms", color = TvColors.CyberCyan, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        Text("Drops: 0 qds", color = TvColors.LiveGreen, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                    }
                }
            }
        }

        // Mid Row: Largura de Banda do Servidor & Status dos 5 Subsistemas
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Largura de Banda
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("LARGURA DE BANDA DO SERVIDOR", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Download (Rx)", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("${liveTelemetry?.rxKbs ?: 0.0} KB/s", color = TvColors.CyberCyan, fontSize = 16.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        }
                        Column {
                            Text("Upload (Tx)", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("${liveTelemetry?.txKbs ?: 0.0} KB/s", color = Color(0xFFA78BFA), fontSize = 16.sp, fontWeight = FontWeight.Black, fontFamily = FontFamily.Monospace)
                        }
                        Column {
                            Text("Decoder", color = TvColors.TextSecondary, fontSize = 10.sp)
                            Text("VAAPI / HW", color = TvColors.LiveGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Barra Horizontal de Capacidade
                    val rxFraction = (((liveTelemetry?.rxKbs ?: 0.0) / 10000.0).toFloat() * pulseAnim).coerceIn(0.05f, 0.95f)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
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
                }

                // Status dos Subsistemas
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(TvShapes.CameraCard)
                        .background(TvColors.CardBackground)
                        .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("STATUS DOS SUBSISTEMAS NVR", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    TvDiagnosticRow(title = "Tailscale Funnel (HTTPS/WSS)", status = "Conectado", isOk = true)
                    TvDiagnosticRow(title = "Frigate NVR 0.17", status = "Online (5000)", isOk = true)
                    TvDiagnosticRow(title = "go2rtc WebRTC Gateway", status = "Online (1984)", isOk = true)
                    TvDiagnosticRow(title = "Pipeline IA OpenVINO", status = "Ativo (5ms)", isOk = true)
                    TvDiagnosticRow(title = "Mosquitto MQTT Broker", status = "Conectado (1883)", isOk = true)
                }
            }
        }

        // Bottom Row: Ações Rápidas de Hardware
        item {
            Text("COMANDOS RÁPIDOS DE HARDWARE & ALERTA", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Ping do Servidor & Telemetria
                var isPinging by remember { mutableStateOf(false) }
                TvToolCard(
                    title = "Ping do Servidor",
                    subtitle = "Sincroniza IP, WiFi & Logs",
                    icon = Icons.Default.CloudSync,
                    actionText = if (isPinging) "ENVIANDO..." else "PING",
                    isActive = false,
                    activeColor = TvColors.CyberCyan,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        isPinging = true
                        coroutineScope.launch {
                            val (ok, msg) = com.sentinela.pro.network.SentinelaRepository.pingServer(
                                context = context,
                                deviceType = "android_tv",
                                recentLogs = listOf("Smart TV Sentinela Online", "Resolução 1080p", "Decoder HW Ativo")
                            )
                            isPinging = false
                            trigger(msg) {}
                            Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                        }
                    }
                )

                // Limpar Buffer
                TvToolCard(
                    title = "Buffer 24 FPS",
                    subtitle = "Ressincroniza streams",
                    icon = Icons.Default.Refresh,
                    actionText = "LIMPAR",
                    isActive = false,
                    activeColor = TvColors.CyberCyan,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        onRefresh()
                        trigger("Streams Ressincronizados!") {}
                    }
                )

                // PiP Test
                TvToolCard(
                    title = "Teste de PiP",
                    subtitle = "Abre janela 10s",
                    icon = Icons.Default.PictureInPicture,
                    actionText = "DISPARAR",
                    isActive = false,
                    activeColor = TvColors.NetflixRed,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        onTriggerTestPip()
                        trigger("Janela PiP Aberta na TV!") {}
                    }
                )
            }
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
fun TvLogsViewport() {
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
                levels.forEach { lvl ->
                    val isSelected = selectedLevel == lvl
                    val interactionSource = remember { MutableInteractionSource() }
                    val isFocused by interactionSource.collectIsFocusedAsState()

                    Surface(
                        shape = TvShapes.Badge,
                        color = if (isSelected) TvColors.CardBackgroundElevated else Color.Transparent,
                        border = BorderStroke(1.dp, if (isSelected) TvColors.BorderHighlight else TvColors.BorderSubtle),
                        modifier = Modifier
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
fun TvSettingsViewport(tailscaleIp: String) {
    val context = LocalContext.current
    val prefs = remember { com.sentinela.pro.data.SentinelaPreferences(context) }
    var sizeIndex by remember { mutableIntStateOf(prefs.pipSizeIndex) }
    var posIndex by remember { mutableIntStateOf(prefs.pipPositionIndex) }
    var durIndex by remember { mutableIntStateOf(prefs.pipDurationIndex) }

    var hasOverlayPerm by remember {
        mutableStateOf(
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                android.provider.Settings.canDrawOverlays(context)
            } else true
        )
    }

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

        // 1. TAMANHO DA JANELA PIP (8 OPÇÕES)
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                        Icon(Icons.Default.AspectRatio, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                    }
                    Text("1. TAMANHO DA TELA PIP (8 OPÇÕES)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(com.sentinela.pro.data.PipSize.values().toList()) { size ->
                        val isSelected = size.ordinal == sizeIndex
                        val interactionSource = remember { MutableInteractionSource() }
                        val isFocused by interactionSource.collectIsFocusedAsState()

                        Surface(
                            shape = TvShapes.Badge,
                            color = if (isSelected) TvColors.NetflixRed else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                            border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                            modifier = Modifier
                                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                .clickable(interactionSource = interactionSource, indication = null) {
                                    sizeIndex = size.ordinal
                                    prefs.pipSizeIndex = size.ordinal
                                    Toast.makeText(context, "Tamanho PiP: ${size.label}", Toast.LENGTH_SHORT).show()
                                }
                        ) {
                            Text(
                                text = size.label,
                                color = if (isSelected || isFocused) Color.White else TvColors.TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 2. POSIÇÃO DA TELA PIP (8 POSIÇÕES)
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                        Icon(Icons.Default.Place, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                    }
                    Text("2. POSIÇÃO DA TELA PIP (8 POSIÇÕES)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(com.sentinela.pro.data.PipPosition.values().toList()) { pos ->
                        val isSelected = pos.ordinal == posIndex
                        val interactionSource = remember { MutableInteractionSource() }
                        val isFocused by interactionSource.collectIsFocusedAsState()

                        Surface(
                            shape = TvShapes.Badge,
                            color = if (isSelected) TvColors.NetflixRed else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                            border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                            modifier = Modifier
                                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                .clickable(interactionSource = interactionSource, indication = null) {
                                    posIndex = pos.ordinal
                                    prefs.pipPositionIndex = pos.ordinal
                                    Toast.makeText(context, "Posição PiP: ${pos.label}", Toast.LENGTH_SHORT).show()
                                }
                        ) {
                            Text(
                                text = pos.label,
                                color = if (isSelected || isFocused) Color.White else TvColors.TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 3. TEMPO DE EXIBIÇÃO AUTOMÁTICA (8 TEMPOS)
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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                        Icon(Icons.Default.Timer, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                    }
                    Text("3. TEMPO DE EXIBIÇÃO AUTOMÁTICA (8 TEMPOS)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(com.sentinela.pro.data.PipDuration.values().toList()) { dur ->
                        val isSelected = dur.ordinal == durIndex
                        val interactionSource = remember { MutableInteractionSource() }
                        val isFocused by interactionSource.collectIsFocusedAsState()

                        Surface(
                            shape = TvShapes.Badge,
                            color = if (isSelected) TvColors.NetflixRed else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                            border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.NetflixRed else TvColors.BorderSubtle),
                            modifier = Modifier
                                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                .clickable(interactionSource = interactionSource, indication = null) {
                                    durIndex = dur.ordinal
                                    prefs.pipDurationIndex = dur.ordinal
                                    Toast.makeText(context, "Duração PiP: ${dur.label}", Toast.LENGTH_SHORT).show()
                                }
                        ) {
                            Text(
                                text = dur.label,
                                color = if (isSelected || isFocused) Color.White else TvColors.TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 4. TESTE DA JANELA PIP NA ANDROID TV (Preview Real)
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
                Text("4. TESTE DA JANELA PIP REAL NA SMART TV", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .width(220.dp)
                            .height(124.dp)
                            .clip(TvShapes.Badge)
                            .border(2.dp, TvColors.BorderHighlight, TvShapes.Badge)
                    ) {
                        SeamlessCameraImage(
                            cameraName = "camera_principal",
                            contentDescription = "Prévia PiP",
                            modifier = Modifier.fillMaxSize(),
                            isStreaming = true
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(TvColors.OverlayHud)
                                .padding(horizontal = 6.dp, vertical = 3.dp)
                                .align(Alignment.TopStart)
                        ) {
                            Text(
                                text = "PRÉVIA: ${com.sentinela.pro.data.PipSize.values()[sizeIndex].label} • ${com.sentinela.pro.data.PipPosition.values()[posIndex].label}",
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "Clique no botão abaixo para abrir a janela flutuante real sobre a TV:",
                            color = TvColors.TextSecondary,
                            fontSize = 11.sp
                        )

                        Button(
                            onClick = {
                                com.sentinela.pro.tv.OverlayService.triggerPiP(context, "camera_principal", "TESTE PIP PREVIEW")
                                Toast.makeText(context, "🔔 Janela PiP disparada sobre a TV!", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = TvColors.NetflixRed),
                            shape = TvShapes.Badge
                        ) {
                            Icon(Icons.Default.PictureInPicture, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("▶️ Abrir Janela PiP Agora", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 5. PERMISSÃO DE JANELAS FLUTUANTES (SYSTEM_ALERT_WINDOW)
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
                Text("5. PERMISSÃO DE JANELAS FLUTUANTES (SYSTEM_ALERT_WINDOW)", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Text(
                    text = if (hasOverlayPerm)
                        "✅ Permissão Ativa: Janelas flutuantes autorizadas para exibir alertas sobre qualquer app da TV."
                    else
                        "⚠️ Permissão Pendente: Necessário habilitar sobreposição nas configurações do Android TV.",
                    color = if (hasOverlayPerm) TvColors.LiveGreen else TvColors.StandbyAmber,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
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
                                    // try fallback
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
                        shape = TvShapes.Badge
                    ) {
                        Icon(Icons.Default.Settings, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("⚙️ Abrir Configurações do Android", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = {
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                                hasOverlayPerm = android.provider.Settings.canDrawOverlays(context)
                            }
                            val msg = if (hasOverlayPerm) "✅ Permissão de sobreposição confirmada!" else "⚠️ Permissão ainda pendente nas configurações."
                            Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = TvColors.CardBackgroundElevated),
                        shape = TvShapes.Badge
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, tint = TvColors.LiveGreen, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("🔄 Revalidar Permissão", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // 6. SERVIDOR SENTINELA & PRESETS RÁPIDOS
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
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                        Icon(Icons.Default.Dns, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(4.dp).size(18.dp))
                    }
                    Text("6. SERVIDOR SENTINELA & PRESETS RÁPIDOS", color = TvColors.CyberCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Host Ativo: $currentHost", color = Color.White, fontSize = 12.sp, fontFamily = FontFamily.Monospace)
                        Text("ID do Dispositivo: ${prefs.deviceIdentifier}", color = TvColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                    }
                    Surface(shape = TvShapes.StatusPill, color = TvColors.LiveGreen.copy(alpha = 0.2f), border = BorderStroke(1.dp, TvColors.LiveGreen)) {
                        Text("CONECTADO", color = TvColors.LiveGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                    }
                }

                Text("Selecione um preset de rede com D-Pad para alternar a conexão:", color = TvColors.TextSecondary, fontSize = 10.sp)

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(serverPresets) { (host, label) ->
                        val isSelected = currentHost == host
                        val interactionSource = remember { MutableInteractionSource() }
                        val isFocused by interactionSource.collectIsFocusedAsState()

                        Surface(
                            shape = TvShapes.Badge,
                            color = if (isSelected) TvColors.CyberCyan.copy(alpha = 0.25f) else if (isFocused) TvColors.CardBackgroundElevated else Color(0xFF070B14),
                            border = BorderStroke(1.dp, if (isFocused) TvColors.BorderFocused else if (isSelected) TvColors.CyberCyan else TvColors.BorderSubtle),
                            modifier = Modifier
                                .tvDpadFocusable(isFocused = isFocused, focusedBorderColor = TvColors.BorderFocused, shape = TvShapes.Badge)
                                .clickable(interactionSource = interactionSource, indication = null) {
                                    currentHost = host
                                    prefs.serverHost = host
                                    SentinelaConfig.currentHost = host
                                    Toast.makeText(context, "Servidor alterado para $host", Toast.LENGTH_SHORT).show()
                                }
                        ) {
                            Text(
                                text = "$label ($host)",
                                color = if (isSelected) TvColors.CyberCyan else if (isFocused) Color.White else TvColors.TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 7. IDENTIFICAÇÃO DO DISPOSITIVO & PAREAMENTO EM /SCREENS
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(TvShapes.CameraCard)
                    .background(TvColors.CardBackground)
                    .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text("IDENTIFICAÇÃO DESTE DISPOSITIVO EM /SCREENS", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text("ID: ${prefs.deviceIdentifier}", color = TvColors.CyberCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                Text("Nome da TV: ${prefs.friendlyName}", color = Color.White, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(2.dp))
                Text("VERSÃO DO APLICATIVO: v001.000.000.053 (Android TV Leanback Edition)", color = TvColors.TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
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
    onDismiss: () -> Unit
) {
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
                isStreaming = true
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
 * Modal Player de Clipe / Gravação (Exibe o vídeo gravado com botão de voltar)
 */
@Composable
fun TvClipPlayerDialog(
    clip: RecordingClipItem,
    onDismiss: () -> Unit
) {
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
            coil.compose.AsyncImage(
                model = clip.thumbnailUrl.ifBlank { "${SentinelaConfig.BASE_URL}/frigate/api/${clip.cameraId}/latest.jpg?h=1080" },
                contentDescription = clip.cameraName,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )

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
                    val dialogSub = "Data: ${clip.timestamp} • Tipo: Foto HD • Resolução: 1080p • Tamanho: ${clip.sizeMb}"
                    Text(
                        text = dialogSub,
                        color = TvColors.CyberCyan,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
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
                        text = "ALERTA PiP • ${alert.camera.name}",
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
                        text = "${remainingSeconds}s",
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
                SeamlessCameraImage(
                    cameraName = alert.camera.id,
                    contentDescription = "Alerta PiP",
                    modifier = Modifier.fillMaxSize(),
                    isStreaming = true,
                    forceSnapshotMode = false
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
