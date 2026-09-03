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
import coil.compose.AsyncImage
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.data.CameraItem
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
}

/**
 * 3. ABA 1: VIEWPORT DE CAPTURAS / GRAVAÇÕES (Split View Player + Lista D-Pad)
 */
@Composable
fun TvRecordingsViewport(cameras: List<CameraEntity>) {
    val context = LocalContext.current
    val mockClips = remember(cameras) {
        if (cameras.isEmpty()) {
            listOf(
                RecordingClipItem("rec_1", "cam1", "Câmera Portaria", "02:15", "Hoje, 14:32", "42 MB", "")
            )
        } else {
            cameras.mapIndexed { i, c ->
                RecordingClipItem(
                    id = "rec_${c.id}_$i",
                    cameraId = c.id,
                    cameraName = c.name,
                    duration = "0${i + 1}:${25 + i * 10}",
                    timestamp = "Hoje, ${14 - i}:30",
                    sizeMb = "${35 + i * 12} MB",
                    thumbnailUrl = c.thumbnailUrl
                )
            }
        }
    }

    var selectedClip by remember { mutableStateOf(mockClips.first()) }
    var focusedIndex by remember { mutableIntStateOf(0) }

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
                    .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            ) {
                SeamlessCameraImage(
                    cameraName = selectedClip.cameraId,
                    contentDescription = selectedClip.cameraName,
                    modifier = Modifier.fillMaxSize(),
                    isStreaming = true
                )

                // Overlay de Play
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.35f)),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        shape = CircleShape,
                        color = TvColors.NetflixRed,
                        modifier = Modifier.size(56.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = Color.White, modifier = Modifier.size(32.dp))
                        }
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
                Text("01:10 / ${selectedClip.duration} • H.265 Smart", style = TvTypography.Telemetry.copy(color = TvColors.TextSecondary))
                Button(
                    onClick = {
                        Toast.makeText(context, "Exportando gravação ${selectedClip.id}.mp4...", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = TvColors.CyberCyan),
                    shape = TvShapes.Badge,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.FileDownload, contentDescription = null, tint = Color.Black, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Exportar MP4", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
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
                            Text("${clip.timestamp} • ${clip.duration}", color = TvColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }
}

/**
 * 4. ABA 2: VIEWPORT DE FERRAMENTAS & AÇÕES RÁPIDAS (6 Cards D-Pad com Ação Real)
 */
@Composable
fun TvToolsViewport(
    cameras: List<CameraEntity>,
    onRefresh: () -> Unit,
    onTriggerTestPip: () -> Unit
) {
    val context = LocalContext.current
    var feedbackMessage by remember { mutableStateOf<String?>(null) }
    var isSirenActive by remember { mutableStateOf(false) }
    var isGateOpen by remember { mutableStateOf(false) }
    var isArmed by remember { mutableStateOf(true) }

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

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Header com Banner de Feedback
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Ferramentas & Ações Rápidas NVR", style = TvTypography.TabTitle.copy(fontSize = 18.sp))
                Text("Comandos remotos de hardware, relés e telemetria", style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary))
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

        Spacer(modifier = Modifier.height(TvDimens.sm))

        // Grid 3x2 de Ferramentas D-Pad
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Card 1: Sirene de Pânico
                TvToolCard(
                    title = "Sirene de Pânico Geral",
                    subtitle = if (isSirenActive) "EMITINDO 110dB EM TODAS AS ZONAS" else "Dispara alerta sonoro e estrobos",
                    icon = Icons.Default.Campaign,
                    actionText = if (isSirenActive) "DESATIVAR ALARME" else "DISPARAR SIRENE",
                    isActive = isSirenActive,
                    activeColor = TvColors.AlertCrimson,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = {
                        isSirenActive = !isSirenActive
                        trigger(if (isSirenActive) "Sirene de Pânico Disparada!" else "Sirene Desativada") {}
                    }
                )

                // Card 2: Relé Portão
                TvToolCard(
                    title = "Relé do Portão / Eclusa",
                    subtitle = if (isGateOpen) "RELÉ ABERTO (12V Ativo)" else "Pulso seco para liberação de acesso",
                    icon = Icons.Default.Key,
                    actionText = if (isGateOpen) "FECHAR PORTÃO" else "ABRIR PORTÃO",
                    isActive = isGateOpen,
                    activeColor = TvColors.LiveGreen,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = {
                        isGateOpen = !isGateOpen
                        trigger(if (isGateOpen) "Pulso Relé Portão Enviado!" else "Portão Fechado") {}
                    }
                )

                // Card 3: Limpar Buffer RTSP
                TvToolCard(
                    title = "Limpar Buffer RTSP",
                    subtitle = "Ressincroniza streams 24 FPS e zera latência",
                    icon = Icons.Default.Refresh,
                    actionText = "RESSINCRONIZAR 24 FPS",
                    isActive = false,
                    activeColor = TvColors.CyberCyan,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = {
                        onRefresh()
                        trigger("Buffer RTSP Zerado e Streams Ressincronizados!") {}
                    }
                )
            }

            Row(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Card 4: Diagnóstico Tailscale
                TvToolCard(
                    title = "Diagnóstico Tailscale Mesh",
                    subtitle = "Ping: 14ms • Gateway 100.93.129.91",
                    icon = Icons.Default.NetworkCheck,
                    actionText = "TESTAR LATÊNCIA",
                    isActive = false,
                    activeColor = TvColors.LiveGreen,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = {
                        trigger("Ping Tailscale: 14ms (Excelente)") {}
                    }
                )

                // Card 5: Armar/Desarmar IA
                TvToolCard(
                    title = "Proteção Perimetral IA",
                    subtitle = if (isArmed) "ARMADO • Detecção Ativa 24h" else "DESARMADO • Gravação Normal",
                    icon = Icons.Default.Shield,
                    actionText = if (isArmed) "DESARMAR IA" else "ARMAR PERÍMETRO",
                    isActive = isArmed,
                    activeColor = TvColors.CyberCyan,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = {
                        isArmed = !isArmed
                        trigger(if (isArmed) "Proteção IA Armada!" else "Proteção IA Desarmada") {}
                    }
                )

                // Card 6: Testar PiP Flutuante
                TvToolCard(
                    title = "Disparar Teste de PiP",
                    subtitle = "Abre janela flutuante com contagem de 10s",
                    icon = Icons.Default.PictureInPicture,
                    actionText = "DISPARAR PIP",
                    isActive = false,
                    activeColor = TvColors.NetflixRed,
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    onClick = {
                        onTriggerTestPip()
                        trigger("Alerta PiP Disparado na TV!") {}
                    }
                )
            }
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
            .padding(14.dp),
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
                    modifier = Modifier.padding(6.dp).size(20.dp)
                )
            }
            if (isActive) {
                Surface(
                    shape = TvShapes.StatusPill,
                    color = activeColor
                ) {
                    Text("ATIVO", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
            }
        }

        Column {
            Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = TvColors.TextSecondary, fontSize = 10.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }

        Text("[OK] $actionText", color = TvColors.CyberCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
    }
}

