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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.launch
import com.sentinela.pro.SentinelaConfig

/**
 * MseCameraView: Hardware-accelerated MSE (Media Source Extensions) Streamer for Android.
 * Connects directly to go2rtc via WebSocket (/go2rtc/stream.html?src=$cameraName&mode=mse).
 * Delivers true 24 FPS / 30 FPS video with GPU hardware decoding (MediaCodec)
 * over a SINGLE persistent WebSocket connection, completely eliminating Tailscale connection drops.
 */
private class MseFrameBridge(
    private val onFirstFrame: () -> Unit
) {
    @Volatile
    private var reported = false

    fun reset() {
        reported = false
    }

    @JavascriptInterface
    fun notifyFirstFrame() {
        if (!reported) {
            reported = true
            onFirstFrame()
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MseCameraView(
    cameraName: String,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    isStreaming: Boolean = true,
    streamMode: String = "webrtc",
    preferSubStream: Boolean = true,
    audioEnabled: Boolean = false
) {
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
    var isAppInForeground by remember { mutableStateOf(true) }

    val cleanBaseName = remember(cameraName) {
        cameraName.removeSuffix("_720p").removeSuffix("_sub").removeSuffix("_main")
    }
    val effectiveStreamSrc = remember(cleanBaseName, preferSubStream) {
        if (preferSubStream) "${cleanBaseName}_720p" else cleanBaseName
    }

    val streamUrl = remember(effectiveStreamSrc, streamMode, audioEnabled) {
        val mediaParam = if (audioEnabled) "media=video+audio" else "media=video"
        val modeQuery = when (streamMode.lowercase()) {
            "eco" -> "mode=mjpeg"
            "mse" -> "mode=mse,webrtc&${mediaParam}&background=true"
            else -> "mode=webrtc,mse&${mediaParam}&background=true"
        }
        "${SentinelaConfig.BASE_URL}/go2rtc/stream.html?src=${effectiveStreamSrc}&${modeQuery}&width=100%"
    }
    val snapshotUrl = remember(cleanBaseName) {
        "${SentinelaConfig.BASE_URL}/frigate/api/${cleanBaseName}/latest.jpg?h=720"
    }

    var isLoading by remember(cameraName, streamUrl) { mutableStateOf(true) }
    var isVideoReady by remember(cameraName, streamUrl) { mutableStateOf(false) }
    var hasError by remember(cameraName, streamUrl) { mutableStateOf(false) }

    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val imageLoader = remember { coil.Coil.imageLoader(context) }
    val mainScope = rememberCoroutineScope()

    DisposableEffect(lifecycleOwner, cameraName) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            when (event) {
                androidx.lifecycle.Lifecycle.Event.ON_PAUSE,
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> {
                    isAppInForeground = false
                    isVideoReady = false
                    webViewRef?.let { wv ->
                        wv.onPause()
                        wv.loadUrl("about:blank")
                    }
                }
                androidx.lifecycle.Lifecycle.Event.ON_RESUME -> {
                    isAppInForeground = true
                    webViewRef?.let { wv ->
                        wv.onResume()
                        wv.resumeTimers()
                        wv.loadUrl(streamUrl)
                    }
                }
                androidx.lifecycle.Lifecycle.Event.ON_DESTROY -> {
                    webViewRef?.let { wv ->
                        wv.stopLoading()
                        wv.loadUrl("about:blank")
                        wv.destroy()
                    }
                    webViewRef = null
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            webViewRef?.let { wv ->
                wv.stopLoading()
                wv.loadUrl("about:blank")
                wv.destroy()
            }
            webViewRef = null
        }
    }

    if (!isStreaming || !isAppInForeground || streamMode.lowercase() == "snapshot") {
        coil.compose.AsyncImage(
            model = coil.request.ImageRequest.Builder(context)
                .data(snapshotUrl)
                .memoryCachePolicy(coil.request.CachePolicy.ENABLED)
                .diskCachePolicy(coil.request.CachePolicy.ENABLED)
                .crossfade(true)
                .build(),
            imageLoader = imageLoader,
            contentDescription = contentDescription ?: cameraName,
            modifier = modifier.fillMaxSize(),
            contentScale = androidx.compose.ui.layout.ContentScale.Crop
        )
        return
    }

    Box(
        modifier = modifier
            .background(Color(0xFF090D16))
            .semantics { this.contentDescription = contentDescription ?: cameraName },
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
                    setBackgroundColor(AndroidColor.parseColor("#090D16"))
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
                        allowFileAccess = true
                        cacheMode = WebSettings.LOAD_NO_CACHE
                    }

                    isVerticalScrollBarEnabled = false
                    isHorizontalScrollBarEnabled = false

                    val frameBridge = MseFrameBridge {
                        mainScope.launch(kotlinx.coroutines.Dispatchers.Main) {
                            isVideoReady = true
                            isLoading = false
                        }
                    }
                    addJavascriptInterface(frameBridge, "MseFrameBridge")

                    webChromeClient = object : WebChromeClient() {
                        override fun onPermissionRequest(request: PermissionRequest?) {
                            request?.grant(request.resources)
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun onReceivedSslError(
                            view: WebView?,
                            handler: SslErrorHandler?,
                            error: android.net.http.SslError?
                        ) {
                            // Trust Tailscale HTTPS / MagicDNS TLS certificates
                            handler?.proceed()
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isLoading = false
                            val mutedBool = if (audioEnabled) "false" else "true"
                            // Inject CSS, requestVideoFrameCallback first-frame sync, and WebRTC/MSE live-edge watchdog
                            val js = "javascript:(function() {" +
                                    "var style = document.createElement('style');" +
                                    "style.innerHTML = 'html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#090D16 !important; display:flex; justify-content:center; align-items:center; user-select:none; -webkit-user-select:none; } " +
                                    "video-stream, video { width:100% !important; height:100% !important; object-fit:cover !important; pointer-events:none !important; background:#090D16 !important; } " +
                                    "video::-webkit-media-controls, video::-webkit-media-controls-enclosure, video::-webkit-media-controls-panel, video::-webkit-media-controls-play-button, video::-webkit-media-controls-start-playback-button, video::-webkit-media-controls-timeline, video::-webkit-media-controls-overlay-play-button, video::-webkit-media-controls-current-time-display, video::-webkit-media-controls-time-remaining-display, video::-webkit-media-controls-mute-button, video::-webkit-media-controls-toggle-closed-captions-button, video::-webkit-media-controls-volume-slider { display:none !important; -webkit-appearance:none !important; opacity:0 !important; visibility:hidden !important; } " +
                                    "video-stream .info, .info, .mode, .status, .spinner, .mode-box { display:none !important; opacity:0 !important; visibility:hidden !important; pointer-events:none !important; } " +
                                    "* { outline:none !important; -webkit-tap-highlight-color:transparent !important; }';" +
                                    "document.head.appendChild(style);" +
                                    "var getVideo = function() {" +
                                    "  var vs = document.querySelector('video-stream');" +
                                    "  if (vs && vs.shadowRoot) {" +
                                    "    if (!vs.shadowRoot.__styled) {" +
                                    "      vs.shadowRoot.__styled = true;" +
                                    "      var sStyle = document.createElement('style');" +
                                    "      sStyle.innerHTML = 'video { width:100% !important; height:100% !important; object-fit:cover !important; background:#090D16 !important; } .info, .mode, .status, .spinner { display:none !important; }';" +
                                    "      vs.shadowRoot.appendChild(sStyle);" +
                                    "    }" +
                                    "    var sv = vs.shadowRoot.querySelector('video');" +
                                    "    if (sv) return sv;" +
                                    "  }" +
                                    "  return document.querySelector('video');" +
                                    "};" +
                                    "var onFirstVideoFrame = function() {" +
                                    "  if (window.MseFrameBridge && window.MseFrameBridge.notifyFirstFrame) {" +
                                    "    window.MseFrameBridge.notifyFirstFrame();" +
                                    "  }" +
                                    "};" +
                                    "var initVideo = function() {" +
                                    "  var v = getVideo();" +
                                    "  if (v) {" +
                                    "    v.controls = false;" +
                                    "    v.muted = " + mutedBool + ";" +
                                    "    if (!" + mutedBool + ") { v.volume = 1.0; }" +
                                    "    v.autoplay = true;" +
                                    "    v.playsInline = true;" +
                                    "    v.removeAttribute('controls');" +
                                    "    if (!v.__frameCallbackRegistered) {" +
                                    "      v.__frameCallbackRegistered = true;" +
                                    "      if (v.requestVideoFrameCallback) {" +
                                    "        v.requestVideoFrameCallback(function() { onFirstVideoFrame(); });" +
                                    "      } else {" +
                                    "        v.addEventListener('timeupdate', function() {" +
                                    "          if (v.currentTime > 0.05) { onFirstVideoFrame(); }" +
                                    "        });" +
                                    "      }" +
                                    "    }" +
                                    "    try {" +
                                    "      var origDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');" +
                                    "      if (origDesc && !v.__rateIntercepted) {" +
                                    "        v.__rateIntercepted = true;" +
                                    "        Object.defineProperty(v, 'playbackRate', {" +
                                    "          get: function() { return origDesc.get.call(v); }," +
                                    "          set: function(val) {" +
                                    "            if (val < 1.0) val = 1.0;" +
                                    "            if (val > 1.15) val = 1.15;" +
                                    "            origDesc.set.call(v, val);" +
                                    "          }," +
                                    "          configurable: true" +
                                    "        });" +
                                    "      }" +
                                    "    } catch(e) {}" +
                                    "    v.addEventListener('error', function() {" +
                                    "      if (v.paused) { v.play().catch(function(){}); }" +
                                    "    });" +
                                    "    if (v.paused) { v.play().catch(function(){}); }" +
                                    "  }" +
                                    "};" +
                                    "initVideo();" +
                                    "if (!window.__liveEdgeTimer) {" +
                                    "  window.__liveEdgeTimer = setInterval(function() {" +
                                    "    var v = getVideo();" +
                                    "    if (v) {" +
                                    "      if (v.paused) { v.play().catch(function(){}); }" +
                                    "      if (v.readyState >= 2 && v.videoWidth > 0) { onFirstVideoFrame(); }" +
                                    "      if (v.buffered && v.buffered.length > 0) {" +
                                    "        var end = v.buffered.end(v.buffered.length - 1);" +
                                    "        var drift = end - v.currentTime;" +
                                    "        if (drift > 1.2) {" +
                                    "          v.playbackRate = 1.12;" +
                                    "        } else if (drift > 0.6) {" +
                                    "          v.playbackRate = 1.08;" +
                                    "        } else if (drift < 0.15) {" +
                                    "          v.playbackRate = 1.0;" +
                                    "        }" +
                                    "      }" +
                                    "    } else {" +
                                    "      initVideo();" +
                                    "    }" +
                                    "  }, 350);" +
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
                    isVideoReady = false
                    webView.loadUrl(streamUrl)
                }
            }
        )

        // Subtle connection indicator shown on neutral dark background until requestVideoFrameCallback confirms first real video frame
        if (!isVideoReady && !hasError) {
            CircularProgressIndicator(
                modifier = Modifier.size(28.dp),
                color = Color(0xFF06B6D4),
                strokeWidth = 2.dp
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
