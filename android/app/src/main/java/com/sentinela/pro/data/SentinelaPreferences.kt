package com.sentinela.pro.data

import android.content.Context
import android.content.SharedPreferences

class SentinelaPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sentinela_prefs", Context.MODE_PRIVATE)

    var pipSizeIndex: Int
        get() = prefs.getInt("pip_size_index", PipSize.MEDIUM.ordinal)
        set(value) = prefs.edit().putInt("pip_size_index", value).apply()

    var pipPositionIndex: Int
        get() = prefs.getInt("pip_position_index", PipPosition.TOP_RIGHT.ordinal)
        set(value) = prefs.edit().putInt("pip_position_index", value).apply()

    var pipDurationIndex: Int
        get() = prefs.getInt("pip_duration_index", PipDuration.D_15S.ordinal)
        set(value) = prefs.edit().putInt("pip_duration_index", value).apply()

    var deviceIdentifier: String
        get() = prefs.getString("device_id", "tela_principal") ?: "tela_principal"
        set(value) = prefs.edit().putString("device_id", value).apply()

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
