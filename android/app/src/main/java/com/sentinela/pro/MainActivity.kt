package com.sentinela.pro

import android.app.UiModeManager
import android.content.Context
import android.content.Intent
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
        
        // Start background service for PiP if on Android TV and has permission
        if (isTv() && hasOverlayPermission()) {
            val intent = Intent(this, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } else if (isTv() && !hasOverlayPermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
                startActivity(intent)
            }
        }

        val prefs = com.sentinela.pro.data.SentinelaPreferences(this)
        SentinelaConfig.currentHost = prefs.serverHost
        val deviceType = if (isTv()) "android_tv" else "smartphone"

        // Setup SSL bypass for Tailscale / LAN certificates & Global Coil ImageLoader
        try {
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

            val globalImageLoader = coil.ImageLoader.Builder(this)
                .okHttpClient(okHttpClient)
                .diskCachePolicy(coil.request.CachePolicy.DISABLED)
                .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
                .build()

            coil.Coil.setImageLoader(globalImageLoader)
        } catch (e: Exception) {
            Log.w("MainActivity", "SSL/Coil setup: ${e.message}")
        }

        setContent {
            val coroutineScope = rememberCoroutineScope()
            var cameras by remember { 
                mutableStateOf(listOf(CameraItem("camera_principal", "Câmera Principal"))) 
            }

            fun loadCameras() {
                coroutineScope.launch {
                    SentinelaConfig.currentHost = prefs.serverHost
                    SentinelaRepository.registerOrHeartbeat(
                        deviceIdentifier = prefs.deviceIdentifier,
                        friendlyName = prefs.friendlyName,
                        deviceType = deviceType
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
                        deviceType = deviceType
                    )
                }
            }

            CompositionLocalProvider(coil.compose.LocalImageLoader provides globalImageLoader) {
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
    }

    private fun isTv(): Boolean {
        if (BuildConfig.FLAVOR == "tv") return true
        if (BuildConfig.FLAVOR == "smartphone") return false
        val uiModeManager = getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
        return uiModeManager.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    }

    private fun hasOverlayPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this)
        }
        return true
    }
}
