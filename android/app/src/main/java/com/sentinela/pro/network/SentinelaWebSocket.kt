package com.sentinela.pro.network

import android.util.Log
import com.sentinela.pro.SentinelaConfig
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class SentinelaWebSocket(private val serverUrl: String = "") {
    private val client: HttpClient by lazy {
        val trustAll = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })
        val sslContext = SSLContext.getInstance("TLS").apply {
            init(null, trustAll, SecureRandom())
        }

        HttpClient(OkHttp) {
            engine {
                config {
                    sslSocketFactory(sslContext.socketFactory, trustAll[0] as X509TrustManager)
                    hostnameVerifier { _, _ -> true }
                }
            }
            install(WebSockets) {
                pingInterval = 20_000
            }
        }
    }

    private val _events = MutableSharedFlow<JSONObject>(extraBufferCapacity = 30)
    val events = _events.asSharedFlow()

    suspend fun connectAndListen() {
        withContext(Dispatchers.IO) {
            while (isActive) {
                try {
                    val wsUrl = SentinelaConfig.WS_URL
                    Log.d("SentinelaWS", "Connecting to WebSocket: $wsUrl...")

                    client.webSocket(urlString = wsUrl) {
                        Log.i("SentinelaWS", "WebSocket connected successfully to $wsUrl!")

                        // Send identification
                        send(Frame.Text(JSONObject().apply {
                            put("type", "auth")
                            put("client_type", "android_tv")
                        }.toString()))

                        for (message in incoming) {
                            message as? Frame.Text ?: continue
                            val text = message.readText()
                            try {
                                val json = JSONObject(text)
                                _events.tryEmit(json)
                            } catch (e: Exception) {
                                Log.e("SentinelaWS", "Parse error: ${e.message}")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w("SentinelaWS", "WebSocket disconnected: ${e.message}. Reconnecting in 3s...")
                }
                delay(3000)
            }
        }
    }
}
