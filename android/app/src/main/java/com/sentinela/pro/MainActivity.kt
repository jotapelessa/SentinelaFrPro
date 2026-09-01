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
import com.sentinela.pro.ui.MobileGridScreen
import com.sentinela.pro.tv.TvLeanbackGrid
import com.sentinela.pro.tv.OverlayService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

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
            // Request overlay permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
                startActivity(intent)
            }
        }

        setContent {
            var cameras by remember { 
                mutableStateOf(listOf(CameraItem("camera_principal", "Câmera Principal"))) 
            }
            var isLoading by remember { mutableStateOf(true) }

            LaunchedEffect(Unit) {
                val fetched = fetchCameras()
                if (fetched.isNotEmpty()) {
                    cameras = fetched
                }
                isLoading = false
            }

            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    if (isTv()) {
                        TvLeanbackGrid(
                            cameras = cameras,
                            onRefresh = {
                                val fetched = runCatching { fetchCamerasSync() }.getOrDefault(emptyList())
                                if (fetched.isNotEmpty()) cameras = fetched
                            }
                        )
                    } else {
                        MobileGridScreen(
                            cameras = cameras,
                            isLoading = isLoading,
                            onRefresh = {
                                val fetched = runCatching { fetchCamerasSync() }.getOrDefault(emptyList())
                                if (fetched.isNotEmpty()) cameras = fetched
                            }
                        )
                    }
                }
            }
        }
    }

    private suspend fun fetchCameras(): List<CameraItem> = withContext(Dispatchers.IO) {
        fetchCamerasSync()
    }

    private fun fetchCamerasSync(): List<CameraItem> {
        val list = mutableListOf<CameraItem>()
        try {
            val url = URL("${SentinelaConfig.BASE_URL}/api/cameras")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 5000
                readTimeout = 5000
                requestMethod = "GET"
                setRequestProperty("Accept", "application/json")
            }

            if (conn.responseCode == 200) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val response = reader.readText()
                reader.close()

                val jsonArray = JSONArray(response)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val name = obj.optString("name", "camera_$i")
                    val friendlyName = obj.optString("friendly_name", name)
                    val enabled = obj.optBoolean("enabled", true)
                    list.add(CameraItem(name = name, friendlyName = friendlyName, enabled = enabled))
                }
            }
            conn.disconnect()
        } catch (e: Exception) {
            Log.w("MainActivity", "Failed to fetch cameras from ${SentinelaConfig.BASE_URL}: ${e.message}")
        }

        if (list.isEmpty()) {
            list.add(CameraItem("camera_principal", "Câmera Principal", true))
        }
        return list
    }

    private fun isTv(): Boolean {
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
