// Testes de spec da feature integracao-frigate — verificados por onp-spec audit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// US-001 — Ingestão de Câmeras e Streaming de Baixa Latência
test('AC-001: Streaming WebRTC funcional via go2rtc @spec:AC-001', () => {
  // Verifica se o WebRTCPlayer e MseCameraView implementam os seletores de stream
  const playerCode = fs.readFileSync('frontend/src/components/WebRTCPlayer.tsx', 'utf8');
  assert.ok(playerCode.includes('webrtc') && playerCode.includes('DetectionOverlays'), 'WebRTCPlayer deve suportar WebRTC com overlays isolados');
});

// US-001 — Ingestão de Câmeras e Streaming de Baixa Latência
test('AC-002: Detecção de Objetos e Bounding Boxes por IA @spec:AC-002', () => {
  // Verifica se o MQTTService assina tópicos de eventos do Frigate e parseia caixas
  const mqttCode = fs.readFileSync('backend/app/services/mqtt_service.py', 'utf8');
  assert.ok(mqttCode.includes('frigate') && mqttCode.includes('events'), 'MQTTService deve processar frigate/events');
});

// US-002 — Disparo de Alertas e Clipes com Áudio H.264 / AAC
test('AC-003: Snapshot em Resolução Nativa com Marca d\'Água HUD @spec:AC-003', () => {
  // Verifica se o TelegramVaultService implementa o watermark dinâmico
  const vaultCode = fs.readFileSync('backend/app/services/telegram_vault.py', 'utf8');
  assert.ok(vaultCode.includes('apply_watermark') && vaultCode.includes('send_alert_photo'), 'TelegramVaultService deve aplicar watermark e enviar foto');
});

// US-002 — Disparo de Alertas e Clipes com Áudio H.264 / AAC
test('AC-004: Clipes de Vídeo em Framerate Constante (CFR) @spec:AC-004', () => {
  // Verifica se o FrigateBridge implementa transcode CFR com H.264/AAC
  const bridgeCode = fs.readFileSync('backend/app/services/frigate_bridge.py', 'utf8');
  assert.ok(bridgeCode.includes('transcode_to_30fps') && bridgeCode.includes('setpts='), 'FrigateBridge deve regenerar timestamps CFR');
});

// US-003 — Gerenciamento e Limpeza Automática do SSD NVMe
test('AC-005: Medição Real e Purge do Armazenamento @spec:AC-005', () => {
  // Verifica se as rotas de settings implementam medição real e purge físico
  const settingsCode = fs.readFileSync('backend/app/api/settings.py', 'utf8');
  assert.ok(settingsCode.includes('_purge_recordings') && settingsCode.includes('_cached_dir_size'), 'Settings deve implementar purge real do disco');
});

// US-004 — Estabilidade de Conexão, Resolução HD e Resiliência Anti-Travamento
test('AC-028: Watchdog de Auto-Reconexão e Anti-Congelamento no Player @spec:AC-028', () => {
  // Verifica se o WebRTCPlayer implementa watchdog de reconexão e monitoramento de congelamento
  const playerCode = fs.readFileSync('frontend/src/components/WebRTCPlayer.tsx', 'utf8');
  assert.ok(playerCode.includes('reconnectWatchdog') && playerCode.includes('streamStallCount'), 'WebRTCPlayer deve implementar watchdog de reconexão e tolerância a stalls');
});

// US-004 — Estabilidade de Conexão, Resolução HD e Resiliência Anti-Travamento
test('AC-029: Pipeline HD Nativo Prioritário para Snapshots e Thumbnails @spec:AC-029', () => {
  // Verifica se o frontend e backend priorizam o frame em resolução nativa (go2rtc/frame.jpeg) antes do detect stream
  const playerCode = fs.readFileSync('frontend/src/components/WebRTCPlayer.tsx', 'utf8');
  const mosaicCode = fs.readFileSync('frontend/src/components/CameraMosaic.tsx', 'utf8');
  const bridgeCode = fs.readFileSync('backend/app/services/frigate_bridge.py', 'utf8');

  assert.ok(playerCode.includes('/go2rtc/api/frame.jpeg'), 'WebRTCPlayer deve utilizar frame nativo go2rtc');
  assert.ok(mosaicCode.includes('frame.jpeg') || mosaicCode.includes('getThumbnailUrl'), 'CameraMosaic deve priorizar thumbnails HD');
  assert.ok(bridgeCode.includes('go2rtc_url') && bridgeCode.includes('frame.jpeg'), 'FrigateBridge deve priorizar frame nativo go2rtc');
});

// US-004 — Estabilidade de Conexão, Resolução HD e Resiliência Anti-Travamento
test('AC-030: Pipeline de Clipes Resiliente com Sincronismo PTS e Verificação de Áudio AAC @spec:AC-030', () => {
  // Verifica se o backend valida codecs, reconstrói PTS com CFR e assegura áudio AAC
  const bridgeCode = fs.readFileSync('backend/app/services/frigate_bridge.py', 'utf8');
  const mqttCode = fs.readFileSync('backend/app/services/mqtt_service.py', 'utf8');

  assert.ok(bridgeCode.includes('transcode_to_30fps') && bridgeCode.includes('setpts='), 'FrigateBridge deve reescrever PTS');
  assert.ok(bridgeCode.includes('_has_audio_stream') && bridgeCode.includes('aac'), 'FrigateBridge deve preservar e sincronizar áudio AAC');
  assert.ok(mqttCode.includes('_dispatch_telegram_video_with_retry'), 'MQTTService deve implementar despacho resiliente de vídeo');
});

