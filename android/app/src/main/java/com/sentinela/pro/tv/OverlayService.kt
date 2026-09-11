package com.sentinela.pro.tv

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.net.http.SslError
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.data.*
import com.sentinela.pro.network.*
import kotlinx.coroutines.*

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private var pipWebView: WebView? = null
    private var pipTitleView: TextView? = null
    private var pipImageView: android.widget.ImageView? = null
    private var snapshotRefreshJob: Job? = null
    
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.Main + serviceJob)
    
    private var webSocket: SentinelaWebSocket? = null
    private var pipJob: Job? = null
    private var cachedDevicePolicy: DevicePolicy? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        try {
            startForeground(1, buildNotification())
        } catch (e: Exception) {
            android.util.Log.e("OverlayService", "Failed to start foreground notification: ${e.message}")
        }

        val prefs = SentinelaPreferences(this)
        val host = prefs.serverHost
        SentinelaConfig.currentHost = host
        webSocket = SentinelaWebSocket(host)
        
        // Asynchronously load initial device policy without blocking initialization
        serviceScope.launch {
            try {
                val pol = SentinelaRepository.getDevicePolicy(prefs.deviceIdentifier)
                syncPolicyWithPrefs(pol, prefs)
            } catch (e: Exception) {
                android.util.Log.d("OverlayService", "Initial policy fetch: ${e.message}")
            }
        }

        serviceScope.launch {
            webSocket?.connectAndListen()
        }
        
        serviceScope.launch {
            webSocket?.events?.collect { event ->
                val evType = event.optString("type")
                val isMotionActive = (evType == "CAMERA_DETECTION_ACTIVE" && event.optBoolean("active", false)) || 
                                     (evType == "CAMERA_MOTION_STATUS" && event.optBoolean("motion", false))
                if (evType == "DEVICE_CONFIG_UPDATED") {
                    val targetIdent = event.optString("device_identifier", "")
                    if (targetIdent == prefs.deviceIdentifier) {
                        val fn = event.optString("friendly_name")
                        if (fn.isNotBlank()) prefs.friendlyName = fn
                        if (event.has("allow_pip_alerts")) prefs.allowPipAlerts = event.optBoolean("allow_pip_alerts", true)
                        val serverPipSize = event.optString("pip_default_size", "")
                        if (serverPipSize.isNotBlank()) {
                            when (serverPipSize.lowercase()) {
                                "mini", "extra_small" -> prefs.pipSizeIndex = PipSize.EXTRA_SMALL.ordinal
                                "small" -> prefs.pipSizeIndex = PipSize.SMALL.ordinal
                                "medium_small" -> prefs.pipSizeIndex = PipSize.MEDIUM_SMALL.ordinal
                                "medium" -> prefs.pipSizeIndex = PipSize.MEDIUM.ordinal
                                "medium_large" -> prefs.pipSizeIndex = PipSize.MEDIUM_LARGE.ordinal
                                "large" -> prefs.pipSizeIndex = PipSize.LARGE.ordinal
                                "extra_large" -> prefs.pipSizeIndex = PipSize.EXTRA_LARGE.ordinal
                                "cinema" -> prefs.pipSizeIndex = PipSize.CINEMA.ordinal
                            }
                        }
                        val serverPipDur = event.optInt("pip_duration_seconds", 0)
                        if (serverPipDur > 0) {
                            when (serverPipDur) {
                                5 -> prefs.pipDurationIndex = PipDuration.D_5S.ordinal
                                10 -> prefs.pipDurationIndex = PipDuration.D_10S.ordinal
                                15 -> prefs.pipDurationIndex = PipDuration.D_15S.ordinal
                                20 -> prefs.pipDurationIndex = PipDuration.D_20S.ordinal
                                30 -> prefs.pipDurationIndex = PipDuration.D_30S.ordinal
                                45 -> prefs.pipDurationIndex = PipDuration.D_45S.ordinal
                                60 -> prefs.pipDurationIndex = PipDuration.D_60S.ordinal
                            }
                        }
                        val serverPipPos = event.optString("pip_position", "")
                        if (serverPipPos.isNotBlank()) {
                            try {
                                val posEnum = PipPosition.valueOf(serverPipPos.uppercase())
                                prefs.pipPositionIndex = posEnum.ordinal
                            } catch (e: Exception) {
                                android.util.Log.w("OverlayService", "Unknown pip_position: $serverPipPos")
                            }
                        }
                        // Refresh in background and synchronize
                        serviceScope.launch {
                            try {
                                val updated = SentinelaRepository.getDevicePolicy(prefs.deviceIdentifier)
                                syncPolicyWithPrefs(updated, prefs)
                            } catch (e: Exception) {
                                android.util.Log.d("OverlayService", "Policy refresh: ${e.message}")
                            }
                        }
                        android.util.Log.i("OverlayService", "Device config updated via WebSocket: size=$serverPipSize, dur=$serverPipDur, pos=$serverPipPos")
                    }
                    return@collect
                }

                if (evType == "pip_alert" || evType == "FRIGATE_EVENT" || evType == "NEW_DETECTION" || isMotionActive) {
                    val targetIdent = event.optString("target_identifier", "")
                    if (targetIdent.isNotBlank() && targetIdent != prefs.deviceIdentifier) {
                        return@collect // Directed specifically to another device
                    }

                    val testId = if (event.has("test_id")) event.optString("test_id") else null
                    val camera = event.optString("camera", "camera_secundaria")
                    val label = event.optString("label", if (isMotionActive) "MOVIMENTO" else "DETECÇÃO")
                    val customSnap = if (event.has("snapshot_url")) event.optString("snapshot_url") else null
                    val customStream = if (event.has("stream_url")) event.optString("stream_url") else null
                    val isTestAlert = evType == "pip_alert" || label.contains("TEST", ignoreCase = true) || label.contains("ALERTA", ignoreCase = true)
                    val alertPipPos = if (event.has("pip_position")) event.optString("pip_position") else null
                    val alertPipSize = if (event.has("pip_size")) event.optString("pip_size") else null
                    val alertDuration = if (event.has("duration")) event.optInt("duration", 0) else 0

                    val policy = cachedDevicePolicy
                    if (isTestAlert) {
                        // Instant rendering for test triggers: 0ms latency, zero blocking HTTP calls
                        showPiP(camera, label, policy, testId, customSnap, customStream, alertPipPos, alertPipSize, alertDuration)
                    } else if (policy != null) {
                        if (policy.permissionStatus == "allowed" && policy.allowPipAlerts) {
                            val camAllowed = policy.allowedCameras.isEmpty() || policy.allowedCameras.contains(camera)
                            val eventAllowed = policy.allowedEvents.isEmpty() || policy.allowedEvents.any { ev: String -> ev.equals(label, ignoreCase = true) }
                            if (camAllowed && eventAllowed) {
                                showPiP(camera, label, policy, testId, customSnap, customStream, alertPipPos, alertPipSize, alertDuration)
                            } else if (testId != null) {
                                serviceScope.launch {
                                    SentinelaRepository.sendPipAck(
                                        prefs.deviceIdentifier, testId, success = false,
                                        message = "Alerta bloqueado por política de eventos/câmeras"
                                    )
                                }
                            }
                        } else if (testId != null) {
                            serviceScope.launch {
                                SentinelaRepository.sendPipAck(
                                    prefs.deviceIdentifier, testId, success = false,
                                    message = "Alertas PiP desativados nas permissões da TV"
                                )
                            }
                        }
                    } else {
                        // Immediate fallback using local preferences if policy cache is pending
                        if (prefs.allowPipAlerts) {
                            showPiP(camera, label, null, testId, customSnap, customStream, alertPipPos, alertPipSize, alertDuration)
                        }
                    }

                    // Background asynchronous policy refresh (never blocks display)
                    serviceScope.launch {
                        try {
                            val updated = SentinelaRepository.getDevicePolicy(prefs.deviceIdentifier)
                            syncPolicyWithPrefs(updated, prefs)
                        } catch (e: Exception) {
                            android.util.Log.d("OverlayService", "Background policy fetch: ${e.message}")
                        }
                    }
                }
            }
        }
    }

    private fun syncPolicyWithPrefs(policy: DevicePolicy, prefs: SentinelaPreferences) {
        cachedDevicePolicy = policy
        if (policy.friendlyName.isNotBlank()) prefs.friendlyName = policy.friendlyName
        prefs.allowPipAlerts = policy.allowPipAlerts
        if (policy.pipPosition.isNotBlank()) {
            try {
                prefs.pipPositionIndex = PipPosition.valueOf(policy.pipPosition.uppercase()).ordinal
            } catch (e: Exception) {}
        }
        if (policy.pipDefaultSize.isNotBlank()) {
            when (policy.pipDefaultSize.lowercase()) {
                "mini", "extra_small" -> prefs.pipSizeIndex = PipSize.EXTRA_SMALL.ordinal
                "small" -> prefs.pipSizeIndex = PipSize.SMALL.ordinal
                "medium_small" -> prefs.pipSizeIndex = PipSize.MEDIUM_SMALL.ordinal
                "medium" -> prefs.pipSizeIndex = PipSize.MEDIUM.ordinal
                "medium_large" -> prefs.pipSizeIndex = PipSize.MEDIUM_LARGE.ordinal
                "large" -> prefs.pipSizeIndex = PipSize.LARGE.ordinal
                "extra_large" -> prefs.pipSizeIndex = PipSize.EXTRA_LARGE.ordinal
                "cinema" -> prefs.pipSizeIndex = PipSize.CINEMA.ordinal
            }
        }
        if (policy.pipDurationSeconds > 0) {
            when (policy.pipDurationSeconds) {
                5 -> prefs.pipDurationIndex = PipDuration.D_5S.ordinal
                10 -> prefs.pipDurationIndex = PipDuration.D_10S.ordinal
                15 -> prefs.pipDurationIndex = PipDuration.D_15S.ordinal
                20 -> prefs.pipDurationIndex = PipDuration.D_20S.ordinal
                30 -> prefs.pipDurationIndex = PipDuration.D_30S.ordinal
                45 -> prefs.pipDurationIndex = PipDuration.D_45S.ordinal
                60 -> prefs.pipDurationIndex = PipDuration.D_60S.ordinal
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "ACTION_SHOW_PIP") {
            val cam = intent.getStringExtra("camera") ?: "camera_secundaria"
            val label = intent.getStringExtra("label") ?: "TESTE PIP"
            val testId = intent.getStringExtra("test_id")
            val customSnap = intent.getStringExtra("snapshot_url")
            val customStream = intent.getStringExtra("stream_url")
            showPiP(cam, label, null, testId, customSnap, customStream)
        }
        return START_STICKY
    }

    companion object {
        fun triggerPiP(context: Context, camera: String = "camera_secundaria", label: String = "TESTE PIP", testId: String? = null, snapshotUrl: String? = null, streamUrl: String? = null) {
            try {
                val intent = Intent(context, OverlayService::class.java).apply {
                    action = "ACTION_SHOW_PIP"
                    putExtra("camera", camera)
                    putExtra("label", label)
                    if (testId != null) putExtra("test_id", testId)
                    if (snapshotUrl != null) putExtra("snapshot_url", snapshotUrl)
                    if (streamUrl != null) putExtra("stream_url", streamUrl)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                android.util.Log.e("OverlayService", "Failed to trigger PiP: ${e.message}")
            }
        }
    }

    private fun normalizeUrl(url: String?, defaultPath: String): String {
        val base = SentinelaConfig.BASE_URL.trimEnd('/')
        if (url.isNullOrBlank()) {
            return "$base$defaultPath"
        }
        val trimmed = url.trim()
        if (trimmed.startsWith("/")) {
            return "$base$trimmed"
        }
        val isBaseTailscale = base.contains(".ts.net") || base.startsWith("https://")
        val isInternalOrLan = trimmed.contains("192.168.") || trimmed.contains("10.") ||
            trimmed.contains("172.") || trimmed.contains("frigate:5000") ||
            trimmed.contains("backend:8080") || trimmed.contains("localhost:8088") ||
            trimmed.contains("127.0.0.1:8088")

        if (isInternalOrLan || (isBaseTailscale && !trimmed.contains(".ts.net"))) {
            val path = trimmed.substringAfter("://").substringAfter("/", "")
            return if (path.isNotBlank()) "$base/$path" else "$base$defaultPath"
        }
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            if (trimmed.contains(".ts.net:8088")) {
                return trimmed.replace(".ts.net:8088", ".ts.net").replace("http://", "https://")
            }
            if (trimmed.contains(".ts.net") && trimmed.startsWith("http://")) {
                return trimmed.replace("http://", "https://")
            }
            return trimmed
        }
        return "$base/$trimmed"
    }

    private fun loadSnapshotWithFallbacks(
        imageView: android.widget.ImageView,
        primaryUrl: String,
        camera: String
    ) {
        val base = SentinelaConfig.BASE_URL.trimEnd('/')
        val fastGo2rtc = "$base/go2rtc/api/frame.jpeg?src=$camera&t=${System.currentTimeMillis()}"
        val fallbackFrigate = "$base/frigate/api/$camera/latest.jpg?t=${System.currentTimeMillis()}"

        serviceScope.launch(Dispatchers.IO) {
            // Prioritize fast RAM frame from go2rtc, then event snapshot, then camera latest
            val candidateUrls = listOf(fastGo2rtc, primaryUrl, fallbackFrigate).filter { it.isNotBlank() }.distinct()
            val imageLoader = coil.Coil.imageLoader(applicationContext)

            for (url in candidateUrls) {
                try {
                    val req = coil.request.ImageRequest.Builder(applicationContext)
                        .data(url)
                        .size(coil.size.Size.ORIGINAL)
                        .allowHardware(false)
                        .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
                        .diskCachePolicy(coil.request.CachePolicy.DISABLED)
                        .build()

                    val result = imageLoader.execute(req)
                    if (result is coil.request.SuccessResult) {
                        val bitmap = (result.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
                        withContext(Dispatchers.Main) {
                            if (bitmap != null) {
                                imageView.setImageBitmap(bitmap)
                            } else {
                                imageView.setImageDrawable(result.drawable)
                            }
                            imageView.visibility = View.VISIBLE
                        }
                        android.util.Log.i("OverlayService", "✅ PiP Snapshot successfully displayed from $url")
                        return@launch
                    }
                } catch (e: Exception) {
                    android.util.Log.w("OverlayService", "Failed to fetch snapshot candidate $url: ${e.message}")
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun showPiP(
        camera: String,
        label: String,
        policy: DevicePolicy? = null,
        testId: String? = null,
        customSnapshotUrl: String? = null,
        customStreamUrl: String? = null,
        overridePosition: String? = null,
        overrideSize: String? = null,
        overrideDuration: Int? = null
    ) {
        pipJob?.cancel()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this)) {
            android.util.Log.w("OverlayService", "Cannot display PiP overlay: Permission SYSTEM_ALERT_WINDOW not granted")
            if (testId != null) {
                val prefs = SentinelaPreferences(this)
                serviceScope.launch {
                    SentinelaRepository.sendPipAck(prefs.deviceIdentifier, testId, success = false, message = "Permissão SYSTEM_ALERT_WINDOW não concedida")
                }
            }
            return
        }

        val prefs = SentinelaPreferences(this)
        if (!prefs.allowPipAlerts || (policy != null && !policy.allowPipAlerts)) {
            android.util.Log.i("OverlayService", "PiP alerts disabled by policy, skipping.")
            if (testId != null) {
                serviceScope.launch {
                    SentinelaRepository.sendPipAck(prefs.deviceIdentifier, testId, success = false, message = "Alertas PiP desativados por política")
                }
            }
            return
        }

        // Dynamically resolve PiP size: override > policy > preferences, and lock into preferences
        val rawSize = if (!overrideSize.isNullOrBlank()) overrideSize
                      else if (policy != null && policy.pipDefaultSize.isNotBlank()) policy.pipDefaultSize
                      else null
        val pipSize = if (!rawSize.isNullOrBlank()) {
            val s = when (rawSize.lowercase()) {
                "mini", "extra_small" -> PipSize.EXTRA_SMALL
                "small" -> PipSize.SMALL
                "medium_small" -> PipSize.MEDIUM_SMALL
                "medium" -> PipSize.MEDIUM
                "medium_large" -> PipSize.MEDIUM_LARGE
                "large" -> PipSize.LARGE
                "extra_large" -> PipSize.EXTRA_LARGE
                "cinema" -> PipSize.CINEMA
                else -> prefs.currentPipSize
            }
            prefs.pipSizeIndex = s.ordinal
            s
        } else {
            prefs.currentPipSize
        }

        // Dynamically resolve PiP position: override > policy > preferences, and lock into preferences
        val rawPos = if (!overridePosition.isNullOrBlank()) overridePosition
                     else if (policy != null && policy.pipPosition.isNotBlank()) policy.pipPosition
                     else null
        val pipPos = if (!rawPos.isNullOrBlank()) {
            try {
                val p = PipPosition.valueOf(rawPos.uppercase())
                prefs.pipPositionIndex = p.ordinal
                p
            } catch (e: Exception) {
                prefs.currentPipPosition
            }
        } else {
            prefs.currentPipPosition
        }

        val durationSeconds = if (overrideDuration != null && overrideDuration > 0) {
            overrideDuration
        } else if (policy != null && policy.pipDurationSeconds > 0) {
            policy.pipDurationSeconds
        } else if (prefs.currentPipDuration.seconds > 0) {
            prefs.currentPipDuration.seconds
        } else {
            10
        }

        val resolvedCamera = if (camera.isBlank() || camera == "camera_principal") "camera_secundaria" else camera
        val baseStreamUrl = normalizeUrl(customStreamUrl, "/go2rtc/stream.html?src=${resolvedCamera}&mode=webrtc,mse,mjpeg")
        val streamUrl = baseStreamUrl // webrtc is preferred to avoid huge buffer delays over Tailscale
        val snapshotUrl = normalizeUrl(customSnapshotUrl, "/go2rtc/api/frame.jpeg?src=${resolvedCamera}&t=${System.currentTimeMillis()}")

        try {
            val params = WindowManager.LayoutParams(
                pipSize.width, pipSize.height,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = pipPos.gravity
                x = 32
                y = 32
            }

            if (overlayView == null) {
                val root = FrameLayout(this).apply {
                    setBackgroundColor(0xFF06B6D4.toInt()) // Cyan border
                    setPadding(4, 4, 4, 4)
                }

                val inner = FrameLayout(this).apply {
                    setBackgroundColor(0xFF000000.toInt())
                }

                // 1. Instant Snapshot Base Layer (FIT_CENTER preserves 100% full FOV without zoom or cropping)
                val snapImageView = android.widget.ImageView(this).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                    scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                }
                pipImageView = snapImageView
                inner.addView(snapImageView)

                // Load instant image with Coil and cascading fallbacks
                loadSnapshotWithFallbacks(snapImageView, snapshotUrl, resolvedCamera)

                // 2. Hardware Video Stream Layer (Warm Reusable Instance)
                // Starts invisible so the snapshot ImageView shows immediately;
                // WebView becomes visible ONLY after frames start rendering via JavascriptInterface callback.
                val wv = WebView(this).apply {
                    visibility = View.INVISIBLE
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(Color.TRANSPARENT)
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

                    resumeTimers()
                    onResume()

                    addJavascriptInterface(object {
                        @android.webkit.JavascriptInterface
                        fun onVideoPlaying() {
                            serviceScope.launch(Dispatchers.Main) {
                                if (overlayView != null) {
                                    pipWebView?.visibility = View.VISIBLE
                                }
                            }
                        }
                    }, "SentinelaNative")

                    isVerticalScrollBarEnabled = false
                    isHorizontalScrollBarEnabled = false
                    webChromeClient = object : WebChromeClient() {
                        override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                            request?.grant(request.resources)
                        }
                    }
                    webViewClient = object : WebViewClient() {
                        override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                            handler?.proceed()
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            // object-fit: contain preserves full camera aspect ratio without artificial zooming
                            val js = "javascript:(function() {" +
                                    "var style = document.createElement('style');" +
                                    "style.innerHTML = 'html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent !important; display:flex; justify-content:center; align-items:center; } " +
                                    "video-stream, video { width:100% !important; height:100% !important; object-fit:contain !important; background:transparent !important; } " +
                                    "* { outline:none !important; }';" +
                                    "document.head.appendChild(style);" +
                                    "var notifyPlaying = function() { " +
                                    "  if (window.SentinelaNative && window.SentinelaNative.onVideoPlaying) { " +
                                    "    window.SentinelaNative.onVideoPlaying(); " +
                                    "  } " +
                                    "};" +
                                    "var checkVideo = function() {" +
                                    "  var v = document.querySelector('video');" +
                                    "  if (v) {" +
                                    "    v.muted = true;" +
                                    "    v.setAttribute('muted', 'true');" +
                                    "    v.setAttribute('playsinline', 'true');" +
                                    "    v.addEventListener('timeupdate', function() { if (v.currentTime > 0.2) notifyPlaying(); });" +
                                    "    if (v.currentTime > 0.2) notifyPlaying();" +
                                    "    if (v.paused) { v.play().catch(function(){}); }" +
                                    "  }" +
                                    "};" +
                                    "checkVideo();" +
                                    "setInterval(checkVideo, 500);" +
                                    "document.querySelectorAll('video-stream').forEach(function(el) { " +
                                    "  el.background = true; " +
                                    "  el.visibilityCheck = false; " +
                                    "  if (el.video) { el.video.muted = true; el.video.setAttribute('muted', 'true'); el.video.setAttribute('playsinline', 'true'); el.video.play().catch(function(){}); } " +
                                    "});" +
                                    "})();"
                            view?.evaluateJavascript(js, null)
                        }
                    }
                }
                pipWebView = wv
                inner.addView(wv)

                // 3. Top HUD Bar (Camera name & Label badge)
                val hudBar = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    setBackgroundColor(0xCC050E1A.toInt()) // Dark glassy background
                    setPadding(14, 8, 14, 8)
                    gravity = Gravity.CENTER_VERTICAL
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        gravity = Gravity.TOP
                    }
                }

                val dot = View(this).apply {
                    layoutParams = LinearLayout.LayoutParams(14, 14).apply {
                        marginEnd = 10
                    }
                    setBackgroundColor(0xFFEF4444.toInt()) // Red Live Dot
                }
                hudBar.addView(dot)

                val tv = TextView(this).apply {
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
                    typeface = Typeface.DEFAULT_BOLD
                    text = "${camera.uppercase()} • ${label.uppercase()} • INSTANTÂNEO"
                }
                pipTitleView = tv
                hudBar.addView(tv)
                inner.addView(hudBar)

                root.addView(inner)
                overlayView = root
                windowManager.addView(overlayView, params)
                wv.loadUrl(streamUrl)
            } else {
                pipTitleView?.text = "${camera.uppercase()} • ${label.uppercase()} • INSTANTÂNEO"

                // FIX #2: Reload snapshot on reuse with cascading fallbacks
                pipImageView?.let { iv ->
                    loadSnapshotWithFallbacks(iv, snapshotUrl, resolvedCamera)
                }

                // FIX #3: Hide WebView again while the new stream loads
                pipWebView?.visibility = View.INVISIBLE
                pipWebView?.onResume()
                if (overlayView?.parent == null) {
                    windowManager.addView(overlayView, params)
                } else {
                    val currentParams = overlayView?.layoutParams as? WindowManager.LayoutParams
                    if (currentParams?.gravity != params.gravity ||
                        currentParams?.width != params.width ||
                        currentParams?.height != params.height) {
                        windowManager.updateViewLayout(overlayView, params)
                    }
                }
                pipWebView?.loadUrl(streamUrl)
            }

            // Confirmação de execução física comprovada na tela
            if (testId != null) {
                serviceScope.launch {
                    SentinelaRepository.sendPipAck(
                        prefs.deviceIdentifier,
                        testId,
                        success = true,
                        message = "PiP renderizado com sucesso na tela (${pipSize.width}x${pipSize.height}, ${durationSeconds}s)",
                        dimensions = "${pipSize.width}x${pipSize.height}",
                        durationSeconds = durationSeconds
                    )
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("OverlayService", "Failed to render PiP Window: ${e.message}")
            if (testId != null) {
                serviceScope.launch {
                    SentinelaRepository.sendPipAck(
                        prefs.deviceIdentifier,
                        testId,
                        success = false,
                        message = "Falha ao renderizar janela: ${e.message}"
                    )
                }
            }
            return
        }

        // Continuous Snapshot Refresh Loop (Updates image every 800ms directly to Bitmap so it NEVER goes black)
        snapshotRefreshJob?.cancel()
        snapshotRefreshJob = serviceScope.launch(Dispatchers.IO) {
            val base = SentinelaConfig.BASE_URL.trimEnd('/')
            val imageLoader = coil.Coil.imageLoader(applicationContext)
            while (isActive) {
                delay(800L)
                try {
                    val refreshSnapUrl = "$base/go2rtc/api/frame.jpeg?src=${resolvedCamera}&t=${System.currentTimeMillis()}"
                    val req = coil.request.ImageRequest.Builder(applicationContext)
                        .data(refreshSnapUrl)
                        .size(coil.size.Size.ORIGINAL)
                        .allowHardware(false)
                        .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
                        .diskCachePolicy(coil.request.CachePolicy.DISABLED)
                        .build()
                    val res = imageLoader.execute(req)
                    if (res is coil.request.SuccessResult) {
                        val bmp = (res.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
                        withContext(Dispatchers.Main) {
                            pipImageView?.let { iv ->
                                if (bmp != null) iv.setImageBitmap(bmp) else iv.setImageDrawable(res.drawable)
                            }
                        }
                    }
                } catch (e: Exception) {
                    // Ignore transient tick
                }
            }
        }

        val duration = durationSeconds
        pipJob = serviceScope.launch {
            delay(duration * 1000L)
            removePiP()
        }
    }

    private fun removePiP() {
        try {
            snapshotRefreshJob?.cancel()
            snapshotRefreshJob = null
            pipWebView?.onPause()
            pipWebView?.stopLoading()
            overlayView?.let { v ->
                if (v.parent != null) {
                    windowManager.removeViewImmediate(v)
                }
            }
            pipWebView?.destroy()
            pipWebView = null
            pipImageView = null
            pipTitleView = null
            overlayView = null
        } catch (e: Exception) {
            android.util.Log.e("OverlayService", "Error removing overlay view: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
        removePiP()
        try {
            pipWebView?.destroy()
        } catch (e: Exception) {}
        pipWebView = null
        overlayView = null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "sentinela_pip",
                "Sentinela PiP Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, "sentinela_pip")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentTitle("Sentinela Pro")
            .setContentText("Monitorando eventos em segundo plano")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
