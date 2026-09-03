package com.sentinela.pro.tv

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import androidx.compose.ui.platform.LocalContext
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
 * 100% Jetpack Compose Nativo + 10-Foot UI + Ergonomia D-Pad
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
    activePipAlert: PipAlert? = null,
    tailscaleIp: String = "100.93.129.91",
    onCameraSelected: (CameraEntity) -> Unit = {},
    onDismissPip: () -> Unit = {},
    onExpandPipToHero: (CameraEntity) -> Unit = {},
    onRefresh: () -> Unit = {}
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
                    TvTab.TOOLS -> TvToolsViewport(onRefresh = onRefresh)
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
                // Imagem Seamless ou Stream H.264/H.265
                SeamlessCameraImage(
                    cameraName = camera.id,
                    host = SentinelaConfig.currentHost,
                    modifier = Modifier.fillMaxSize(),
                    isForeground = true
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
                    SeamlessCameraImage(
                        cameraName = camera.id,
                        host = SentinelaConfig.currentHost,
                        modifier = Modifier.fillMaxSize(),
                        isForeground = true
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
 * Viewport de Ferramentas / Testes na TV
 */
@Composable
fun TvToolsViewport(onRefresh: () -> Unit) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isTestingPiP by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .clip(TvShapes.CameraCard)
            .background(TvColors.CardBackground)
            .border(1.dp, TvColors.BorderSubtle, TvShapes.CameraCard)
            .padding(TvDimens.xl),
        verticalArrangement = Arrangement.spacedBy(TvDimens.md),
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Ferramentas & Diagnósticos NVR",
            style = TvTypography.TabTitle.copy(fontSize = 20.sp)
        )
        Text(
            text = "Execute rotinas de teste e recarga de câmeras conectadas ao servidor.",
            style = TvTypography.MenuItem.copy(color = TvColors.TextSecondary)
        )

        Spacer(modifier = Modifier.height(TvDimens.md))

        Button(
            onClick = { onRefresh() },
            colors = ButtonDefaults.buttonColors(containerColor = TvColors.CyberCyan),
            shape = TvShapes.MenuItem
        ) {
            Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.Black)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Recarregar Câmeras do Servidor", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}

/**
 * Viewport Genérico para Outras Abas (Capturas, Logs, Configurações)
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
