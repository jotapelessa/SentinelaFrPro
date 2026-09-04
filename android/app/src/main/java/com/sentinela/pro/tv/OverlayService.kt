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
    
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.Main + serviceJob)
    
    private var webSocket: SentinelaWebSocket? = null
    private var pipJob: Job? = null

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
        
        serviceScope.launch {
            webSocket?.connectAndListen()
        }
        
        serviceScope.launch {
            webSocket?.events?.collect { event ->
                val evType = event.optString("type")
                val isMotionActive = evType == "CAMERA_DETECTION_ACTIVE" && event.optBoolean("active", false)
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
                                30 -> prefs.pipDurationIndex = PipDuration.D_30S.ordinal
                                60 -> prefs.pipDurationIndex = PipDuration.D_60S.ordinal
                            }
                        }
                        android.util.Log.i("OverlayService", "Device config updated via WebSocket: size=$serverPipSize, dur=$serverPipDur")
                    }
                    return@collect
                }

                if (evType == "pip_alert" || evType == "FRIGATE_EVENT" || evType == "NEW_DETECTION" || isMotionActive) {
                    val targetIdent = event.optString("target_identifier", "")
                    if (targetIdent.isNotBlank() && targetIdent != prefs.deviceIdentifier) {
                        return@collect // Directed specifically to another device
                    }

                    val testId = if (event.has("test_id")) event.optString("test_id") else null
                    val camera = event.optString("camera", "camera_principal")
                    val label = event.optString("label", if (isMotionActive) "MOVIMENTO" else "DETECÇÃO")
                    val isTestAlert = evType == "pip_alert" || label.contains("TEST", ignoreCase = true) || label.contains("ALERTA", ignoreCase = true)
                    runCatching {
                        val policy = SentinelaRepository.getDevicePolicy(prefs.deviceIdentifier)
                        if (policy.permissionStatus == "allowed" && policy.allowPipAlerts) {
                            val camAllowed = policy.allowedCameras.isEmpty() || policy.allowedCameras.contains(camera)
                            val eventAllowed = isTestAlert || policy.allowedEvents.isEmpty() || policy.allowedEvents.any { ev -> ev.equals(label, ignoreCase = true) }
                            if (camAllowed && eventAllowed) {
                                showPiP(camera, label, policy, testId)
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
                    }.getOrElse {
                        showPiP(camera, label, null, testId)
                    }
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "ACTION_SHOW_PIP") {
            val cam = intent.getStringExtra("camera") ?: "camera_principal"
            val label = intent.getStringExtra("label") ?: "TESTE PIP"
            val testId = intent.getStringExtra("test_id")
            showPiP(cam, label, null, testId)
        }
        return START_STICKY
    }

    companion object {
        fun triggerPiP(context: Context, camera: String = "camera_principal", label: String = "TESTE PIP", testId: String? = null) {
            try {
                val intent = Intent(context, OverlayService::class.java).apply {
                    action = "ACTION_SHOW_PIP"
                    putExtra("camera", camera)
                    putExtra("label", label)
                    if (testId != null) putExtra("test_id", testId)
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

    @SuppressLint("SetJavaScriptEnabled")
    private fun showPiP(camera: String, label: String, policy: DevicePolicy? = null, testId: String? = null) {
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

        // Dynamically resolve PiP size based on policy or preferences
        val pipSize = if (policy != null && policy.pipDefaultSize.isNotBlank()) {
            when (policy.pipDefaultSize.lowercase()) {
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
        } else {
            prefs.currentPipSize
        }

        val pipPos = prefs.currentPipPosition
        val durationSeconds = if (policy != null && policy.pipDurationSeconds > 0) {
            policy.pipDurationSeconds
        } else if (prefs.currentPipDuration.seconds > 0) {
            prefs.currentPipDuration.seconds
        } else {
            10
        }

        val streamUrl = "${SentinelaConfig.BASE_URL}/go2rtc/stream.html?src=${camera}&mode=webrtc,mse&background=true&width=100%"
        val snapshotUrl = "${SentinelaConfig.BASE_URL}/frigate/api/${camera}/latest.jpg?h=720&t=${System.currentTimeMillis()}"

        try {
            val params = WindowManager.LayoutParams(
                pipSize.width, pipSize.height,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
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

                // 1. Instant Snapshot Base Layer (Loads in 0ms, zero lag!)
                val snapImageView = android.widget.ImageView(this).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                    scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
                }
                inner.addView(snapImageView)

                // Load instant image with Coil
                try {
                    val imageLoader = coil.Coil.imageLoader(this)
                    val req = coil.request.ImageRequest.Builder(this)
                        .data(snapshotUrl)
                        .target(snapImageView)
                        .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
                        .diskCachePolicy(coil.request.CachePolicy.DISABLED)
                        .build()
                    imageLoader.enqueue(req)
                } catch (e: Exception) {
                    android.util.Log.w("OverlayService", "Snapshot pre-load: ${e.message}")
                }

                // 2. Hardware Video Stream Layer (Warm Reusable Instance)
                val wv = WebView(this).apply {
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
                            val js = "javascript:(function() {" +
                                    "var style = document.createElement('style');" +
                                    "style.innerHTML = 'html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent !important; display:flex; justify-content:center; align-items:center; } " +
                                    "video-stream, video { width:100% !important; height:100% !important; object-fit:cover !important; background:transparent !important; } " +
                                    "* { outline:none !important; }';" +
                                    "document.head.appendChild(style);" +
                                    "document.querySelectorAll('video-stream').forEach(function(el) { " +
                                    "  el.background = true; " +
                                    "  el.visibilityCheck = false; " +
                                    "  if (el.video) { el.video.play().catch(function(){}); } " +
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
                pipWebView?.onResume()
                if (overlayView?.parent == null) {
                    windowManager.addView(overlayView, params)
                } else {
                    windowManager.updateViewLayout(overlayView, params)
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

        val duration = durationSeconds
        pipJob = serviceScope.launch {
            delay(duration * 1000L)
            removePiP()
        }
    }

    private fun removePiP() {
        try {
            pipWebView?.onPause()
            pipWebView?.stopLoading()
            overlayView?.let { v ->
                if (v.parent != null) {
                    windowManager.removeViewImmediate(v)
                }
            }
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
