/**
 * Fonte da Verdade Única da Versão do Sentinela Frigate Pro
 * Sincronizada com android/version.properties e o pipeline de release.
 */
export const APP_VERSION = "001.000.000.187";
export const APP_BUILD = 187;
export const BUILD_NUMBER = 187;
export const APP_CODENAME = "Sentinela Pro Ultra";

export const CHANGELOG = [
  {
    version: "001.000.000.187",
    build: 187,
    date: "2026-10-17",
    highlights: [
      "Zero-Copy Memory Aliases no go2rtc (ffmpeg:{cam}_sub#video=copy) — Fim definitivo das quedas de 59s por timeout TCP loopback 8554",
      "Preservação Estrita de Zonas e Máscaras (sync_zones=False por padrão) e Leitura da Malha Real de Detecção (800x448)",
      "Watchdog Web sem Loops de Recarga a cada 13s (remoção de key das dependências) e Tolerância a Micro-Jitter (2500ms)",
      "Isolamento Memoizado de Badges de Detecção de IA no Mosaico Web, Eliminando Repaint Destrutivo de Players",
      "Android TV PiP Instantâneo com Duplo Gatilho (readyState >= 2 no JS + Coroutine de Segurança de 1.5s em Kotlin)",
      "Compatibilidade Unificada de Streaming LAN Sub-200ms e Acesso Remoto Tailscale Funnel TCP 443 (mode=webrtc,mse)"
    ]
  },
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
