package com.sentinela.pro

object SentinelaConfig {
    const val DEFAULT_HOST = "sentinela.tail47a54f.ts.net"
    var currentHost: String = DEFAULT_HOST

    val BASE_URL: String
        get() {
            val h = currentHost.trim()
            return when {
                h.startsWith("http://") || h.startsWith("https://") -> h
                h.contains(".ts.net") -> "https://$h"
                else -> "http://$h"
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

    fun getSnapshotUrl(cameraName: String, timestamp: Long): String {
        return "$BASE_URL/frigate/api/$cameraName/latest.jpg?h=720&t=$timestamp"
    }

    fun getGo2rtcFrameUrl(cameraName: String, timestamp: Long): String {
        return "$BASE_URL/go2rtc/api/frame.jpeg?src=$cameraName&t=$timestamp"
    }
}
