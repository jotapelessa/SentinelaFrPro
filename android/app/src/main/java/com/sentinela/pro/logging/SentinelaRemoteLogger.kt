package com.sentinela.pro.logging

import android.content.Context
import android.util.Log
import com.sentinela.pro.data.SentinelaPreferences
import com.sentinela.pro.network.SentinelaRepository
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

enum class LogCategory {
    PIP,
    PLAYER,
    TOOLS,
    NETWORK,
    NAVIGATION,
    SYSTEM
}

enum class LogSeverity {
    INFO,
    WARNING,
    ERROR,
    SUCCESS
}

data class ClientLogEntry(
    val category: LogCategory,
    val action: String,
    val severity: LogSeverity,
    val message: String,
    val metadata: Map<String, Any> = emptyMap(),
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * SentinelaRemoteLogger:
 * Singleton thread-safe de observabilidade distribuída.
 * Enfileira eventos em um Ring Buffer leve em memória e despacha em lote a cada 3.5s (ou instantâneo para erros)
 * via HTTP POST assíncrono para o servidor Sentinela Core sem jamais bloquear a thread de renderização da Smart TV.
 */
object SentinelaRemoteLogger {
    private const val TAG = "RemoteLogger"
    private const val MAX_BUFFER_SIZE = 250
    private const val BATCH_SIZE = 50

    private val queue = ConcurrentLinkedQueue<ClientLogEntry>()
    private val isFlushing = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var appContext: Context? = null
    private var isInitialized = false

    fun init(context: Context) {
        if (isInitialized) return
        appContext = context.applicationContext
        isInitialized = true

        // Inicia o Dispatcher periódico em segundo plano
        scope.launch {
            while (isActive) {
                delay(3500)
                flushBatch()
            }
        }
        Log.i(TAG, "SentinelaRemoteLogger inicializado com sucesso.")
    }

    fun log(
        category: LogCategory,
        action: String,
        severity: LogSeverity = LogSeverity.INFO,
        message: String,
        metadata: Map<String, Any> = emptyMap()
    ) {
        // Drop FIFO se ultrapassar o limite para garantir consumo de memória zero
        while (queue.size >= MAX_BUFFER_SIZE) {
            queue.poll()
        }

        val entry = ClientLogEntry(
            category = category,
            action = action,
            severity = severity,
            message = message,
            metadata = metadata,
            timestamp = System.currentTimeMillis()
        )
        queue.offer(entry)

        // Se for erro crítico, tenta despacho prioritário imediato (0ms)
        if (severity == LogSeverity.ERROR) {
            scope.launch { flushBatch() }
        }
    }

    fun log(
        category: String,
        action: String,
        severity: String = "INFO",
        message: String,
        metadata: Map<String, Any> = emptyMap()
    ) {
        val catEnum = try {
            LogCategory.valueOf(category.uppercase())
        } catch (e: Exception) {
            LogCategory.SYSTEM
        }
        val sevEnum = when (severity.uppercase()) {
            "WARN", "WARNING" -> LogSeverity.WARNING
            "ERROR", "CRITICAL" -> LogSeverity.ERROR
            "SUCCESS" -> LogSeverity.SUCCESS
            else -> LogSeverity.INFO
        }
        log(catEnum, action, sevEnum, message, metadata)
    }

    fun flushNow() {
        scope.launch { flushBatch() }
    }

    private suspend fun flushBatch() {
        val ctx = appContext ?: return
        if (queue.isEmpty()) return
        if (!isFlushing.compareAndSet(false, true)) return

        val batch = mutableListOf<ClientLogEntry>()
        while (batch.size < BATCH_SIZE) {
            val item = queue.poll() ?: break
            batch.add(item)
        }

        if (batch.isEmpty()) {
            isFlushing.set(false)
            return
        }

        try {
            val prefs = SentinelaPreferences(ctx)
            val devId = prefs.deviceIdentifier
            val devName = prefs.friendlyName.ifBlank { devId }
            val devType = if (isTv(ctx)) "android_tv" else "smartphone"

            val success = SentinelaRepository.sendClientLogsBatch(
                deviceIdentifier = devId,
                deviceName = devName,
                deviceType = devType,
                entries = batch
            )

            if (!success) {
                // Em caso de falha de rede/timeout, reinserir no buffer para não perder eventos
                for (item in batch.asReversed()) {
                    if (queue.size < MAX_BUFFER_SIZE) {
                        queue.offer(item)
                    }
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "Falha ao enviar lote de logs: ${e.message}")
            for (item in batch.asReversed()) {
                if (queue.size < MAX_BUFFER_SIZE) {
                    queue.offer(item)
                }
            }
        } finally {
            isFlushing.set(false)
        }
    }

    private fun isTv(context: Context): Boolean {
        return com.sentinela.pro.SentinelaConfig.isTv(context)
    }
}
