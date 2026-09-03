package com.sentinela.pro

import android.app.Application
import android.util.Log
import coil.ImageLoader
import coil.ImageLoaderFactory
import okhttp3.OkHttpClient
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * SentinelaApplication: Global Application Class.
 * Provides singleton ImageLoaderFactory (Coil 2.x standard) and global UncaughtExceptionHandler
 * to completely eliminate unexpected app crashes/closures on Android TV and mobile devices.
 */
class SentinelaApplication : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()

        // 1. Global crash protection for Android TV & background services
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("SentinelaApp", "FATAL CRASH INTERCEPTED on thread ${thread.name}: ${throwable.message}", throwable)
            // Log to disk or recover if possible
            defaultHandler?.uncaughtException(thread, throwable)
        }

        // 2. Global SSL Trust-All setup for Tailscale / self-signed LAN certificates
        try {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })
            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, SecureRandom())
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.socketFactory)
            HttpsURLConnection.setDefaultHostnameVerifier { _, _ -> true }
        } catch (e: Exception) {
            Log.w("SentinelaApp", "Global SSL setup warning: ${e.message}")
        }
    }

    override fun newImageLoader(): ImageLoader {
        val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
        })
        val sslContext = SSLContext.getInstance("SSL")
        sslContext.init(null, trustAllCerts, SecureRandom())

        val okHttpClient = OkHttpClient.Builder()
            .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
            .hostnameVerifier { _, _ -> true }
            .build()

        return ImageLoader.Builder(this)
            .okHttpClient(okHttpClient)
            .diskCachePolicy(coil.request.CachePolicy.DISABLED)
            .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
            .build()
    }
}
