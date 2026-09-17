package com.sentinela.pro

import android.app.UiModeManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.sentinela.pro.data.CameraItem
import com.sentinela.pro.ui.SmartphoneYouTubeScreen
import com.sentinela.pro.tv.TvNetflixScreen
import com.sentinela.pro.tv.OverlayService
import com.sentinela.pro.network.SentinelaRepository
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val prefs = com.sentinela.pro.data.SentinelaPreferences(this)
        SentinelaConfig.currentHost = prefs.serverHost
        val deviceType = if (isTv()) "android_tv" else "smartphone"

        // Inicializa observabilidade distribuída
        com.sentinela.pro.logging.SentinelaRemoteLogger.init(this)
        com.sentinela.pro.logging.SentinelaRemoteLogger.log(
            category = com.sentinela.pro.logging.LogCategory.SYSTEM,
            action = "APP_LAUNCHED",
            severity = com.sentinela.pro.logging.LogSeverity.INFO,
            message = "Aplicativo iniciado no modo $deviceType (${android.os.Build.MODEL}, Android ${android.os.Build.VERSION.RELEASE})",
            metadata = mapOf(
                "device_model" to android.os.Build.MODEL,
                "device_type" to deviceType,
                "server_host" to prefs.serverHost
            )
        )

        // Start background service for PiP & WebSocket listener STRICTLY on Android TV
        val shouldStartOverlay = isTv()
        if (shouldStartOverlay) {
            try {
                val intent = Intent(this, OverlayService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent)
                } else {
                    startService(intent)
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Failed to start OverlayService on TV: ${e.message}")
            }
        }

        // Setup SSL bypass for Tailscale / LAN certificates & Global Coil ImageLoader
        val globalImageLoader = try {
            val trustAllCerts = arrayOf<javax.net.ssl.TrustManager>(object : javax.net.ssl.X509TrustManager {
                override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
            })
            val sslContext = javax.net.ssl.SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            
            // For HttpsURLConnection
            javax.net.ssl.HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.socketFactory)
            javax.net.ssl.HttpsURLConnection.setDefaultHostnameVerifier { _, _ -> true }

            // For Coil AsyncImage (used in all screens)
            val okHttpClient = okhttp3.OkHttpClient.Builder()
                .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as javax.net.ssl.X509TrustManager)
                .hostnameVerifier { _, _ -> true }
                .build()

            val loader = coil.ImageLoader.Builder(this)
                .okHttpClient(okHttpClient)
                .diskCachePolicy(coil.request.CachePolicy.DISABLED)
                .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
                .build()

            coil.Coil.setImageLoader(loader)
            loader
        } catch (e: Exception) {
            Log.w("MainActivity", "SSL/Coil setup: ${e.message}")
            coil.ImageLoader.Builder(this).build().also { coil.Coil.setImageLoader(it) }
        }

        setContent {
            val coroutineScope = rememberCoroutineScope()
            var cameras by remember { 
                mutableStateOf(listOf(
                    CameraItem("camera_secundaria", "Câmera IP ONVIF (192.168.1.6)")
                )) 
            }

            fun loadCameras() {
                coroutineScope.launch {
                    SentinelaConfig.currentHost = prefs.serverHost
                    SentinelaRepository.registerOrHeartbeat(
                        deviceIdentifier = prefs.deviceIdentifier,
                        friendlyName = prefs.friendlyName,
                        deviceType = deviceType,
                        appVersion = "v${com.sentinela.pro.BuildConfig.VERSION_NAME}",
                        prefs = prefs
                    )
                    val fetched = SentinelaRepository.getCameras(prefs.deviceIdentifier)
                    if (fetched.isNotEmpty()) {
                        cameras = fetched
                    }
                }
            }

            LaunchedEffect(Unit) {
                loadCameras()
                // Periodic heartbeat every 25 seconds to keep device marked as online in /screens
                while (true) {
                    kotlinx.coroutines.delay(25000)
                    SentinelaRepository.registerOrHeartbeat(
                        deviceIdentifier = prefs.deviceIdentifier,
                        friendlyName = prefs.friendlyName,
                        deviceType = deviceType,
                        appVersion = "v${com.sentinela.pro.BuildConfig.VERSION_NAME}",
                        prefs = prefs
                    )
                }
            }

            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    if (isTv()) {
                        TvNetflixScreen(
                            cameras = cameras,
                            onRefresh = { loadCameras() }
                        )
                    } else {
                        SmartphoneYouTubeScreen(
                            cameras = cameras,
                            onRefresh = { loadCameras() }
                        )
                    }
                }
            }
        }
    }

    private fun isTv(): Boolean {
        return SentinelaConfig.isTv(this)
    }

    private fun hasOverlayPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this)
        }
        return true
    }
}
