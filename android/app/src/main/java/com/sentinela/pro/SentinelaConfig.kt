package com.sentinela.pro

import android.app.UiModeManager
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Configuration

object SentinelaConfig {
    const val SERVER_HOST = "frigate.tail47a54f.ts.net"
    const val DEFAULT_HOST = SERVER_HOST
    var currentHost: String = DEFAULT_HOST

    fun isTv(context: Context): Boolean {
        // 1. Prioridade máxima ao Flavor do APK compilado
        if (BuildConfig.FLAVOR.equals("tv", ignoreCase = true)) return true
        if (BuildConfig.FLAVOR.equals("smartphone", ignoreCase = true)) return false

        // 2. Detecção dinâmica de SO (Android TV puro ou Leanback Launcher)
        val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
        return uiModeManager?.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION ||
                context.packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
    }

    val BASE_URL: String
        get() {
            val h = currentHost.trim()
            return when {
                h.startsWith("https://") -> h
                h.startsWith("http://") -> {
                    val withoutProto = h.removePrefix("http://")
                    if (withoutProto.contains(":")) h else "$h:8088"
                }
                h.contains(".ts.net") -> "https://$h"
                h.contains(":") -> "http://$h"
                else -> "http://$h:8088"
            }
        }

    val WS_URL: String
        get() {
            val base = BASE_URL
            return if (base.startsWith("https://")) {
                base.replace("https://", "wss://") + "/ws"
            } else {
                base.replace("http://", "ws://") + "/ws"
            }
        }

    fun getSnapshotUrl(cameraName: String, timestamp: Long, height: Int = 480): String {
        return "$BASE_URL/frigate/api/$cameraName/latest.jpg?h=$height&t=$timestamp"
    }

    fun getGo2rtcFrameUrl(cameraName: String, timestamp: Long): String {
        return "$BASE_URL/go2rtc/api/frame.jpeg?src=$cameraName&t=$timestamp"
    }
}

