// Testes de spec da feature telegram-vault — gerados por onp-spec scaffold
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tgVaultFile = path.resolve(
  process.cwd(),
  'backend/app/services/telegram_vault.py'
);
const mqttServiceFile = path.resolve(
  process.cwd(),
  'backend/app/services/mqtt_service.py'
);
const frigateBridgeFile = path.resolve(
  process.cwd(),
  'backend/app/services/frigate_bridge.py'
);

// US-016 — Foto de Alerta Instantâneo com Marca d'Água HUD e Metadados Ricos
test('AC-022: Marca d\'Água HUD Dinâmica e Formatação de Snapshot @spec:AC-022', () => {
  // Dado: que um evento de detecção de alta prioridade (pessoa, veículo ou animal) é recebido pelo `MQTTService`
  // Quando: o método `send_alert_photo` do `TelegramVaultService` for invocado com o frame da câmera
  // Então: o sistema deve aplicar marca d'água HUD superior com faixa ciano, nome da câmera, rótulo do objeto, zona e data/hora (`apply_watermark`), garantindo arquivo JPEG otimizado abaixo de 4.5 MB.
  assert.ok(fs.existsSync(tgVaultFile), 'telegram_vault.py deve existir');
  const content = fs.readFileSync(tgVaultFile, 'utf-8');
  assert.ok(
    content.includes('def apply_watermark'),
    'Deve implementar método apply_watermark'
  );
  assert.ok(
    content.includes('SENTINELA PRO') && content.includes('draw.line'),
    'Deve desenhar o HUD superior característico com linha ciano e identificador'
  );
  assert.ok(
    content.includes('send_alert_photo'),
    'Deve implementar o envio de foto send_alert_photo'
  );
});

// US-016 — Foto de Alerta Instantâneo com Marca d'Água HUD e Metadados Ricos
test('AC-023: Formatação Rica de Mensagem com Tags de Busca (Telegram Drive) @spec:AC-023', () => {
  // Dado: que uma foto ou vídeo está sendo preparado para despacho no Telegram
  // Quando: a legenda for montada através de `format_event_message`
  // Então: deve ser gerada uma mensagem contendo cabeçalho estilizado, local e zona, data e hora com dia da semana, precisão em porcentagem, tamanho em MB e nuvem de hashtags contextuais (`#ano`, `#mes`, `#dia`, `#camera`, `#periodo`, `#rotulo`, `#foto_jpg` ou `#video_mp4`) para busca instantânea.
  assert.ok(fs.existsSync(tgVaultFile), 'telegram_vault.py deve existir');
  const content = fs.readFileSync(tgVaultFile, 'utf-8');
  assert.ok(
    content.includes('def format_event_message'),
    'Deve implementar método format_event_message'
  );
  assert.ok(
    content.includes('Telegram Drive') || content.includes('Busca') || content.includes('tags = ['),
    'Deve incluir tags contextuais para Telegram Drive'
  );
  assert.ok(
    content.includes('#foto_jpg') && content.includes('#video_mp4'),
    'Deve incluir hashtags #foto_jpg e #video_mp4'
  );
});

// US-017 — Gravação e Envio de Clipes de Vídeo MP4 Otimizados
test('AC-024: Captura de Clipe Estendido com Pré e Pós-Captura @spec:AC-024', () => {
  // Dado: que o evento Frigate é finalizado (`event_type == "end"`)
  // Quando: a rotina de envio de vídeo `_dispatch_telegram_video_with_retry` for acionada
  // Então: o sistema deve calcular janela temporal com no mínimo 5s de pré-captura e 5s de pós-captura (duração mínima de 20s e máxima de 60s), aguardando a sincronização dos segmentos do NVR.
  assert.ok(fs.existsSync(mqttServiceFile), 'mqtt_service.py deve existir');
  const content = fs.readFileSync(mqttServiceFile, 'utf-8');
  assert.ok(
    content.includes('_dispatch_telegram_video_with_retry'),
    'Deve implementar rotina assíncrona _dispatch_telegram_video_with_retry'
  );
  assert.ok(
    content.includes('pre_capture') && content.includes('post_capture'),
    'Deve calcular tempos de pré e pós-captura estendida'
  );
});

