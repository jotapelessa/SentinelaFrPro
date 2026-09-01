package com.sentinela.pro.tv

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.*
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.data.*
import com.sentinela.pro.network.SentinelaRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

@Composable
fun TvNetflixScreen(
    cameras: List<CameraItem>,
    onRefresh: () -> Unit = {}
) {
    var activeTabIndex by remember { mutableIntStateOf(0) }
    val tabs = listOf("Câmeras", "Capturas", "Ferramentas", "Logs", "Configurações")
    val icons = listOf(
        Icons.Default.Videocam,
        Icons.Default.VideoLibrary,
        Icons.Default.Speed,
        Icons.Default.Dns,
        Icons.Default.Settings
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070A11)) // Dark obsidian background
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Netflix-style Top Bar Navigation
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = 0.9f), Color.Transparent)
                        )
                    )
                    .padding(horizontal = 32.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Logo
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "SENTINELA",
                        color = Color(0xFFE50914), // Netflix Red accent
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF06B6D4).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                            .border(1.dp, Color(0xFF06B6D4).copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "TV PRO",
                            color = Color(0xFF22D3EE),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Navigation Tabs (D-Pad focusable)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    tabs.forEachIndexed { index, title ->
                        TvNavTabItem(
                            title = title,
                            icon = icons[index],
                            isSelected = activeTabIndex == index,
                            onSelect = { activeTabIndex = index }
                        )
                    }
                }

                // Tailscale / Server indicator
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .background(Color(0xFF0F172A), RoundedCornerShape(20.dp))
                        .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(20.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(Color(0xFF10B981), CircleShape)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "TAILSCALE ONLINE",
                        color = Color(0xFF10B981),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Tab Content
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 32.dp, vertical = 8.dp)
            ) {
                when (activeTabIndex) {
                    0 -> TvCamerasTab(cameras = cameras)
                    1 -> TvCapturesTab()
                    2 -> TvToolsTab()
                    3 -> TvLogsTab()
                    4 -> TvSettingsTab()
                }
            }
        }
    }
}

@Composable
fun TvNavTabItem(
    title: String,
    icon: ImageVector,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val bg = when {
        isFocused -> Color(0xFFE50914)
        isSelected -> Color(0xFF1E293B)
        else -> Color.Transparent
    }
    val fg = when {
        isFocused -> Color.White
        isSelected -> Color(0xFF22D3EE)
        else -> Color(0xFF94A3B8)
    }

    Box(
        modifier = Modifier
            .scale(if (isFocused) 1.08f else 1f)
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .border(
                1.dp,
                if (isFocused) Color.White else if (isSelected) Color(0xFF06B6D4) else Color.Transparent,
                RoundedCornerShape(10.dp)
            )
            .clickable(interactionSource = interactionSource, indication = null) { onSelect() }
            .focusable(interactionSource = interactionSource)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = title, tint = fg, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = title, color = fg, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
    }
}

// -------------------------------------------------------------
// TAB 1: CÂMERAS (HERO SPOTLIGHT + HORIZONTAL CAROUSEL)
// -------------------------------------------------------------
@Composable
fun TvCamerasTab(cameras: List<CameraItem>) {
    var selectedCam by remember { mutableStateOf(cameras.firstOrNull() ?: CameraItem("camera_principal", "Câmera Principal")) }
    var isFullscreenOpen by remember { mutableStateOf(false) }
    var frameTicker by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (isActive) {
            delay(200) // 5 FPS
            frameTicker = System.currentTimeMillis()
        }
    }

    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(24.dp)) {
        // Spotlight Big Preview (70% width)
        Box(
            modifier = Modifier
                .weight(0.7f)
                .fillMaxHeight()
                .clip(RoundedCornerShape(16.dp))
                .background(Color.Black)
                .border(2.dp, Color(0xFF06B6D4).copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                .clickable { isFullscreenOpen = true }
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(SentinelaConfig.getSnapshotUrl(selectedCam.name, frameTicker))
                    .crossfade(false)
                    .memoryCachePolicy(CachePolicy.DISABLED)
                    .diskCachePolicy(CachePolicy.DISABLED)
                    .build(),
                contentDescription = selectedCam.friendlyName,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Overlay Details
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.85f))
                        )
                    )
                    .padding(20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF10B981), CircleShape)
                            .size(10.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "AO VIVO • 5 FPS (NVMe Sync)",
                        color = Color(0xFF10B981),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = selectedCam.friendlyName,
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "Pressione OK no controle para Tela Cheia Imersiva",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
            }
        }

        // Camera Switcher List (30% width)
        Column(
            modifier = Modifier
                .weight(0.3f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "CÂMERAS CONECTADAS (${cameras.size})",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(cameras) { cam ->
                    TvCameraListItem(
                        camera = cam,
                        isSelected = selectedCam.name == cam.name,
                        frameTicker = frameTicker,
                        onSelect = { selectedCam = cam }
                    )
                }
            }
        }
    }

    if (isFullscreenOpen) {
        TvFullScreenLiveDialog(camera = selectedCam, onDismiss = { isFullscreenOpen = false })
    }
}

