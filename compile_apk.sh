#!/bin/bash
set -e

# Lê a versão dinamicamente do arquivo de versionamento do projeto.
VERSION_FILE="android/version.properties"
if [ -f "$VERSION_FILE" ]; then
    # shellcheck disable=SC1090
    source "$VERSION_FILE"
fi
MAJOR=${MAJOR:-001}
MINOR=${MINOR:-000}
PATCH=${PATCH:-000}
BUILD=${BUILD:-081}
FORMATTED_VERSION="$(printf "%03d.%03d.%03d.%03d" "$((10#$MAJOR))" "$((10#$MINOR))" "$((10#$PATCH))" "$((10#$BUILD))")"

echo "Iniciando compilação de APKs v${FORMATTED_VERSION}..."

cd android
chmod +x gradlew 2>/dev/null || true

if [ -f "gradlew" ]; then
    ./gradlew assembleTvDebug assembleSmartphoneDebug --no-daemon
else
    gradle assembleTvDebug assembleSmartphoneDebug --no-daemon
fi

echo "Compilação concluída com sucesso!"

if [ -f "app/build/outputs/apk/tv/debug/app-tv-debug.apk" ]; then
    cp app/build/outputs/apk/tv/debug/app-tv-debug.apk "../sentinela.android.tv.${FORMATTED_VERSION}.apk"
    cp app/build/outputs/apk/tv/debug/app-tv-debug.apk "../sentinela-android-tv-latest.apk"
fi

if [ -f "app/build/outputs/apk/smartphone/debug/app-smartphone-debug.apk" ]; then
    cp app/build/outputs/apk/smartphone/debug/app-smartphone-debug.apk "../sentinela.android.smartphone.${FORMATTED_VERSION}.apk"
    cp app/build/outputs/apk/smartphone/debug/app-smartphone-debug.apk "../sentinela-android-smartphone-latest.apk"
fi

echo "APKs v${FORMATTED_VERSION} gerados na raiz do projeto."
