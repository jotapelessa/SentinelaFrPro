#!/bin/bash
set -e

# Base directory detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
VERSION_FILE="$ANDROID_DIR/version.properties"

if [ ! -f "$VERSION_FILE" ]; then
    echo "MAJOR=001" > "$VERSION_FILE"
    echo "MINOR=000" >> "$VERSION_FILE"
    echo "PATCH=000" >> "$VERSION_FILE"
    echo "BUILD=001" >> "$VERSION_FILE"
fi

# Read version numbers
source "$VERSION_FILE"
MAJOR=${MAJOR:-001}
MINOR=${MINOR:-000}
PATCH=${PATCH:-000}
BUILD=${BUILD:-001}

# Format as 12-digit 000.000.000.000
FORMATTED_VERSION="$(printf "%03d.%03d.%03d.%03d" "$((10#$MAJOR))" "$((10#$MINOR))" "$((10#$PATCH))" "$((10#$BUILD))")"

echo "============================================================"
echo "   🛡️  SENTINELA PRO - COMPILADOR ANDROID (CODESPACES)     "
echo "============================================================"
echo "📦 Versão Atual do Sistema: $FORMATTED_VERSION"
echo "🌐 Conexão de Câmeras: Tailscale Funnel (HTTPS / WSS)"
echo "------------------------------------------------------------"
echo "Escolha qual aplicativo deseja compilar:"
echo "  [1] Android TV (Estilo Netflix • Spotlight • PiP 8 Tamanhos • D-Pad)"
echo "  [2] Android Smartphone (Estilo YouTube • Feed Vertical • Zoom 5x)"
echo "  [3] Compilar Ambos (TV e Smartphone)"
echo "  [4] Incrementar Versão de Build (12 Dígitos)"
echo "  [0] Sair"
echo "------------------------------------------------------------"
if [ -n "$1" ]; then
    OPTION="$1"
else
    read -p "Digite a opção desejada [1-4]: " OPTION
fi

OPTION="$(echo "$OPTION" | tr -d '\r\n ')"

if [ "$OPTION" == "4" ]; then
    NEW_BUILD=$(( 10#$BUILD + 1 ))
    BUILD=$(printf "%03d" $NEW_BUILD)
    cat << VEOF > "$VERSION_FILE"
MAJOR=$MAJOR
MINOR=$MINOR
PATCH=$PATCH
BUILD=$BUILD
VEOF
    FORMATTED_VERSION="$(printf "%03d.%03d.%03d.%03d" "$((10#$MAJOR))" "$((10#$MINOR))" "$((10#$PATCH))" "$((10#$BUILD))")"
    echo "✅ Versão incrementada para: $FORMATTED_VERSION"
    echo "Reiniciando menu de compilação..."
    exec "$0"
fi

if [ "$OPTION" == "0" ]; then
    echo "Compilação cancelada."
    exit 0
fi

# Configure compatible JDK (Java 17 or 21) for Android Gradle Plugin
CURRENT_JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | cut -d'.' -f1 || echo "")

if [ "$CURRENT_JAVA_VER" != "17" ] && [ "$CURRENT_JAVA_VER" != "21" ]; then
    FOUND_JDK=false
    for jpath in \
        "/usr/lib/jvm/java-17-openjdk-amd64" \
        "/usr/lib/jvm/java-17-openjdk" \
        "/usr/lib/jvm/msopenjdk-17-amd64" \
        "/usr/lib/jvm/temurin-17-jdk-amd64" \
        "/usr/local/sdkman/candidates/java/17."* \
        "/usr/lib/jvm/java-21-openjdk-amd64" \
        "/usr/lib/jvm/java-21-openjdk" \
        "/usr/local/sdkman/candidates/java/21."* \
        "/opt/java/openjdk"; do
        if [ -d "$jpath" ] && [ -f "$jpath/bin/javac" ]; then
            export JAVA_HOME="$jpath"
            export PATH="$JAVA_HOME/bin:$PATH"
            FOUND_JDK=true
            echo "☕ Usando JDK compatível: $JAVA_HOME"
            break
        fi
    done

    if [ "$FOUND_JDK" = false ]; then
        if [ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]; then
            source "$HOME/.sdkman/bin/sdkman-init.sh"
            sdk use java 17.0.10-tem 2>/dev/null || sdk install java 17.0.10-tem -y 2>/dev/null || true
        elif command -v apt-get &>/dev/null; then
            echo "☕ Instalando OpenJDK 17..."
            sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk
            export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
            export PATH="$JAVA_HOME/bin:$PATH"
        fi
    fi
fi

# Navigate to android directory
cd "$ANDROID_DIR"

# Clean corrupted gradle journals if any
rm -rf ~/.gradle/caches/journal* 2>/dev/null || true

BUILD_TV=false
BUILD_PHONE=false

case "$OPTION" in
    1)
        BUILD_TV=true
        ;;
    2)
        BUILD_PHONE=true
        ;;
    3)
        BUILD_TV=true
        BUILD_PHONE=true
        ;;
    *)
        echo "Opção inválida."
        exit 1
        ;;
esac

echo ""
echo "🚀 Iniciando compilação do Gradle com versão $FORMATTED_VERSION..."
echo ""

if [ "$BUILD_TV" = true ]; then
    echo "🔨 Compilando Android TV..."
    ./gradlew assembleTvDebug --no-daemon
    TV_SRC="app/build/outputs/apk/tv/debug/app-tv-debug.apk"
    TV_DEST="$SCRIPT_DIR/BETA.sentinela.android.tv.$FORMATTED_VERSION.apk"
    if [ -f "$TV_SRC" ]; then
        cp "$TV_SRC" "$TV_DEST"
        echo "✅ APK Android TV gerado: $TV_DEST"
    fi
fi

if [ "$BUILD_PHONE" = true ]; then
    echo "🔨 Compilando Android Smartphone..."
    ./gradlew assembleSmartphoneDebug --no-daemon
    PHONE_SRC="app/build/outputs/apk/smartphone/debug/app-smartphone-debug.apk"
    PHONE_DEST="$SCRIPT_DIR/BETA.sentinela.android.smartphone.$FORMATTED_VERSION.apk"
    if [ -f "$PHONE_SRC" ]; then
        cp "$PHONE_SRC" "$PHONE_DEST"
        echo "✅ APK Android Smartphone gerado: $PHONE_DEST"
    fi
fi

echo ""
echo "============================================================"
echo "🎉 COMPILAÇÃO CONCLUÍDA COM SUCESSO!"
echo "============================================================"
if [ "$BUILD_TV" = true ]; then
    echo "📺 Android TV: BETA.sentinela.android.tv.$FORMATTED_VERSION.apk"
fi
if [ "$BUILD_PHONE" = true ]; then
    echo "📱 Smartphone: BETA.sentinela.android.smartphone.$FORMATTED_VERSION.apk"
fi
echo ""
echo "📥 Para baixar no Codespaces: clique com botão direito no arquivo no painel esquerdo e selecione 'Download...'."
echo "============================================================"
