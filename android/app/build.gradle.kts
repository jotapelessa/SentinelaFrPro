import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val versionPropsFile = rootProject.file("version.properties")
val versionProps = Properties()
if (versionPropsFile.exists()) {
    versionProps.load(FileInputStream(versionPropsFile))
}

val vMajor = versionProps.getProperty("MAJOR", "001")
val vMinor = versionProps.getProperty("MINOR", "000")
val vPatch = versionProps.getProperty("PATCH", "000")
val vBuild = versionProps.getProperty("BUILD", "001")
val formattedVersion = "${vMajor}.${vMinor}.${vPatch}.${vBuild}"

android {
    namespace = "com.sentinela.pro"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.sentinela.pro"
        minSdk = 26
        targetSdk = 34
        versionCode = (vMajor.toIntOrNull() ?: 1) * 1000000 + (vMinor.toIntOrNull() ?: 0) * 1000 + (vBuild.toIntOrNull() ?: 1)
        versionName = formattedVersion

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    flavorDimensions += "device"
    productFlavors {
        create("tv") {
            dimension = "device"
            applicationIdSuffix = ".tv"
            versionNameSuffix = "-tv"
        }
        create("smartphone") {
            dimension = "device"
            applicationIdSuffix = ".smartphone"
            versionNameSuffix = "-smartphone"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    
    // Android TV Compose
    implementation("androidx.tv:tv-foundation:1.0.0-alpha10")
    implementation("androidx.tv:tv-material:1.0.0-alpha10")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")
    
    // Ktor Client for WebSockets / API
    implementation("io.ktor:ktor-client-core:2.3.8")
    implementation("io.ktor:ktor-client-okhttp:2.3.8")
    implementation("io.ktor:ktor-client-websockets:2.3.8")
    
    // WebRTC (Modern drop-in binary on Maven Central)
    implementation("io.getstream:stream-webrtc-android:1.3.0")
    
    // Coil (Image loading for PiP snapshot)
    implementation("io.coil-kt:coil-compose:2.5.0")
}
