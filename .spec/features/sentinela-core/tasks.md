# Tasks: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)

> feature: sentinela-core

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

## T-005 — Telemetria e Monitoramento de Hardware no FastAPI e Web [concluida]
- Refs: US-004, AC-006
- Arquivos: backend/app/services/telemetry.py, backend/app/api/telemetry.py, frontend/src/app/settings/diagnostics/page.tsx
- Notas: Fornece CPU, RAM, temperatura e métricas em tempo real sem bloquear o servidor.

## T-006 — Gestão de Câmeras, Zonas e Sincronização Dinâmica [concluida]
- Refs: US-004, AC-007
- Arquivos: backend/app/api/cameras.py, frontend/src/components/CameraConfigModal.tsx
- Notas: CRUD de câmeras e reconfiguração dinâmica no SQLite e go2rtc.

## T-007 — Heartbeat, Pareamento e Políticas de Dispositivos [concluida]
- Refs: US-005, AC-008
- Arquivos: backend/app/api/devices.py, android/app/src/main/java/com/sentinela/pro/network/SentinelaRepository.kt
- Notas: Registro de Smart TVs e Smartphones com autorização granular de câmeras.

## T-008 — Botão Flutuante FAB para Silenciamento de Alertas no Smartphone [concluida]
- Refs: US-005, AC-009
- Arquivos: android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt, android/app/src/main/java/com/sentinela/pro/network/SentinelaRepository.kt
- Notas: Permite silenciar alertas Telegram por 60 min com feedback visual tátil.

## T-009 — Gateway PiP para Notificações Flutuantes em Smart TVs [concluida]
- Refs: US-005, AC-010
- Arquivos: backend/app/services/pip_gateway.py, android/app/src/main/java/com/sentinela/pro/tv/OverlayService.kt
- Notas: Alertas de eventos críticos sobrepondo streaming com vídeo em tempo real.
