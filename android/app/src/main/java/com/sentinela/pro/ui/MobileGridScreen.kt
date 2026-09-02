package com.sentinela.pro.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.sentinela.pro.data.CameraItem
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.ui.components.SeamlessCameraImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@Composable
fun MobileGridScreen(
    cameras: List<CameraItem>,
    isLoading: Boolean = false,
    onRefresh: () -> Unit = {}
) {
    var selectedCamera by remember { mutableStateOf<CameraItem?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF090D16)) // Dark obsidian background
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "SENTINELA",
                                color = Color.White,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Black
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFF06B6D4).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                    .border(1.dp, Color(0xFF06B6D4).copy(alpha = 0.4f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "PRO",
                                    color = Color(0xFF22D3EE),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .background(Color(0xFF1E293B), RoundedCornerShape(4.dp))
                                    .border(1.dp, Color(0xFF334155), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "v${com.sentinela.pro.BuildConfig.VERSION_NAME}",
                                    color = Color(0xFFE2E8F0),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Text(
                            text = "${cameras.size} câmeras conectadas",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                    }

                    Button(
                        onClick = onRefresh,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF1E293B),
                            contentColor = Color(0xFF22D3EE)
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text("Atualizar", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            items(cameras) { camera ->
                CameraCardMobile(
                    camera = camera,
                    onClick = { selectedCamera = camera }
                )
            }
        }

        // Fullscreen Modal on click
        selectedCamera?.let { cam ->
            FullScreenCameraDialog(camera = cam, onDismiss = { selectedCamera = null })
        }
    }
}

@Composable
fun CameraCardMobile(
    camera: CameraItem,
    onClick: () -> Unit
) {
    var timestamp by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val context = LocalContext.current

    // Live frame refresh loop (every 350ms)
    LaunchedEffect(camera.name) {
        while (isActive) {
            delay(350)
            timestamp = System.currentTimeMillis()
        }
    }

    val snapshotUrl = remember(timestamp) {
        SentinelaConfig.getSnapshotUrl(camera.name, timestamp)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF0F172A))
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
            .clickable { onClick() }
    ) {
        SeamlessCameraImage(
            cameraName = camera.name,
            contentDescription = camera.friendlyName,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            refreshIntervalMs = 42L // MSE 24 FPS Standard
        )

        // Top Status Header Overlay
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .background(Color(0xFF000000).copy(alpha = 0.65f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(
                    text = camera.friendlyName,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }

            Box(
                modifier = Modifier
                    .background(Color(0xFF000000).copy(alpha = 0.65f), RoundedCornerShape(8.dp))
                    .border(1.dp, Color(0xFF10B981).copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(Color(0xFF10B981), CircleShape)
                    )
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(
                        text = "AO VIVO",
                        color = Color(0xFF10B981),
                        fontWeight = FontWeight.Black,
                        fontSize = 10.sp
                    )
                }
            }
        }

        // Bottom Tap Hint
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Color(0xFF000000).copy(alpha = 0.4f))
                .padding(vertical = 4.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Toque para expandir em tela cheia",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp
            )
        }
    }
}

@Composable
fun FullScreenCameraDialog(camera: CameraItem, onDismiss: () -> Unit) {
    var timestamp by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var scale by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }
    val context = LocalContext.current

    LaunchedEffect(camera.name) {
        while (isActive) {
            delay(250) // Faster 4fps refresh in full screen
            timestamp = System.currentTimeMillis()
        }
    }

    val snapshotUrl = remember(timestamp) {
        SentinelaConfig.getSnapshotUrl(camera.name, timestamp)
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            SeamlessCameraImage(
                cameraName = camera.name,
                contentDescription = camera.friendlyName,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer(
                        scaleX = scale,
                        scaleY = scale,
                        translationX = offsetX,
                        translationY = offsetY
                    )
                    .pointerInput(Unit) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            scale = (scale * zoom).coerceIn(1f, 5f)
                            val maxOffset = (scale - 1) * 400
                            offsetX = (offsetX + pan.x).coerceIn(-maxOffset, maxOffset)
                            offsetY = (offsetY + pan.y).coerceIn(-maxOffset, maxOffset)
                        }
                    }
            )

            // Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = camera.friendlyName,
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )

                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Fechar ✕", color = Color.White, fontSize = 12.sp)
                }
            }

            if (scale > 1f) {
                Button(
                    onClick = {
                        scale = 1f
                        offsetX = 0f
                        offsetY = 0f
                    },
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF06B6D4))
                ) {
                    Text("Resetar Zoom (1x)", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
