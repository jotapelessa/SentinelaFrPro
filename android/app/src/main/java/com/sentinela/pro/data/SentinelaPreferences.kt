package com.sentinela.pro.data

import android.content.Context
import android.content.SharedPreferences

class SentinelaPreferences(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sentinela_prefs", Context.MODE_PRIVATE)

    var pipSizeIndex: Int
        get() = prefs.getInt("pip_size_index", PipSize.MEDIUM.ordinal)
        set(value) = prefs.edit().putInt("pip_size_index", value).apply()

    var pipPositionIndex: Int
        get() = prefs.getInt("pip_position_index", PipPosition.TOP_RIGHT.ordinal)
        set(value) = prefs.edit().putInt("pip_position_index", value).apply()

    var pipDurationIndex: Int
        get() = prefs.getInt("pip_duration_index", PipDuration.D_10S.ordinal)
        set(value) = prefs.edit().putInt("pip_duration_index", value).apply()

    var allowPipAlerts: Boolean
        get() = prefs.getBoolean("allow_pip_alerts", true)
        set(value) = prefs.edit().putBoolean("allow_pip_alerts", value).apply()

    var deviceIdentifier: String
        get() {
            val existing = prefs.getString("device_id", null)
            if (!existing.isNullOrBlank()) return existing
            val androidId = try {
                android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID)
            } catch (e: Exception) { null }
            val cleanModel = android.os.Build.MODEL.lowercase().replace("[^a-z0-9]".toRegex(), "_")
            val defaultId = if (!androidId.isNullOrBlank() && androidId != "9774d56d682e549c") {
                "dev_${cleanModel}_${androidId.takeLast(8)}"
            } else {
                "dev_${cleanModel}_" + (1000..9999).random()
            }
            prefs.edit().putString("device_id", defaultId).apply()
            return defaultId
        }
        set(value) = prefs.edit().putString("device_id", value).apply()

    var friendlyName: String
        get() = prefs.getString("friendly_name", "Android (${android.os.Build.MODEL})") ?: "Android TV"
        set(value) = prefs.edit().putString("friendly_name", value).apply()

    var serverHost: String
        get() = prefs.getString("server_host", com.sentinela.pro.SentinelaConfig.SERVER_HOST) ?: com.sentinela.pro.SentinelaConfig.SERVER_HOST
        set(value) = prefs.edit().putString("server_host", value).apply()

    var streamQuality: String
        get() = prefs.getString("stream_quality", "720p") ?: "720p"
        set(value) = prefs.edit().putString("stream_quality", value).apply()

    var refreshIntervalMs: Long
        get() = prefs.getLong("refresh_interval_ms", 200L)
        set(value) = prefs.edit().putLong("refresh_interval_ms", value).apply()

    val currentPipSize: PipSize
        get() = PipSize.values().getOrElse(pipSizeIndex) { PipSize.MEDIUM }

    val currentPipPosition: PipPosition
        get() = PipPosition.values().getOrElse(pipPositionIndex) { PipPosition.TOP_RIGHT }

    val currentPipDuration: PipDuration
        get() = PipDuration.values().getOrElse(pipDurationIndex) { PipDuration.D_15S }
}
