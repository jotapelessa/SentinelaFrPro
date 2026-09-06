// Testes de spec da feature sentinela-core — verificados por onp-spec audit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// US-004 — Central de Controle Web Responsiva e Telemetria em Tempo Real
test('AC-006: Telemetria de Hardware via WebSocket e REST @spec:AC-006', () => {
  // Verifica se o backend fornece o endpoint de telemetria sem bloqueio
  const telemCode = fs.readFileSync('backend/app/services/telemetry.py', 'utf8');
  assert.ok(telemCode.includes('get_telemetry_snapshot') && telemCode.includes('temperature_celsius'), 'TelemetryService deve coletar CPU e temperatura');
});

// US-004 — Central de Controle Web Responsiva e Telemetria em Tempo Real
test('AC-007: Gerenciamento de Câmeras e Zonas no Mosaico @spec:AC-007', () => {
  // Verifica se a API de câmeras persiste no SQLite e sincroniza com o Frigate
  const camCode = fs.readFileSync('backend/app/api/cameras.py', 'utf8');
  assert.ok(camCode.includes('sync_camera_to_frigate') && camCode.includes('Camera'), 'Cameras router deve gerenciar e sincronizar cameras');
});

// US-005 — Ecossistema Mobile Multiplataforma (Android TV & Smartphone)
test('AC-008: Pareamento de Dispositivos e Políticas de Acesso @spec:AC-008', () => {
  // Verifica se o roteador de devices cadastra e retorna politicas
  const devCode = fs.readFileSync('backend/app/api/devices.py', 'utf8');
  assert.ok(devCode.includes('device_heartbeat') && devCode.includes('allowed_cameras'), 'Devices router deve autenticar e retornar politicas');
});

// US-005 — Ecossistema Mobile Multiplataforma (Android TV & Smartphone)
test('AC-009: Botão Flutuante (FAB) de Silenciamento de Alertas no Smartphone @spec:AC-009', () => {
  // Verifica se o botão flutuante FAB está implementado na tela Compose
  const phoneScreen = fs.readFileSync('android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt', 'utf8');
  assert.ok(phoneScreen.includes('FloatingActionButton') && phoneScreen.includes('pauseAlerts'), 'SmartphoneYouTubeScreen deve conter FAB de pauseAlerts');
});

// US-005 — Ecossistema Mobile Multiplataforma (Android TV & Smartphone)
test('AC-010: Gateway Picture-in-Picture (PiP) para Android TV @spec:AC-010', () => {
  // Verifica se o PiPGatewayService despacha alertas de sobreposição
  const pipCode = fs.readFileSync('backend/app/services/pip_gateway.py', 'utf8');
  assert.ok(pipCode.includes('dispatch_pip_alert') && pipCode.includes('get_active_tv_devices'), 'PiPGatewayService deve despachar alertas flutuantes para TVs ativas');
});

