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

        setContent {
            val coroutineScope = rememberCoroutineScope()
            var cameras by remember { 
                mutableStateOf(listOf(CameraItem("camera_principal", "Câmera Principal"))) 
            }

            fun loadCameras() {
                coroutineScope.launch {
                    val fetched = SentinelaRepository.getCameras()
                    if (fetched.isNotEmpty()) {
                        cameras = fetched
                    }
                }
            }

            LaunchedEffect(Unit) {
                loadCameras()
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
