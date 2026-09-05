#!/bin/bash
set -e
echo "Iniciando compilação de APKs v072..."
cd android
chmod +x gradlew
./gradlew assembleRelease --no-daemon
echo "Compilação concluída com sucesso!"

if [ -f "app/build/outputs/apk/smartphone/release/app-smartphone-release.apk" ]; then
    cp app/build/outputs/apk/smartphone/release/app-smartphone-release.apk ../sentinela-android-smartphone-latest.apk
fi

if [ -f "app/build/outputs/apk/tv/release/app-tv-release.apk" ]; then
    cp app/build/outputs/apk/tv/release/app-tv-release.apk ../sentinela-android-tv-latest.apk
fi

if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    cp app/build/outputs/apk/release/app-release.apk ../sentinela-android-latest.apk
fi

echo "APKs v072 gerados na raiz do projeto."
