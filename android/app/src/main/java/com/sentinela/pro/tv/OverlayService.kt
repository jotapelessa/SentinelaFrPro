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
import com.sentinela.pro.data.SentinelaPreferences
import com.sentinela.pro.network.SentinelaRepository
import com.sentinela.pro.network.SentinelaWebSocket
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
                if (evType == "pip_alert" || evType == "FRIGATE_EVENT" || evType == "NEW_DETECTION" || isMotionActive) {
                    val camera = event.optString("camera", "camera_principal")
                    val label = event.optString("label", if (isMotionActive) "MOVIMENTO" else "DETECÇÃO")
                    runCatching {
                        val policy = SentinelaRepository.getDevicePolicy(prefs.deviceIdentifier)
                        if (policy.permissionStatus == "allowed" && policy.allowPipAlerts) {
                            val camAllowed = policy.allowedCameras.isEmpty() || policy.allowedCameras.contains(camera)
                            val eventAllowed = policy.allowedEvents.isEmpty() || policy.allowedEvents.any { ev -> ev.equals(label, ignoreCase = true) }
                            if (camAllowed && eventAllowed) {
                                showPiP(camera, label)
                            }
                        }
                    }.getOrElse {
                        showPiP(camera, label)
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
            showPiP(cam, label)
        }
        return START_STICKY
    }

    companion object {
        fun triggerPiP(context: Context, camera: String = "camera_principal", label: String = "TESTE PIP") {
            try {
                val intent = Intent(context, OverlayService::class.java).apply {
                    action = "ACTION_SHOW_PIP"
                    putExtra("camera", camera)
                    putExtra("label", label)
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
    private fun showPiP(camera: String, label: String) {
        pipJob?.cancel()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !android.provider.Settings.canDrawOverlays(this)) {
            android.util.Log.w("OverlayService", "Cannot display PiP overlay: Permission SYSTEM_ALERT_WINDOW not granted")
            return
        }

        val prefs = SentinelaPreferences(this)
        val pipSize = prefs.currentPipSize
        val pipPos = prefs.currentPipPosition
        val pipDur = prefs.currentPipDuration
        val streamUrl = "${SentinelaConfig.BASE_URL}/go2rtc/stream.html?src=${camera}&mode=mse&width=100%"

        try {
            val params = WindowManager.LayoutParams(
                pipSize.width, pipSize.height,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    WindowManager.LayoutParams.TYPE_PHONE,
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

                val wv = WebView(this).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(Color.BLACK)
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
                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                            handler?.proceed()
                        }
                    }
                }
                pipWebView = wv
                inner.addView(wv)

                // Top HUD Bar (Camera name & Label badge)
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
                    text = "${camera.uppercase()} • ${label.uppercase()} • 24 FPS"
                }
                pipTitleView = tv
                hudBar.addView(tv)
                inner.addView(hudBar)

                root.addView(inner)
                overlayView = root
                windowManager.addView(overlayView, params)
                wv.loadUrl(streamUrl)
            } else {
                pipTitleView?.text = "${camera.uppercase()} • ${label.uppercase()} • 24 FPS"
                if (overlayView?.parent == null) {
                    windowManager.addView(overlayView, params)
                } else {
                    windowManager.updateViewLayout(overlayView, params)
                }
                pipWebView?.loadUrl(streamUrl)
            }
        } catch (e: Exception) {
            android.util.Log.e("OverlayService", "Failed to render PiP Window: ${e.message}")
            return
        }

        val duration = if (pipDur.seconds > 0) pipDur.seconds else 10
        pipJob = serviceScope.launch {
            delay(duration * 1000L)
            removePiP()
        }
    }

    private fun removePiP() {
        try {
            pipWebView?.let { wv ->
                wv.stopLoading()
                wv.loadUrl("about:blank")
                wv.destroy()
            }
            overlayView?.let { v ->
                if (v.parent != null) {
                    windowManager.removeViewImmediate(v)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("OverlayService", "Error removing overlay view: ${e.message}")
        } finally {
            overlayView = null
            pipWebView = null
            pipTitleView = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
        removePiP()
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
