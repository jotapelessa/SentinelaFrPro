package com.sentinela.pro

object SentinelaConfig {
    // Endereço público nativo do Tailscale Funnel com HTTPS / WSS
    const val SERVER_HOST = "sentinela.tail47a54f.ts.net"
    const val BASE_URL = "https://$SERVER_HOST"
    const val WS_URL = "wss://$SERVER_HOST/ws"
}