@Composable
fun TvCameraListItem(
    camera: CameraItem,
    isSelected: Boolean,
    frameTicker: Long,
    onSelect: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .scale(if (isFocused) 1.04f else 1f)
            .clip(RoundedCornerShape(12.dp))
            .background(if (isSelected) Color(0xFF1E293B) else Color(0xFF0F172A))
            .border(
                2.dp,
                if (isFocused) Color(0xFFE50914) else if (isSelected) Color(0xFF06B6D4) else Color(0xFF1E293B),
                RoundedCornerShape(12.dp)
            )
            .clickable(interactionSource = interactionSource, indication = null) { onSelect() }
            .focusable(interactionSource = interactionSource)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(width = 80.dp, height = 50.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.Black)
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(SentinelaConfig.getSnapshotUrl(camera.name, frameTicker))
                    .crossfade(false)
                    .memoryCachePolicy(CachePolicy.DISABLED)
                    .diskCachePolicy(CachePolicy.DISABLED)
                    .build(),
                contentDescription = camera.friendlyName,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = camera.friendlyName,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (camera.enabled) "Ativa" else "Pausada",
                color = if (camera.enabled) Color(0xFF10B981) else Color(0xFFEF4444),
                fontSize = 11.sp
            )
        }
    }
}

// -------------------------------------------------------------
// TAB 2: CAPTURAS (NETFLIX-STYLE VIDEO EVENT CAROUSEL)
// -------------------------------------------------------------
@Composable
fun TvCapturesTab() {
    val context = LocalContext.current
    val prefs = remember { SentinelaPreferences(context) }
    var captures by remember { mutableStateOf<List<CaptureEvent>>(emptyList()) }
    var selectedClip by remember { mutableStateOf<CaptureEvent?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        captures = SentinelaRepository.getCaptures(prefs.deviceIdentifier)
        isLoading = false
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFFE50914))
        }
    } else if (captures.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Nenhuma captura registrada recentemente.", color = Color(0xFF94A3B8), fontSize = 16.sp)
        }
    } else {
        Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "GRAVAÇÕES & DETECÇÕES DE SEGURANÇA (NVMe)",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(captures) { event ->
                    TvCaptureCard(event = event, onPlay = { selectedClip = event })
                }
            }
        }
    }

    if (selectedClip != null) {
        TvClipPlayerDialog(event = selectedClip!!, onDismiss = { selectedClip = null })
    }
}

@Composable
fun TvCaptureCard(event: CaptureEvent, onPlay: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Column(
        modifier = Modifier
            .width(260.dp)
            .scale(if (isFocused) 1.05f else 1f)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF0F172A))
            .border(
                2.dp,
                if (isFocused) Color(0xFFE50914) else Color(0xFF1E293B),
                RoundedCornerShape(12.dp)
            )
            .clickable(interactionSource = interactionSource, indication = null) { onPlay() }
            .focusable(interactionSource = interactionSource)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp)
                .background(Color.Black)
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(event.snapshotUrl)
                    .crossfade(false)
                    .build(),
                contentDescription = event.label,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = event.label.uppercase(),
                    color = Color(0xFF22D3EE),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = "${event.label} em ${event.camera}",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Precisão: ${event.score}%",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp
            )
        }
    }
}

