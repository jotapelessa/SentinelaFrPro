package com.sentinela.pro.data

import android.content.Context
import android.content.SharedPreferences

class SentinelaPreferences(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sentinela_prefs", Context.MODE_PRIVATE)

    init {
        ensureV186Migration()
    }

    private fun ensureV186Migration() {
        if (!prefs.getBoolean("pip_size_default_v186", false)) {
            val editor = prefs.edit()
            editor.putInt("pip_size_index", PipSize.EXTRA_LARGE.ordinal)
            editor.putBoolean("pip_size_default_v182", true)
            editor.putBoolean("pip_size_default_v186", true)
            editor.putString("pip_player_mode", "webrtc")
            for (key in prefs.all.keys) {
                if (key.startsWith("pip_size_index_")) {
                    editor.putInt(key, PipSize.EXTRA_LARGE.ordinal)
                } else if (key.startsWith("camera_stream_mode_")) {
                    editor.putString(key, "webrtc")
                }
            }
            val defaultSizesJson = org.json.JSONObject().apply {
                put("camera_principal", "EXTRA_LARGE")
                put("cam_192_168_1_196", "EXTRA_LARGE")
                put("camera_secundaria", "EXTRA_LARGE")
                put("cam_192_168_1_47", "EXTRA_LARGE")
            }.toString()
            editor.putString("camera_pip_sizes_json", defaultSizesJson)
            editor.putInt("pip_size_index_camera_principal", PipSize.EXTRA_LARGE.ordinal)
            editor.putInt("pip_size_index_cam_192_168_1_196", PipSize.EXTRA_LARGE.ordinal)
            editor.putInt("pip_size_index_camera_secundaria", PipSize.EXTRA_LARGE.ordinal)
            editor.putInt("pip_size_index_cam_192_168_1_47", PipSize.EXTRA_LARGE.ordinal)
            editor.apply()
        }
    }

    var pipSizeIndex: Int
        get() {
            ensureV186Migration()
            return prefs.getInt("pip_size_index", PipSize.EXTRA_LARGE.ordinal)
        }
        set(value) = prefs.edit().putInt("pip_size_index", value).apply()

    var pipPositionIndex: Int
        get() = prefs.getInt("pip_position_index", PipPosition.TOP_RIGHT.ordinal)
        set(value) = prefs.edit().putInt("pip_position_index", value).apply()

    private fun resolveCameraAliases(cameraName: String): List<String> {
        val lower = cameraName.lowercase().trim()
        return when (lower) {
            "camera_principal", "cam_192_168_1_196" -> listOf("camera_principal", "cam_192_168_1_196")
            "camera_secundaria", "cam_192_168_1_47" -> listOf("camera_secundaria", "cam_192_168_1_47")
            else -> listOf(lower)
        }
    }

    fun getPipPositionIndex(cameraName: String): Int {
        val aliases = resolveCameraAliases(cameraName)
        for (alias in aliases) {
            if (prefs.contains("pip_position_index_$alias")) {
                return prefs.getInt("pip_position_index_$alias", pipPositionIndex)
            }
        }
        return pipPositionIndex
    }

    fun setPipPositionIndex(cameraName: String, value: Int) {
        val editor = prefs.edit()
        val aliases = resolveCameraAliases(cameraName)
        for (alias in aliases) {
            editor.putInt("pip_position_index_$alias", value)
        }
        editor.apply()
    }

    fun getPipSizeIndex(cameraName: String): Int {
        ensureV186Migration()
        val aliases = resolveCameraAliases(cameraName)
        for (alias in aliases) {
            if (prefs.contains("pip_size_index_$alias")) {
                return prefs.getInt("pip_size_index_$alias", pipSizeIndex)
            }
        }
        return pipSizeIndex
    }

    fun setPipSizeIndex(cameraName: String, value: Int) {
        val editor = prefs.edit()
        val aliases = resolveCameraAliases(cameraName)
        val sizeEnum = PipSize.values().getOrElse(value) { PipSize.EXTRA_LARGE }
        val currentMap = getCameraPipSizesMap().toMutableMap()
        for (alias in aliases) {
            editor.putInt("pip_size_index_$alias", value)
            currentMap[alias] = sizeEnum.name
        }
        val jsonObj = org.json.JSONObject()
        currentMap.forEach { (k, v) -> jsonObj.put(k, v.uppercase()) }
        editor.putString("camera_pip_sizes_json", jsonObj.toString())
        editor.apply()
    }

    fun getCameraPipSizesMap(): Map<String, String> {
        ensureV186Migration()
        val result = mutableMapOf<String, String>()
        val rawJson = prefs.getString("camera_pip_sizes_json", null)
        if (!rawJson.isNullOrBlank()) {
            try {
                val obj = org.json.JSONObject(rawJson)
                val keys = obj.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    val v = obj.optString(k, "EXTRA_LARGE").uppercase()
                    result[k] = v
                }
            } catch (_: Exception) {}
        }
        for (cam in listOf("camera_principal", "cam_192_168_1_196", "camera_secundaria", "cam_192_168_1_47")) {
            val idx = getPipSizeIndex(cam)
            val sizeName = PipSize.values().getOrElse(idx) { PipSize.EXTRA_LARGE }.name
            result[cam] = sizeName
        }
        return result
    }

    fun setCameraPipSizesMap(sizes: Map<String, String>) {
        val editor = prefs.edit()
        val currentMap = getCameraPipSizesMap().toMutableMap()
        for ((camKey, rawSize) in sizes) {
            val normalizedUpper = when (rawSize.trim().uppercase()) {
                "MINI", "EXTRA_SMALL" -> PipSize.EXTRA_SMALL.name
                "SMALL", "P" -> PipSize.SMALL.name
                "MEDIUM_SMALL" -> PipSize.MEDIUM_SMALL.name
                "MEDIUM", "M" -> PipSize.MEDIUM.name
                "MEDIUM_LARGE" -> PipSize.MEDIUM_LARGE.name
                "LARGE", "G" -> PipSize.LARGE.name
                "EXTRA_LARGE", "GG" -> PipSize.EXTRA_LARGE.name
                "CINEMA" -> PipSize.CINEMA.name
                else -> PipSize.EXTRA_LARGE.name
            }
            val sizeEnum = try { PipSize.valueOf(normalizedUpper) } catch (_: Exception) { PipSize.EXTRA_LARGE }
            for (alias in resolveCameraAliases(camKey)) {
                editor.putInt("pip_size_index_$alias", sizeEnum.ordinal)
                currentMap[alias] = sizeEnum.name
            }
        }
        val jsonObj = org.json.JSONObject()
        currentMap.forEach { (k, v) -> jsonObj.put(k, v.uppercase()) }
        editor.putString("camera_pip_sizes_json", jsonObj.toString())
        editor.apply()
    }

    fun isCameraPipEnabled(cameraName: String): Boolean {
        val aliases = resolveCameraAliases(cameraName)
        for (alias in aliases) {
            if (prefs.contains("pip_enabled_camera_$alias")) {
                return prefs.getBoolean("pip_enabled_camera_$alias", true)
            }
        }
        return true
    }

    fun setCameraPipEnabled(cameraName: String, enabled: Boolean) {
        val editor = prefs.edit()
        val aliases = resolveCameraAliases(cameraName)
        for (alias in aliases) {
            editor.putBoolean("pip_enabled_camera_$alias", enabled)
        }
        editor.apply()
    }

    var pipDurationIndex: Int
        get() = prefs.getInt("pip_duration_index", PipDuration.D_10S.ordinal)
        set(value) = prefs.edit().putInt("pip_duration_index", value).apply()

    var allowPipAlerts: Boolean
        get() {
            if (!com.sentinela.pro.SentinelaConfig.isTv(context)) return false
            return prefs.getBoolean("allow_pip_alerts", true)
        }
        set(value) = prefs.edit().putBoolean("allow_pip_alerts", value).apply()

    var pipPlayerMode: String
        get() = prefs.getString("pip_player_mode", "webrtc") ?: "webrtc"
        set(value) = prefs.edit().putString("pip_player_mode", value.lowercase()).apply()

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
                val hwSeed = "${android.os.Build.MANUFACTURER}_${android.os.Build.HARDWARE}_${android.os.Build.BOARD}_${android.os.Build.BRAND}".hashCode()
                val hexHash = Integer.toHexString(Math.abs(hwSeed)).padStart(6, '0').takeLast(6)
                "dev_${cleanModel}_${hexHash}"
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
        get() = PipSize.values().getOrElse(pipSizeIndex) { PipSize.EXTRA_LARGE }

    fun getCurrentPipSize(cameraName: String): PipSize {
        return PipSize.values().getOrElse(getPipSizeIndex(cameraName)) { currentPipSize }
    }

    val currentPipPosition: PipPosition
        get() = PipPosition.values().getOrElse(pipPositionIndex) { PipPosition.TOP_RIGHT }

    fun getCurrentPipPosition(cameraName: String): PipPosition {
        return PipPosition.values().getOrElse(getPipPositionIndex(cameraName)) { PipPosition.TOP_RIGHT }
    }

    val currentPipDuration: PipDuration
        get() = PipDuration.values().getOrElse(pipDurationIndex) { PipDuration.D_15S }

    fun getCameraDefaultStreamMode(cameraName: String): String {
        return prefs.getString("camera_stream_mode_$cameraName", "webrtc") ?: "webrtc"
    }

    fun setCameraDefaultStreamMode(cameraName: String, mode: String) {
        prefs.edit().putString("camera_stream_mode_$cameraName", mode).apply()
    }


    fun recordCrash(message: String, stackTrace: String) {
        prefs.edit()
            .putString("pending_crash_message", message)
            .putString("pending_crash_stack", stackTrace)
            .putLong("pending_crash_timestamp", System.currentTimeMillis())
            .commit()
    }

    fun getPendingCrash(): Triple<String, String, Long>? {
        val msg = prefs.getString("pending_crash_message", null) ?: return null
        val stack = prefs.getString("pending_crash_stack", "") ?: ""
        val ts = prefs.getLong("pending_crash_timestamp", 0L)
        return Triple(msg, stack, ts)
    }

    fun clearPendingCrash() {
        prefs.edit()
            .remove("pending_crash_message")
            .remove("pending_crash_stack")
            .remove("pending_crash_timestamp")
            .apply()
    }
}
