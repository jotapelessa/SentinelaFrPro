# Tasks: Aplicativo Android Smartphone (Sentinela Mobile YouTube Edition)

> feature: android-smartphone-app

## T-015 — Feed Vertical de Câmeras e Modal Zoom 5x [concluida]
- Refs: US-011, AC-016
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt
- Notas: Feed YouTube Shorts e pinch-to-zoom interativo no PhoneZoomCameraDialog.

## T-016 — Botão Flutuante FAB para Silenciamento de Alertas [concluida]
- Refs: US-011, AC-017
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt, android/app/src/main/java/com/sentinela/pro/network/SentinelaRepository.kt
- Notas: Alternância tátil de silenciamento de alertas Telegram com feedback visual.

## T-017 — Galeria de Capturas e Player Flutuante de Clipes [concluida]
- Refs: US-012, AC-018
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt
- Notas: Grid de thumbnails e PhoneClipPlayerDialog com playback MP4 nativo.

## T-018 — Central Master e Edição de Políticas de Dispositivos [concluida]
- Refs: US-013, AC-019
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt
- Notas: Gerenciamento granular de Smart TVs via DeviceConfigEditDialog.

## T-019 — Ferramentas de Diagnóstico, Teste de Ping e Velocidade [concluida]
- Refs: US-014, AC-020
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt, android/app/src/main/java/com/sentinela/pro/network/SentinelaRepository.kt
- Notas: Verificação de saúde dos containers Frigate, go2rtc e Mosquitto.

## T-020 — Painel de Configurações, Modo Eco e Console de Logs [concluida]
- Refs: US-015, AC-021
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt, android/app/src/main/java/com/sentinela/pro/data/SentinelaPreferences.kt
- Notas: Ajuste de polling (10 FPS eco vs 24 FPS fluido) e visualizador de logs.