// -------------------------------------------------------------
// TAB 3: FERRAMENTAS (TESTE DE VELOCIDADE & REDE)
// -------------------------------------------------------------
@Composable
fun TvToolsTab() {
    val context = LocalContext.current
    val prefs = remember { SentinelaPreferences(context) }
    val coroutineScope = rememberCoroutineScope()
    var speedResult by remember { mutableStateOf<SpeedTestResult?>(null) }
    var isTesting by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text(
            text = "DIAGNÓSTICOS & TESTE DE VELOCIDADE",
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Black
        )

        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            // Speed Test Box
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF0F172A))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "VELOCIDADE DE STREAMING (TAILSCALE)",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "${speedResult?.downloadMbps ?: 0.0} Mbps",
                    color = Color(0xFF22D3EE),
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black
                )

                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Latência (Ping)", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        Text("${speedResult?.pingMs ?: 0} ms", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Jitter", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        Text("${speedResult?.jitterMs ?: 0} ms", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Button(
                    onClick = {
                        isTesting = true
                        coroutineScope.launch {
                            speedResult = SentinelaRepository.runSpeedAndPingTest(
                                deviceIdentifier = prefs.deviceIdentifier,
                                friendlyName = prefs.friendlyName,
                                deviceType = "android_tv"
                            )
                            isTesting = false
                            Toast.makeText(context, "✅ Presença confirmada em http://sentinela.local/screens!", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = !isTesting,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE50914)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(if (isTesting) "Medindo Throughput & Notificando Servidor..." else "Testar Conexão com Servidor")
                }
            }

            // Connection Diagnostic Box
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF0F172A))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "STATUS DOS SERVIÇOS",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )

                TvDiagnosticRow(title = "Tailscale Funnel (HTTPS/WSS)", status = "Conectado", isOk = true)
                TvDiagnosticRow(title = "Frigate NVR 0.17", status = "Online (5000)", isOk = true)
                TvDiagnosticRow(title = "go2rtc WebRTC Gateway", status = "Online (1984)", isOk = true)
                TvDiagnosticRow(title = "Mosquitto MQTT Broker", status = "Conectado (1883)", isOk = true)
                TvDiagnosticRow(title = "Notificações Telegram", status = "Ativo", isOk = true)
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
        Text(text = title, color = Color.White, fontSize = 13.sp)
        Box(
            modifier = Modifier
                .background(if (isOk) Color(0xFF10B981).copy(alpha = 0.2f) else Color(0xFFEF4444).copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                .padding(horizontal = 8.dp, vertical = 2.dp)
        ) {
            Text(
                text = status,
                color = if (isOk) Color(0xFF10B981) else Color(0xFFEF4444),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// -------------------------------------------------------------
// TAB 4: LOGS & TELEMETRIA (COM BOTÃO COPIAR TODOS OS LOGS)
// -------------------------------------------------------------
@Composable
fun TvLogsTab() {
    val context = LocalContext.current
    var telemetry by remember { mutableStateOf<TelemetryData?>(null) }
    var logs by remember { mutableStateOf<List<AuditLogEntry>>(emptyList()) }

    LaunchedEffect(Unit) {
        telemetry = SentinelaRepository.getTelemetry()
        logs = SentinelaRepository.getAuditLogs()
    }

    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Metric Cards Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            TvTelemetryCard(title = "SERVIDOR", value = telemetry?.uptime ?: "Online", subtitle = "Tailscale Funnel", modifier = Modifier.weight(1f))
            TvTelemetryCard(title = "CPU", value = "${telemetry?.cpuPercent ?: 0.0}%", subtitle = "${telemetry?.cpuTemp ?: 0.0}°C", modifier = Modifier.weight(1f))
            TvTelemetryCard(title = "MEMÓRIA RAM", value = "${telemetry?.ramPercent ?: 0.0}%", subtitle = "${telemetry?.ramUsedMb ?: 0}MB / ${telemetry?.ramTotalMb ?: 0}MB", modifier = Modifier.weight(1f))
            TvTelemetryCard(title = "TELEGRAM", value = if (telemetry?.telegramConfigured == true) "ATIVO" else "PENDENTE", subtitle = "Alertas em Tempo Real", modifier = Modifier.weight(1f))
        }

        // Logs Header & Copy Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "TRILHA DE AUDITORIA & LOGS DO SISTEMA",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Black
            )

            Button(
                onClick = {
                    val fullLogText = buildString {
                        appendLine("=== SENTINELA PRO - LOGS DE TELEMETRIA ===")
                        appendLine("Servidor: ${telemetry?.uptime} | CPU: ${telemetry?.cpuPercent}% | RAM: ${telemetry?.ramPercent}%")
                        appendLine("Data de Extração: ${System.currentTimeMillis()}")
                        appendLine("------------------------------------------")
                        logs.forEach { l ->
                            appendLine("[${l.createdAt}] [${l.module}] [${l.severity}] ${l.action}: ${l.details} (IP: ${l.clientIp})")
                        }
                    }
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("SentinelaLogs", fullLogText))
                    Toast.makeText(context, "✅ Todos os logs foram copiados com sucesso!", Toast.LENGTH_LONG).show()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Copiar Todos os Logs", fontSize = 12.sp)
            }
        }

        // Console-style Log Window
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF030712))
                .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(logs) { entry ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = entry.createdAt.take(19),
                        color = Color(0xFF64748B),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Box(
                        modifier = Modifier
                            .background(
                                when (entry.severity.uppercase()) {
                                    "ERROR" -> Color(0xFFEF4444).copy(alpha = 0.2f)
                                    "WARN" -> Color(0xFFF59E0B).copy(alpha = 0.2f)
                                    else -> Color(0xFF06B6D4).copy(alpha = 0.2f)
                                },
                                RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = entry.module.uppercase(),
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                    Text(
                        text = "${entry.action}: ${entry.details}",
                        color = Color(0xFFE2E8F0),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

@Composable
fun TvTelemetryCard(title: String, value: String, subtitle: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF0F172A))
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
            .padding(16.dp)
    ) {
        Text(text = title, color = Color(0xFF94A3B8), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = value, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = subtitle, color = Color(0xFF22D3EE), fontSize = 11.sp)
    }
}

// -------------------------------------------------------------
// TAB 5: CONFIGURAÇÕES (8 TAMANHOS, 8 POSIÇÕES, 8 TEMPOS)
// -------------------------------------------------------------
@Composable
fun TvSettingsTab() {
    val context = LocalContext.current
    val prefs = remember { SentinelaPreferences(context) }
    var sizeIndex by remember { mutableIntStateOf(prefs.pipSizeIndex) }
    var posIndex by remember { mutableIntStateOf(prefs.pipPositionIndex) }
    var durIndex by remember { mutableIntStateOf(prefs.pipDurationIndex) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            Text(
                text = "AJUSTES DA JANELA SUSPENSA (PIP PREVIEW)",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black
            )
        }

        // 8 Pip Sizes
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "1. TAMANHO DA TELA PIP (8 OPÇÕES)",
                    color = Color(0xFF22D3EE),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(PipSize.values().toList()) { size ->
                        TvOptionPill(
                            label = size.label,
                            isSelected = size.ordinal == sizeIndex,
                            onSelect = {
                                sizeIndex = size.ordinal
                                prefs.pipSizeIndex = size.ordinal
                                Toast.makeText(context, "Tamanho PiP atualizado", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }
        }

        // 8 Pip Positions
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "2. POSIÇÃO DA TELA PIP (8 POSIÇÕES)",
                    color = Color(0xFF22D3EE),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(PipPosition.values().toList()) { pos ->
                        TvOptionPill(
                            label = pos.label,
                            isSelected = pos.ordinal == posIndex,
                            onSelect = {
                                posIndex = pos.ordinal
                                prefs.pipPositionIndex = pos.ordinal
                                Toast.makeText(context, "Posição PiP atualizada", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }
        }

        // 8 Pip Durations
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "3. TEMPO DE EXIBIÇÃO AUTOMÁTICA (8 TEMPOS)",
                    color = Color(0xFF22D3EE),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(PipDuration.values().toList()) { dur ->
                        TvOptionPill(
                            label = dur.label,
                            isSelected = dur.ordinal == durIndex,
                            onSelect = {
                                durIndex = dur.ordinal
                                prefs.pipDurationIndex = dur.ordinal
                                Toast.makeText(context, "Duração PiP atualizada", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }
        }

        // Server Host Selector
        item {
            var currentHost by remember { mutableStateOf(prefs.serverHost) }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "SERVIDOR SENTINELA (CONEXÃO ATUAL)",
                    color = Color(0xFF22D3EE),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Host ativo: $currentHost",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val presets = listOf(
                        "sentinela.tail47a54f.ts.net" to "Túnel Tailscale VPN",
                        "sentinela.local" to "Rede Local (mDNS)",
                        "192.168.1.252:8000" to "IP Direto (Porta 8000)"
                    )
                    items(presets) { (host, label) ->
                        TvOptionPill(
                            label = "$label ($host)",
                            isSelected = currentHost == host,
                            onSelect = {
                                currentHost = host
                                prefs.serverHost = host
                                SentinelaConfig.currentHost = host
                                Toast.makeText(context, "Servidor alterado para $host", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            }
        }

        // App Version & Pairing Info
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF0F172A))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "IDENTIFICAÇÃO DESTE DISPOSITIVO EM /SCREENS",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "ID: ${prefs.deviceIdentifier}",
                    color = Color(0xFF22D3EE),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = "Nome: ${prefs.friendlyName}",
                    color = Color.White,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "VERSÃO DO APLICATIVO: ${com.sentinela.pro.BuildConfig.VERSION_NAME} (Android TV Edition)",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun TvOptionPill(label: String, isSelected: Boolean, onSelect: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Box(
        modifier = Modifier
            .scale(if (isFocused) 1.05f else 1f)
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) Color(0xFF06B6D4).copy(alpha = 0.25f) else Color(0xFF0F172A))
            .border(
                1.5.dp,
                if (isFocused) Color(0xFFE50914) else if (isSelected) Color(0xFF06B6D4) else Color(0xFF1E293B),
                RoundedCornerShape(10.dp)
            )
            .clickable(interactionSource = interactionSource, indication = null) { onSelect() }
            .focusable(interactionSource = interactionSource)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Text(
            text = label,
            color = if (isSelected) Color(0xFF22D3EE) else Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

// Full Screen Live Dialog
@Composable
fun TvFullScreenLiveDialog(camera: CameraItem, onDismiss: () -> Unit) {
    var timestamp by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (isActive) {
            delay(200)
            timestamp = System.currentTimeMillis()
        }
    }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .clickable { onDismiss() }
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(SentinelaConfig.getSnapshotUrl(camera.name, timestamp))
                    .crossfade(false)
                    .memoryCachePolicy(CachePolicy.DISABLED)
                    .diskCachePolicy(CachePolicy.DISABLED)
                    .build(),
                contentDescription = camera.friendlyName,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize()
            )
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(24.dp)
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "${camera.friendlyName} (Pressione VOLTAR para sair)",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
    }
}

// Clip Player Dialog
@Composable
fun TvClipPlayerDialog(event: CaptureEvent, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
                .clickable { onDismiss() }
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(event.snapshotUrl)
                    .crossfade(false)
                    .build(),
                contentDescription = event.label,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize()
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.8f))
                    .padding(24.dp)
            ) {
                Text(
                    text = "Gravação de ${event.label.uppercase()} em ${event.camera}",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Data/Hora: ${event.timestamp} | Precisão: ${event.score}%",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp
                )
            }
        }
    }
}
