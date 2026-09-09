#!/bin/bash
# ============================================================
#  🛡️  SENTINELA PRO — COMPILADOR ANDROID PARA CODESPACES
#  Uso:
#    ./compile_apk.sh           → compila TV + Smartphone
#    ./compile_apk.sh tv        → compila só Android TV
#    ./compile_apk.sh smartphone→ compila só Smartphone
#    ./compile_apk.sh both      → compila TV + Smartphone
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
VERSION_FILE="$ANDROID_DIR/version.properties"

# ── Versão ──────────────────────────────────────────────────
if [ ! -f "$VERSION_FILE" ]; then
    echo "⚠️  version.properties não encontrado, criando com valores padrão..."
    printf 'MAJOR=001\nMINOR=000\nPATCH=000\nBUILD=001\n' > "$VERSION_FILE"
fi

# shellcheck disable=SC1090
source "$VERSION_FILE"
MAJOR=${MAJOR:-001}
MINOR=${MINOR:-000}
PATCH=${PATCH:-000}
BUILD=${BUILD:-001}
FORMATTED_VERSION="$(printf "%03d.%03d.%03d.%03d" "$((10#$MAJOR))" "$((10#$MINOR))" "$((10#$PATCH))" "$((10#$BUILD))")"

echo "============================================================"
echo "   🛡️  SENTINELA PRO - COMPILADOR ANDROID (CODESPACES)     "
echo "============================================================"
echo "📦 Versão: $FORMATTED_VERSION"
echo ""

# ── Argumento CLI ────────────────────────────────────────────
TARGET="${1:-both}"
case "${TARGET,,}" in
    tv)         BUILD_TV=true;  BUILD_PHONE=false ;;
    smartphone) BUILD_TV=false; BUILD_PHONE=true  ;;
    both|"")    BUILD_TV=true;  BUILD_PHONE=true  ;;
    *)
        echo "❌ Argumento inválido: '$TARGET'"
        echo "   Use: tv | smartphone | both"
        exit 1
        ;;
esac

# ── JDK 17 ──────────────────────────────────────────────────
CURRENT_JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | cut -d'.' -f1 || echo "")

if [ "$CURRENT_JAVA_VER" != "17" ] && [ "$CURRENT_JAVA_VER" != "21" ]; then
    echo "☕ JDK compatível não encontrado (atual: '${CURRENT_JAVA_VER}'), procurando..."
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
            echo "☕ Usando JDK em: $JAVA_HOME"
            break
        fi
    done

    if [ "$FOUND_JDK" = false ]; then
        if command -v apt-get &>/dev/null; then
            echo "☕ Instalando OpenJDK 17 via apt-get..."
            sudo apt-get update -qq && sudo apt-get install -y -qq openjdk-17-jdk
            export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
            export PATH="$JAVA_HOME/bin:$PATH"
            echo "☕ OpenJDK 17 instalado em $JAVA_HOME"
        elif [ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]; then
            # shellcheck disable=SC1090
            source "$HOME/.sdkman/bin/sdkman-init.sh"
            sdk install java 17.0.10-tem -y 2>/dev/null || true
            sdk use java 17.0.10-tem 2>/dev/null || true
        else
            echo "❌ Não foi possível instalar JDK 17. Instale manualmente e tente novamente."
            exit 1
        fi
    fi
fi

echo "☕ Java: $(java -version 2>&1 | head -n 1)"

# ── Android SDK / Licenças ──────────────────────────────────
if command -v sdkmanager &>/dev/null; then
    echo "📱 Aceitando licenças do Android SDK..."
    yes | sdkmanager --licenses >/dev/null 2>&1 || true
fi

# ── Gradle Wrapper ──────────────────────────────────────────
cd "$ANDROID_DIR"

# Limpar journals corrompidos do Gradle (comum no Codespaces)
rm -rf ~/.gradle/caches/journal* 2>/dev/null || true

if [ ! -f "gradlew" ]; then
    echo "⚙️  gradlew não encontrado, gerando wrapper Gradle 8.5..."
    gradle wrapper --gradle-version 8.5 --distribution-type all
fi

chmod +x gradlew

# ── Build ────────────────────────────────────────────────────
GRADLE_TASKS=""
[ "$BUILD_TV" = true ]    && GRADLE_TASKS="$GRADLE_TASKS :app:assembleTvDebug"
[ "$BUILD_PHONE" = true ] && GRADLE_TASKS="$GRADLE_TASKS :app:assembleSmartphoneDebug"

echo ""
echo "🚀 Iniciando Gradle: $GRADLE_TASKS"
echo "------------------------------------------------------------"
# shellcheck disable=SC2086
./gradlew $GRADLE_TASKS --no-daemon --stacktrace 2>&1 | tee "$SCRIPT_DIR/gradle_build.log"
BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -ne 0 ]; then
    echo ""
    echo "❌ ERRO NA COMPILAÇÃO GRADLE (últimas 60 linhas do log):"
    tail -n 60 "$SCRIPT_DIR/gradle_build.log"
    exit 1
fi

# ── Cópia dos APKs para a raiz ───────────────────────────────
echo ""
echo "============================================================"
echo "🎉 COMPILAÇÃO CONCLUÍDA!"
echo "============================================================"

if [ "$BUILD_TV" = true ]; then
    TV_SRC="app/build/outputs/apk/tv/debug/app-tv-debug.apk"
    TV_DEST="$SCRIPT_DIR/sentinela.android.tv.${FORMATTED_VERSION}.apk"
    TV_LATEST="$SCRIPT_DIR/sentinela-android-tv-latest.apk"
    if [ -f "$TV_SRC" ]; then
        cp "$TV_SRC" "$TV_DEST"
        cp "$TV_SRC" "$TV_LATEST"
        echo "📺 Android TV:    sentinela.android.tv.${FORMATTED_VERSION}.apk"
    else
        echo "⚠️  APK TV não encontrado em $TV_SRC"
    fi
fi

if [ "$BUILD_PHONE" = true ]; then
    PHONE_SRC="app/build/outputs/apk/smartphone/debug/app-smartphone-debug.apk"
    PHONE_DEST="$SCRIPT_DIR/sentinela.android.smartphone.${FORMATTED_VERSION}.apk"
    PHONE_LATEST="$SCRIPT_DIR/sentinela-android-smartphone-latest.apk"
    if [ -f "$PHONE_SRC" ]; then
        cp "$PHONE_SRC" "$PHONE_DEST"
        cp "$PHONE_SRC" "$PHONE_LATEST"
        echo "📱 Smartphone:    sentinela.android.smartphone.${FORMATTED_VERSION}.apk"
    else
        echo "⚠️  APK Smartphone não encontrado em $PHONE_SRC"
    fi
fi

echo ""
echo "📥 Para baixar no Codespaces:"
echo "   Clique com botão direito no arquivo .apk no painel"
echo "   esquerdo do VS Code e selecione 'Download...'."
echo "============================================================"
