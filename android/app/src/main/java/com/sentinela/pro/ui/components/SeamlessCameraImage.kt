package com.sentinela.pro.ui.components

import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.VideocamOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.Coil
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.sentinela.pro.SentinelaConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext

/**
 * High-performance Zero-Flicker Live Camera Stream component for Jetpack Compose.
 * By default, uses MseCameraView (hardware-accelerated 24 FPS MSE over persistent WebSocket via go2rtc),
 * eliminating Tailscale connection drops and delivering native 24 FPS video.
 */
@Composable
fun SeamlessCameraImage(
    cameraName: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    refreshIntervalMs: Long = 42L, // MSE 24 FPS Standard
    isStreaming: Boolean = true,
    forceSnapshotMode: Boolean = false
) {
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    var isAppInForeground by remember { mutableStateOf(true) }

    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_PAUSE,
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> isAppInForeground = false
                androidx.lifecycle.Lifecycle.Event.ON_RESUME -> isAppInForeground = true
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    if (!forceSnapshotMode && (!isStreaming || !isAppInForeground)) {
        Box(modifier = modifier.background(Color.Black))
        return
    }

    if (!forceSnapshotMode) {
        MseCameraView(
            cameraName = cameraName,
            modifier = modifier,
            contentDescription = contentDescription,
            isStreaming = isStreaming && isAppInForeground
        )
        return
    }

    val context = LocalContext.current
    val imageLoader = remember { Coil.imageLoader(context) }

    var currentBitmap by remember(cameraName) { mutableStateOf<Bitmap?>(null) }
    var isInitialLoading by remember(cameraName) { mutableStateOf(true) }
    var hasError by remember(cameraName) { mutableStateOf(false) }

    LaunchedEffect(cameraName, isAppInForeground) {
        if (!isStreaming || !isAppInForeground) return@LaunchedEffect
        
        while (isActive) {
            val loopStart = System.currentTimeMillis()
            val now = loopStart
            val primaryUrl = SentinelaConfig.getSnapshotUrl(cameraName, now)

            val request = ImageRequest.Builder(context)
                .data(primaryUrl)
                .memoryCachePolicy(CachePolicy.DISABLED)
                .diskCachePolicy(CachePolicy.DISABLED)
                .allowHardware(false)
                .build()

            var decoded = false
            try {
                val result = withContext(Dispatchers.IO) {
                    imageLoader.execute(request)
                }

                if (result is SuccessResult) {
                    val drawable = result.drawable
                    if (drawable is BitmapDrawable) {
                        currentBitmap = drawable.bitmap
                        hasError = false
                        isInitialLoading = false
                        decoded = true
                    }
                }
            } catch (e: Exception) {
                // Ignore and try fallback
            }

            // Fallback to go2rtc frame if Frigate snapshot failed
            if (!decoded) {
                try {
                    val fallbackUrl = SentinelaConfig.getGo2rtcFrameUrl(cameraName, now)
                    val fallbackReq = ImageRequest.Builder(context)
                        .data(fallbackUrl)
                        .memoryCachePolicy(CachePolicy.DISABLED)
                        .diskCachePolicy(CachePolicy.DISABLED)
                        .allowHardware(false)
                        .build()
                    val result = withContext(Dispatchers.IO) {
                        imageLoader.execute(fallbackReq)
                    }
                    if (result is SuccessResult) {
                        val drawable = result.drawable
                        if (drawable is BitmapDrawable) {
                            currentBitmap = drawable.bitmap
                            hasError = false
                            isInitialLoading = false
                            decoded = true
                        }
                    }
                } catch (e: Exception) {
                    // Fail silently, keep currentBitmap
                }
            }

            if (!decoded && currentBitmap == null) {
                hasError = true
            }

            val elapsed = System.currentTimeMillis() - loopStart
            val sleepTime = (refreshIntervalMs - elapsed).coerceIn(10L, refreshIntervalMs)
            delay(sleepTime)
        }
    }

    Box(
        modifier = modifier.background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        val bitmap = currentBitmap
        if (bitmap != null) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = contentDescription,
                contentScale = contentScale,
                modifier = Modifier.fillMaxSize()
            )
        } else if (hasError) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0F172A)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.VideocamOff,
                    contentDescription = "Câmera Offline",
                    tint = Color(0xFF64748B),
                    modifier = Modifier.size(36.dp)
                )
            }
        } else if (isInitialLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF0F172A)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    color = Color(0xFF06B6D4),
                    modifier = Modifier.size(28.dp),
                    strokeWidth = 2.5.dp
                )
            }
        }
    }
}
