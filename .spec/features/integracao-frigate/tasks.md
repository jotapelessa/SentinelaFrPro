# Tasks: Integração Frigate NVR 0.17 & go2rtc

> feature: integracao-frigate

## T-001 — Ingestão RTSP e Proxy WebRTC/MSE via go2rtc [concluida]
- Refs: US-001, AC-001
- Arquivos: frontend/src/components/WebRTCPlayer.tsx, android/app/src/main/java/com/sentinela/pro/ui/components/MseCameraView.kt
- Notas: Garante streaming contínuo sem travamentos e com recarregamento isolado.

## T-002 — Ingestão de Eventos MQTT e Bounding Boxes no Backend [concluida]
- Refs: US-001, AC-002
- Arquivos: backend/app/services/mqtt_service.py, backend/app/services/frigate_bridge.py
- Notas: Processamento assíncrono das mensagens `frigate/events` e extração de coordenadas.

## T-003 — Transcoder H.264/AAC CFR e Snapshot HUD para Telegram [concluida]
- Refs: US-002, AC-003, AC-004
- Arquivos: backend/app/services/telegram_vault.py, backend/app/services/frigate_bridge.py
- Notas: Geração de vídeos a 25/30 FPS estáveis via QSV/libx264 e carimbo HUD nas fotos.

## T-004 — Rotação Automática de Gravações e Limpeza NVMe [concluida]
- Refs: US-003, AC-005
- Arquivos: backend/app/api/settings.py
- Notas: Purge físico com liberação de espaço em `/media/frigate/recordings` e `/media/frigate/clips`.
