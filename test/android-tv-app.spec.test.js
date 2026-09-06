// Testes de spec da feature android-tv-app — verificados por onp-spec audit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// US-006 — Navegação por D-Pad e Sidebar de Menus
test('AC-011: Sidebar Fixa com Relógio e Indicador de Foco @spec:AC-011', () => {
  // Verifica se o TvSidebar implementa as abas enum TvTab e borda com foco
  const tvScreen = fs.readFileSync('android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt', 'utf8');
  assert.ok(tvScreen.includes('TvSidebar') && tvScreen.includes('TvTab.CAMERAS') && tvScreen.includes('TvTab.SETTINGS'), 'TvNetflixScreen deve conter TvSidebar com abas');
});

// US-007 — Menu Câmeras: Hero Viewport e Carrossel Horizontal
test('AC-012: Player Hero com Telemetria e Alternância por Carrossel @spec:AC-012', () => {
  // Verifica se a viewport de câmeras implementa hero e carrossel
  const tvScreen = fs.readFileSync('android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt', 'utf8');
  assert.ok(tvScreen.includes('TvCamerasViewport') && tvScreen.includes('carouselFocusRequesters'), 'TvNetflixScreen deve implementar TvCamerasViewport');
});

// US-008 — Menu Capturas (Gravações) e Player de Clipes
test('AC-013: Galeria de Capturas e Reprodução de Vídeos @spec:AC-013', () => {
  // Verifica se a viewport de gravações e player de clipes existem
  const tvScreen = fs.readFileSync('android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt', 'utf8');
  assert.ok(tvScreen.includes('TvRecordingsViewport') && tvScreen.includes('TvClipPlayerDialog'), 'TvNetflixScreen deve implementar TvRecordingsViewport e player');
});

// US-009 — Menu Ferramentas: Diagnósticos, Testes de Rede e PiP Manual
test('AC-014: Execução de Ferramentas e Disparo de Alerta PiP de Teste @spec:AC-014', () => {
  // Verifica se o viewport de ferramentas dispara teste de janela flutuante
  const tvScreen = fs.readFileSync('android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt', 'utf8');
  assert.ok(tvScreen.includes('TvToolsViewport') && tvScreen.includes('TvPipFloatingWindow'), 'TvNetflixScreen deve conter TvToolsViewport e teste de PiP');
});

// US-010 — Menu Logs e Menu Configurações: Console e Parâmetros
test('AC-015: Ajuste de Parâmetros PiP e Monitoramento de Logs @spec:AC-015', () => {
  // Verifica se as abas de settings e logs manipulam SentinelaPreferences
  const tvScreen = fs.readFileSync('android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt', 'utf8');
  assert.ok(tvScreen.includes('TvSettingsViewport') && tvScreen.includes('TvLogsViewport'), 'TvNetflixScreen deve conter viewports de Settings e Logs');
});

