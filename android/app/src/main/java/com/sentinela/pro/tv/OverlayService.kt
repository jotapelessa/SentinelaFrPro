package com.sentinela.pro.tv

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.app.NotificationCompat
import com.sentinela.pro.network.SentinelaWebSocket
import kotlinx.coroutines.*
import org.json.JSONObject

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.Main + serviceJob)
    
    // Embedded native server domain (Tailscale Funnel)
    private val webSocket = SentinelaWebSocket(com.sentinela.pro.SentinelaConfig.SERVER_HOST)
    private var pipJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForeground(1, buildNotification())
        
        serviceScope.launch {
            webSocket.connectAndListen()
        }
        
        serviceScope.launch {
            webSocket.events.collect { event ->
                if (event.optString("type") == "pip_alert") {
                    val camera = event.optString("camera")
                    val label = event.optString("label")
                    showPiP(camera, label)
                }
            }
        }
    }

    private fun showPiP(camera: String, label: String) {
        pipJob?.cancel()
        val prefs = com.sentinela.pro.data.SentinelaPreferences(this)
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
            
            overlayView = FrameLayout(this).apply {
                setBackgroundColor(0xFF06B6D4.toInt()) // Cyan border
                setPadding(4, 4, 4, 4) // Border width
                
                val inner = FrameLayout(this@OverlayService).apply {
                    setBackgroundColor(0xFF000000.toInt())
                }
                addView(inner)
            }
            windowManager.addView(overlayView, params)
        }

        if (pipDur.seconds > 0) {
            pipJob = serviceScope.launch {
                delay(pipDur.seconds * 1000L)
                removePiP()
            }
        }
    }

    private fun removePiP() {
        overlayView?.let {
            windowManager.removeView(it)
            overlayView = null
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
            .setContentTitle("Sentinela Pro")
            .setContentText("Monitorando eventos em segundo plano")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
