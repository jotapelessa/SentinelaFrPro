package com.sentinela.pro.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.sentinela.pro.data.CameraItem
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.ui.components.SeamlessCameraImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvLeanbackGrid(
    cameras: List<CameraItem>,
    onRefresh: () -> Unit = {}
) {
    var selectedCamera by remember { mutableStateOf<CameraItem?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B14))
            .padding(24.dp)
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "SENTINELA PRO",
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF06B6D4).copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                            .border(1.dp, Color(0xFF06B6D4), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "ANDROID TV",
                            color = Color(0xFF22D3EE),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }

                Text(
                    text = "${cameras.size} câmeras conectadas",
                    color = Color(0xFF94A3B8),
                    fontSize = 14.sp
                )
            }
            
            TvLazyVerticalGrid(
                columns = TvGridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(cameras) { camera ->
                    TvCameraCard(
                        camera = camera,
                        onClick = { selectedCamera = camera }
                    )
                }
            }
        }

        selectedCamera?.let { cam ->
            TvFullScreenCameraDialog(camera = cam, onDismiss = { selectedCamera = null })
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvCameraCard(
    camera: CameraItem,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale = if (isFocused) 1.03f else 1f
    val borderColor = if (isFocused) Color(0xFF06B6D4) else Color(0xFF1E293B)
    val borderWidth = if (isFocused) 3.dp else 1.dp
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .scale(scale)
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFF0F172A))
            .border(borderWidth, borderColor, RoundedCornerShape(14.dp))
            .focusable(interactionSource = interactionSource)
            .clickable { onClick() }
    ) {
        SeamlessCameraImage(
            cameraName = camera.name,
            contentDescription = camera.friendlyName,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            refreshIntervalMs = 42L // MSE 24 FPS Standard
        )

        // Top Status Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(8.dp))
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
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(8.dp))
                    .border(1.dp, Color(0xFF10B981).copy(alpha = 0.5f), RoundedCornerShape(8.dp))
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
        
        if (isFocused) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(Color(0xFF06B6D4).copy(alpha = 0.85f))
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Pressione OK para Tela Cheia",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvFullScreenCameraDialog(camera: CameraItem, onDismiss: () -> Unit) {
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
                cameraName = camera.name,
                contentDescription = camera.friendlyName,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
                refreshIntervalMs = 42L // MSE 24 FPS Standard
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
