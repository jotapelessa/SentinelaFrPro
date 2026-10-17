/**
 * Fonte da Verdade Única da Versão do Sentinela Frigate Pro
 * Sincronizada com android/version.properties e o pipeline de release.
 */
export const APP_VERSION = "001.000.000.186";
export const APP_BUILD = 186;
export const BUILD_NUMBER = 186;
export const APP_CODENAME = "Sentinela Pro Ultra";

export const CHANGELOG = [
  {
    version: "001.000.000.186",
    build: 186,
    date: "2026-10-17",
    highlights: [
      "Sincronização Bidirecional 100% Fiel de Zonas e Múltiplas Máscaras de Movimento (config.yml <-> SQLite <-> Web)",
      "Eliminação Definitiva do Travamento de 59s no WebRTC/MSE e TTFF Instantâneo (< 400ms) com Sub-Stream Pré-Aquecido",
      "Sincronização Bidirecional de Tamanho PiP por Câmera (Padrão GG 1280x720 / extra_large) entre TV e /screens",
      "Descarregamento Automático de Players da Grade durante PiP Ativo na Smart TV (Proteção MediaCodec)",
      "Grade de Capturas TV 4x2 (8 Cards Visíveis Sem Corte) e Player de Vídeo com Fallback Resiliente",
      "Pinch-to-Zoom 5x Nativo na Galeria de Fotos do Smartphone com Reset Duplo-Toque e Pan Clamping"
    ]
  }
];
