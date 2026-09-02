package com.sentinela.pro.tv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import coil.ImageLoader
import coil.load
import coil.request.CachePolicy
import com.sentinela.pro.SentinelaConfig
import com.sentinela.pro.data.SentinelaPreferences
import com.sentinela.pro.network.SentinelaWebSocket
import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import org.json.JSONObject
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private var pipImageView: ImageView? = null
    private var pipTitleView: TextView? = null
    
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.Main + serviceJob)
    
    private var webSocket: SentinelaWebSocket? = null
    private var pipJob: Job? = null
    private var frameTickerJob: Job? = null

    private val imageLoader: ImageLoader by lazy {
        val trustAll = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })
        val sslContext = SSLContext.getInstance("SSL").apply {
            init(null, trustAll, SecureRandom())
        }
        val okHttpClient = OkHttpClient.Builder()
            .sslSocketFactory(sslContext.socketFactory, trustAll[0] as X509TrustManager)
            .hostnameVerifier { _, _ -> true }
            .build()

        ImageLoader.Builder(this)
            .okHttpClient(okHttpClient)
            .diskCachePolicy(CachePolicy.DISABLED)
            .memoryCachePolicy(CachePolicy.DISABLED)
            .build()
    }

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
                if (evType == "pip_alert" || evType == "FRIGATE_EVENT") {
                    val camera = event.optString("camera", "camera_principal")
                    val label = event.optString("label", "MOVIMENTO")
                    showPiP(camera, label)
                }
            }
        }
    }

    private fun showPiP(camera: String, label: String) {
        pipJob?.cancel()
        frameTickerJob?.cancel()

        val prefs = SentinelaPreferences(this)
        val pipSize = prefs.currentPipSize
        val pipPos = prefs.currentPipPosition
        val pipDur = prefs.currentPipDuration
        
        if (overlayView == null) {
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
            
            val root = FrameLayout(this).apply {
                setBackgroundColor(0xFF06B6D4.toInt()) // Cyan border
                setPadding(4, 4, 4, 4)
            }

            val inner = FrameLayout(this).apply {
                setBackgroundColor(0xFF000000.toInt())
            }

            val iv = ImageView(this).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                scaleType = ImageView.ScaleType.CENTER_CROP
            }
            pipImageView = iv
            inner.addView(iv)

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
                text = "${camera.uppercase()} • ${label.uppercase()}"
            }
            pipTitleView = tv
            hudBar.addView(tv)
            inner.addView(hudBar)

            root.addView(inner)
            overlayView = root
            windowManager.addView(overlayView, params)
        } else {
            pipTitleView?.text = "${camera.uppercase()} • ${label.uppercase()}"
        }

        // Start live snapshot refresh ticker (updating frame every 500ms)
        frameTickerJob = serviceScope.launch {
            while (isActive) {
                val now = System.currentTimeMillis()
                val snapshotUrl = "${SentinelaConfig.BASE_URL}/frigate/api/$camera/latest.jpg?h=720&t=$now"
                pipImageView?.load(snapshotUrl, imageLoader)
                delay(500)
            }
        }

        if (pipDur.seconds > 0) {
            pipJob = serviceScope.launch {
                delay(pipDur.seconds * 1000L)
                removePiP()
            }
        }
    }

    private fun removePiP() {
        frameTickerJob?.cancel()
        frameTickerJob = null
        overlayView?.let {
            windowManager.removeView(it)
            overlayView = null
            pipImageView = null
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
