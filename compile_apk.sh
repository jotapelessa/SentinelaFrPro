#!/bin/bash
echo "Iniciando compilação de APKs v060..."
cd android
chmod +x gradlew
./gradlew assembleRelease
echo "Compilação concluída!"
cp app/build/outputs/apk/release/app-release.apk ../sentinela-android-smartphone-latest.apk
cp app/build/outputs/apk/release/app-release.apk ../sentinela-android-tv-latest.apk
echo "APKs gerados na raiz do projeto."
