package com.sentinela.pro.ui.components

import android.annotation.SuppressLint
import android.graphics.Color as AndroidColor
import android.view.View
import android.view.ViewGroup
import android.webkit.*
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.sentinela.pro.SentinelaConfig

/**
 * MseCameraView: Hardware-accelerated MSE (Media Source Extensions) Streamer for Android.
 * Connects directly to go2rtc via WebSocket (/go2rtc/stream.html?src=$cameraName&mode=mse).
 * Delivers true 24 FPS / 30 FPS video with GPU hardware decoding (MediaCodec)
 * over a SINGLE persistent WebSocket connection, completely eliminating Tailscale connection drops.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MseCameraView(
    cameraName: String,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    isStreaming: Boolean = true
) {
    if (!isStreaming) {
        Box(modifier = modifier.background(Color.Black))
        return
    }

    val streamUrl = remember(cameraName) {
        "${SentinelaConfig.BASE_URL}/go2rtc/stream.html?src=${cameraName}&mode=mse&width=100%"
    }

    var isLoading by remember(cameraName) { mutableStateOf(true) }
    var hasError by remember(cameraName) { mutableStateOf(false) }

    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    DisposableEffect(cameraName) {
        onDispose {
            webViewRef?.let { wv ->
                wv.stopLoading()
                wv.loadUrl("about:blank")
                wv.destroy()
            }
            webViewRef = null
        }
    }

    Box(
        modifier = modifier.background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    webViewRef = this
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(AndroidColor.BLACK)
                    setLayerType(View.LAYER_TYPE_HARDWARE, null)

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        loadsImagesAutomatically = true
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        allowContentAccess = true
                        cacheMode = WebSettings.LOAD_NO_CACHE
                    }

                    isVerticalScrollBarEnabled = false
                    isHorizontalScrollBarEnabled = false

                    webChromeClient = WebChromeClient()

                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isLoading = false
                            // Inject CSS to completely suppress WebKit media controls and provide 100% smooth fit
                            val js = "javascript:(function() {" +
                                    "var style = document.createElement('style');" +
                                    "style.innerHTML = 'html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:black; display:flex; justify-content:center; align-items:center; user-select:none; -webkit-user-select:none; } " +
                                    "video-stream, video { width:100% !important; height:100% !important; object-fit:cover !important; pointer-events:none !important; } " +
                                    "video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel, video::-webkit-media-controls-play-button, video::-webkit-media-controls-start-playback-button, video::-webkit-media-controls-timeline, video::-webkit-media-controls-overlay-play-button, video::-webkit-media-controls-current-time-display, video::-webkit-media-controls-time-remaining-display, video::-webkit-media-controls-mute-button, video::-webkit-media-controls-toggle-closed-captions-button, video::-webkit-media-controls-volume-slider { display:none !important; -webkit-appearance:none !important; opacity:0 !important; visibility:hidden !important; } " +
                                    "* { outline:none !important; -webkit-tap-highlight-color:transparent !important; }';" +
                                    "document.head.appendChild(style);" +
                                    "var initVideo = function() {" +
                                    "  var v = document.querySelector('video');" +
                                    "  if (v) {" +
                                    "    v.controls = false;" +
                                    "    v.muted = true;" +
                                    "    v.autoplay = true;" +
                                    "    v.playsInline = true;" +
                                    "    v.removeAttribute('controls');" +
                                    "    if (v.paused) { v.play().catch(function(){}); }" +
                                    "  }" +
                                    "};" +
                                    "initVideo();" +
                                    "if (!window.__liveEdgeTimer) {" +
                                    "  window.__liveEdgeTimer = setInterval(function() {" +
                                    "    var v = document.querySelector('video');" +
                                    "    if (v && v.buffered && v.buffered.length > 0) {" +
                                    "      var end = v.buffered.end(v.buffered.length - 1);" +
                                    "      var drift = end - v.currentTime;" +
                                    "      if (drift > 3.0) {" +
                                    "        v.currentTime = end - 0.1;" +
                                    "        v.playbackRate = 1.0;" +
                                    "      } else if (drift > 0.5) {" +
                                    "        v.playbackRate = 1.08;" +
                                    "      } else {" +
                                    "        v.playbackRate = 1.0;" +
                                    "      }" +
                                    "      if (v.paused) { v.play().catch(function(){}); }" +
                                    "    }" +
                                    "  }, 800);" +
                                    "}" +
                                    "})()"
                            view?.loadUrl(js)
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            super.onReceivedError(view, request, error)
                            if (request?.isForMainFrame == true) {
                                hasError = true
                                isLoading = false
                            }
                        }
                    }

                    loadUrl(streamUrl)
                }
            },
            update = { webView ->
                if (webView.url != streamUrl) {
                    webView.loadUrl(streamUrl)
                }
            }
        )

        // Loading spinner
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(32.dp),
                color = Color(0xFF06B6D4),
                strokeWidth = 2.5.dp
            )
        }

        // Error overlay
        if (hasError) {
            Box(
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.8f), CircleShape)
                    .padding(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.VideocamOff,
                    contentDescription = "Câmera Offline",
                    tint = Color.Red,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}