/**
 * 5. ABA 3: VIEWPORT DE AUDITORIA & LOGS (Terminal Monospace em Tempo Real)
 */
@Composable
fun TvLogsViewport() {
    var selectedLevel by remember { mutableStateOf("TODOS") }
    val levels = listOf("TODOS", "CRITICAL", "SECURITY", "INFO")

    val mockLogs = remember {
        listOf(
            LogEntryItem("1", "15:10:42.120", "SECURITY", "IA-DETECTOR", "Pessoa detectada na Zona Perimetral (Conf: 96%)"),
            LogEntryItem("2", "15:09:18.040", "INFO", "GO2RTC", "Stream WebRTC conectado via Tailscale (Latência: 18ms)"),
            LogEntryItem("3", "15:05:00.800", "CRITICAL", "DOOR-SENSOR", "Sensor do Portão acionado sem autorização"),
            LogEntryItem("4", "15:00:12.300", "INFO", "NVR-DAEMON", "Healthcheck geral do sistema OK • CPU 14% • Temp 48°C"),
            LogEntryItem("5", "14:52:45.900", "SECURITY", "AUTH-GUARD", "Smartphone Moto G54 autenticado com privilégios MASTER"),
            LogEntryItem("6", "14:40:10.110", "INFO", "MQTT-BROKER", "Telemetria de 24 FPS sincronizada com todas as Smart TVs")
        )
    }

    val filteredLogs = remember(selectedLevel) {
        if (selectedLevel == "TODOS") mockLogs else mockLogs.filter { it.level == selectedLevel }
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Header + Filtros
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Auditoria & Logs de Segurança do NVR", style = TvTypography.TabTitle.copy(fontSize = 18.sp))
                Text("Eventos de IA perimetral, conexões Tailscale e telemetria", style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary))
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
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
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(TvDimens.sm))

        // Terminal Container
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(TvShapes.CameraCard)
                .background(Color(0xFF040711))
                .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
                .padding(TvDimens.md)
        ) {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredLogs) { log ->
                    val badgeColor = when (log.level) {
                        "CRITICAL" -> TvColors.AlertCrimson
                        "SECURITY" -> TvColors.CyberCyan
                        else -> TvColors.LiveGreen
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(TvColors.CardBackground.copy(alpha = 0.6f), TvShapes.Badge)
                            .border(1.dp, TvColors.BorderSubtle.copy(alpha = 0.5f), TvShapes.Badge)
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(log.timestamp, color = TvColors.TextSecondary, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        Surface(
                            shape = TvShapes.Badge,
                            color = badgeColor.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, badgeColor.copy(alpha = 0.6f))
                        ) {
                            Text(log.level, color = badgeColor, fontSize = 8.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                        }
                        Text("[${log.source}]", color = TvColors.CyberCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Text(log.message, color = Color.White, fontSize = 11.sp, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

/**
 * 6. ABA 4: VIEWPORT DE CONFIGURAÇÕES DA TV & NVR (Seletores D-Pad)
 */
@Composable
fun TvSettingsViewport(tailscaleIp: String) {
    val context = LocalContext.current
    var selectedResolution by remember { mutableStateOf("1080p") }
    var isAudioEnabled by remember { mutableStateOf(true) }
    var isH265Hardware by remember { mutableStateOf(true) }
    var autoPipEnabled by remember { mutableStateOf(true) }
    var pipTimeoutSeconds by remember { mutableIntStateOf(10) }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text("Configurações da Smart TV & NVR", style = TvTypography.TabTitle.copy(fontSize = 18.sp))
            Text("Parâmetros de exibição 10-Foot UI, decodificação H.265 e comportamento D-Pad", style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary))
        }

        Spacer(modifier = Modifier.height(TvDimens.sm))

        // Grid 2x2 de Configurações
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Config 1: Resolução
                TvSettingCard(
                    title = "Resolução de Exibição",
                    subtitle = "Canvas 16:9 Otimizado para Smart TVs",
                    icon = Icons.Default.Tv,
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("4K UHD", "1080p", "720p").forEach { res ->
                            val isSelected = selectedResolution == res
                            Button(
                                onClick = { selectedResolution = res },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isSelected) TvColors.NetflixRed else TvColors.CardBackgroundElevated),
                                shape = TvShapes.Badge,
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(res, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Config 2: Áudio Leanback
                TvSettingCard(
                    title = "Feedback Sonoro D-Pad",
                    subtitle = "Efeitos sonoros de navegação com controle remoto",
                    icon = Icons.Default.VolumeUp,
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    Button(
                        onClick = { isAudioEnabled = !isAudioEnabled },
                        colors = ButtonDefaults.buttonColors(containerColor = if (isAudioEnabled) TvColors.LiveGreen else TvColors.CardBackgroundElevated),
                        shape = TvShapes.Badge
                    ) {
                        Text(if (isAudioEnabled) "ATIVADO" else "MUDO", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Row(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Config 3: Decodificador H.265 Hardware
                TvSettingCard(
                    title = "Decodificador de Vídeo H.265",
                    subtitle = "Aceleração por hardware GPU (MediaCodec)",
                    icon = Icons.Default.Memory,
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    Button(
                        onClick = { isH265Hardware = !isH265Hardware },
                        colors = ButtonDefaults.buttonColors(containerColor = if (isH265Hardware) TvColors.CyberCyan else TvColors.CardBackgroundElevated),
                        shape = TvShapes.Badge
                    ) {
                        Text(if (isH265Hardware) "GPU ATIVADA" else "MODO ECO", color = if (isH265Hardware) Color.Black else Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }

                // Config 4: Timeout PiP
                TvSettingCard(
                    title = "Duração dos Alertas PiP",
                    subtitle = "Tempo de exibição antes do fechamento automático",
                    icon = Icons.Default.Timer,
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(5, 10, 15, 30).forEach { sec ->
                            val isSelected = pipTimeoutSeconds == sec
                            Button(
                                onClick = { pipTimeoutSeconds = sec },
                                colors = ButtonDefaults.buttonColors(containerColor = if (isSelected) TvColors.CyberCyan else TvColors.CardBackgroundElevated),
                                shape = TvShapes.Badge,
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text("${sec}s", color = if (isSelected) Color.Black else Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TvSettingCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Column(
        modifier = modifier
            .background(TvColors.CardBackground, TvShapes.CameraCard)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(14.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Surface(shape = TvShapes.Badge, color = TvColors.CardBackgroundElevated) {
                Icon(imageVector = icon, contentDescription = null, tint = TvColors.CyberCyan, modifier = Modifier.padding(6.dp).size(20.dp))
            }
            Column {
                Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Text(subtitle, color = TvColors.TextSecondary, fontSize = 10.sp)
            }
        }

        Box(modifier = Modifier.padding(top = 8.dp)) {
            content()
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
                    contentDescription = "Snapshot Alerta",
                    modifier = Modifier.fillMaxSize(),
                    isStreaming = false,
                    forceSnapshotMode = true
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
