package com.sentinela.pro.network

import android.util.Log
import io.ktor.client.*
import io.ktor.client.engine.okhttp.*
import io.ktor.client.plugins.websocket.*
import io.ktor.http.*
import io.ktor.websocket.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import org.json.JSONObject

class SentinelaWebSocket(private val serverUrl: String) {
    private val client = HttpClient(OkHttp) {
        install(WebSockets) {
            pingInterval = 20_000
        }
    }

    private val _events = MutableSharedFlow<JSONObject>(extraBufferCapacity = 10)
    val events = _events.asSharedFlow()

    suspend fun connectAndListen() {
        withContext(Dispatchers.IO) {
            while (isActive) {
                    val isSecure = serverUrl.contains(".") && !serverUrl.matches(Regex("\\d+\\.\\d+\\.\\d+\\.\\d+"))
                    val port = if (isSecure) 443 else 8080
                    val scheme = if (isSecure) "wss" else "ws"
                    Log.d("SentinelaWS", "Connecting to $scheme://$serverUrl:$port/ws...")
                    
                    val requestBuilder: HttpRequestBuilder.() -> Unit = {
                        url {
                            this.protocol = if (isSecure) URLProtocol.WSS else URLProtocol.WS
                            this.host = serverUrl
                            this.port = port
                            this.path("ws")
                        }
                    }
                    
                    client.webSocket(request = requestBuilder) {
                        Log.d("SentinelaWS", "Connected successfully!")
                        
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
                    Log.e("SentinelaWS", "Disconnected: ${e.message}. Reconnecting in 3s...")
                }
                delay(3000) // Exponential backoff in a real app, 3s fixed for now
            }
        }
    }
}