// US-017 — Gravação e Envio de Clipes de Vídeo MP4 Otimizados
test('AC-025: Transcodificação H.264 CFR Fluida e Envio com Streaming @spec:AC-025', () => {
  // Dado: que o arquivo MP4 bruto foi obtido do NVR ou gravador de emergência
  // Quando: o clipe for processado antes do despacho via `transcode_to_30fps` e `send_alert_video`
  // Então: o sistema deve transcodificar o vídeo para H.264 constante (QSV ou libx264 veryfast) com sinalizador `supports_streaming: "true"`, garantindo reprodução inline instantânea no Telegram.
  assert.ok(fs.existsSync(frigateBridgeFile), 'frigate_bridge.py deve existir');
  const bridgeContent = fs.readFileSync(frigateBridgeFile, 'utf-8');
  assert.ok(
    bridgeContent.includes('transcode_to_30fps') || bridgeContent.includes('setpts=N/'),
    'Deve implementar transcodificação CFR via FFmpeg (QSV ou libx264)'
  );
  assert.ok(
    bridgeContent.includes('record_live_video') && bridgeContent.includes('allow_synthetic'),
    'Deve implementar record_live_video com bloqueio a sintéticos nos testes manuais'
  );

  assert.ok(fs.existsSync(tgVaultFile), 'telegram_vault.py deve existir');
  const vaultContent = fs.readFileSync(tgVaultFile, 'utf-8');
  assert.ok(
    vaultContent.includes('send_alert_video') && vaultContent.includes('supports_streaming'),
    'Deve despachar vídeo com flag supports_streaming para reprodução imediata'
  );

  const settingsFile = path.resolve(process.cwd(), 'backend/app/api/settings.py');
  assert.ok(fs.existsSync(settingsFile), 'settings.py deve existir');
  const settingsContent = fs.readFileSync(settingsFile, 'utf-8');
  assert.ok(
    settingsContent.includes('_resolve_active_test_camera') && settingsContent.includes('test-video'),
    'Deve resolver dinamicamente a câmera ativa do banco para os testes de vídeo e foto'
  );
});

// US-018 — Idempotência e Auditoria de Disparos de Mídia
test('AC-026: Guarda de Idempotência em Memória e Banco de Dados @spec:AC-026', () => {
  // Dado: que um evento pode emitir múltiplos sinais de encerramento pelo broker MQTT
  // Quando: o `MQTTService` processar a finalização do evento
  // Então: ele deve verificar a chave `_processed_videos` em memória cache e o campo `video_sent` no `EventRecord` do banco SQLite/Postgres, abortando envios duplicados para o mesmo `event_id`.
  assert.ok(fs.existsSync(mqttServiceFile), 'mqtt_service.py deve existir');
  const content = fs.readFileSync(mqttServiceFile, 'utf-8');
  assert.ok(
    content.includes('_processed_videos'),
    'Deve manter cache TTL _processed_videos em memória'
  );
  assert.ok(
    content.includes('video_sent'),
    'Deve verificar e persistir flag video_sent para idempotência durável'
  );
});

// US-018 — Idempotência e Auditoria de Disparos de Mídia
test('AC-027: Trilha de Auditoria em Memória e Suporte a Pausa de Alertas @spec:AC-027', () => {
  // Dado: que ações de envio de fotos, vídeos ou documentos ocorrem no `TelegramVaultService`
  // Quando: cada operação `send_alert_photo` ou `send_alert_video` for concluída (sucesso ou falha)
  // Então: o sistema deve registrar entrada detalhada via `record_audit`, e respeitar o estado `is_paused()` caso alertas tenham sido pausados via comando `/pausar` ou API.
  assert.ok(fs.existsSync(tgVaultFile), 'telegram_vault.py deve existir');
  const content = fs.readFileSync(tgVaultFile, 'utf-8');
  assert.ok(
    content.includes('record_audit') && content.includes('get_audit_logs'),
    'Deve registrar e expor trilha de auditoria em memória'
  );
  assert.ok(
    content.includes('is_paused') && content.includes('pause_alerts'),
    'Deve permitir pausar notificações e respeitar estado is_paused()'
  );
});
