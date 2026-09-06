# Tasks: Aplicativo Android TV (Sentinela TV Netflix Edition)

> feature: android-tv-app

<!--
  Como ler este arquivo (o formato é verificado por `onp-spec audit`):
  - T-xxx = tarefa (código de rastreio, único no projeto inteiro).
  - Toda tarefa referencia em `Refs:` pelo menos uma história de usuário
    (US-xxx) ou critério de aceite (AC-xxx).
  - Toda tarefa lista os arquivos que cria/altera em `Arquivos:` — capriche:
    é o que decide o que `onp-spec plano` roda em PARALELO (arquivos
    disjuntos) e o que roda em sequência.
  - Campos opcionais por tarefa, usados pelo plano de execução:
    `- Modelo: claude-sonnet-5` e `- Esforço: alto` (baixo|medio|alto|xalto|max).
  - Uma tarefa só pode virar [concluida] quando os critérios de aceite dela
    tiverem prova PASS registrada por `onp-spec verify`.
  Status: pendente | em-andamento | concluida
    (atalho: `onp-spec tarefa <feature> <T-xxx> <status>`)
-->

## T-010 — Implementação da TvSidebar e Roteamento Leanback [concluida]
- Refs: US-006, AC-011
- Arquivos: android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt, android/app/src/main/java/com/sentinela/pro/tv/theme/TvDesignTokens.kt
- Notas: Navegação vertical entre abas CAMERAS, RECORDINGS, TOOLS, LOGS, SETTINGS com D-Pad.

## T-011 — Viewport de Câmeras Hero e Carrossel Horizontal [concluida]
- Refs: US-007, AC-012
- Arquivos: android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt, android/app/src/main/java/com/sentinela/pro/ui/components/MseCameraView.kt
- Notas: Player principal com HUD de telemetria e foco fluido no carrossel de canais.

## T-012 — Galeria de Capturas e Player de Evidências [concluida]
- Refs: US-008, AC-013
- Arquivos: android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt
- Notas: Listagem de detecções e reprodução de vídeos MP4 com TvClipPlayerDialog.

## T-013 — Viewport de Ferramentas e Teste de PiP Manual [concluida]
- Refs: US-009, AC-014
- Arquivos: android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt, android/app/src/main/java/com/sentinela/pro/network/SentinelaRepository.kt
- Notas: Diagnósticos de rede, ping do servidor e disparo de janela flutuante de teste.

## T-014 — Viewport de Configurações, Logs e Ajustes de PiP [concluida]
- Refs: US-010, AC-015
- Arquivos: android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt, android/app/src/main/java/com/sentinela/pro/data/SentinelaPreferences.kt
- Notas: Seleção de tamanho do PiP, tempo de exibição e console de telemetria ao vivo.
