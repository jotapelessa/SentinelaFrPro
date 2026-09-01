package com.sentinela.pro

data class CameraItem(
    val name: String,
    val friendlyName: String = name,
    val enabled: Boolean = true
)

object SentinelaConfig {
    // Endereço público nativo do Tailscale Funnel com HTTPS / WSS
    const val SERVER_HOST = "sentinela.tail47a54f.ts.net"
    const val BASE_URL = "https://$SERVER_HOST"
    const val WS_URL = "wss://$SERVER_HOST/ws"
    
    fun getSnapshotUrl(cameraName: String, timestamp: Long): String {
        return "$BASE_URL/frigate/api/$cameraName/latest.jpg?h=720&t=$timestamp"
    }
}
