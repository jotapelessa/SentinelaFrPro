# STATE.md — Memória Persistente do Projeto

> **Sentinela Frigate Pro**
> **Última Atualização:** 2026-09-06 07:50 BRT
> **Estado Geral:** Auditado via `onp-spec` (30/30 critérios provados, 100% PASS, audit exit 0)

---

## 🎯 Visão e Objetivos Atuais

O Sentinela Frigate Pro é um ecossistema integrado de vigilância inteligente residencial/comercial composto por:
1. **Frigate NVR 0.17 & go2rtc**: Ingestão de vídeo RTSP, aceleração gráfica Intel QSV, IA de detecção de objetos em tempo real.
2. **Sentinela Core (FastAPI Backend)**: Ingestão MQTT, broadcaster WebSocket para UI/TVs em tempo real (<10ms), SQLite/PostgreSQL, persistência de eventos e orquestrador de automações.
3. **Android TV App (Netflix Style)**: Aplicativo Kotlin Jetpack Compose TV com suporte a controle remoto D-Pad, viewport hero com telemetria ao vivo, carrossel de câmeras, galeria de gravações, Picture-in-Picture (PiP) e diagnóstico de rede.
4. **Android Smartphone App (YouTube Style)**: Aplicativo Kotlin Jetpack Compose Mobile com feed vertical estilo YouTube Shorts / Obsidian UI, pinch-to-zoom de 1x a 5x com panning suave, FAB de alarme/silenciador instantâneo, central master de gerenciamento de Smart TVs e controle granular de taxa de quadros (Modo Eco vs Fluido).
5. **Telegram Vault & Drive**: Canal de retenção de fotos e vídeos MP4 em taxa de quadros constante (CFR H.264/AAC) com marca d'água HUD superior profissional, nuvem de tags contextuais para busca instantânea e bot bidirecional para consultas de status, snapshots manuais e pausas de alarme.

---

## 🛡️ Matriz de Especificações e Cobertura onp-spec

Todas as features do projeto são especificadas no diretório `.spec/features/`, possuem testes automatizados de especificação em `test/` e são validadas pelo comando `onp-spec audit`.

| Feature ID | Nome | Critérios | Testes | Status |
|---|---|---|---|---|
| `integracao-frigate` | Integração Frigate NVR 0.17 & go2rtc | AC-001 a AC-005, AC-028 a AC-030 | `test/integracao-frigate.spec.test.js` | 8/8 Provados (PASS) |
| `sentinela-core` | Núcleo de Serviços Sentinela Core | AC-006 a AC-010 | `test/sentinela-core.spec.test.js` | 5/5 Provados (PASS) |
| `android-tv-app` | Aplicativo Android TV (Netflix Edition) | AC-011 a AC-015 | `test/android-tv-app.spec.test.js` | 5/5 Provados (PASS) |
| `android-smartphone-app` | Aplicativo Android Smartphone (YouTube Edition) | AC-016 a AC-021 | `test/android-smartphone-app.spec.test.js` | 6/6 Provados (PASS) |
| `telegram-vault` | Disparo de Fotos e Vídeos para Telegram Drive | AC-022 a AC-027 | `test/telegram-vault.spec.test.js` | 6/6 Provados (PASS) |

**Total de Governança:** 5 Features · 19 Histórias de Usuário · 30 Critérios de Aceite · 30/30 Provados (100% de conformidade com a Constituição `.spec/constituicao.md`).

---

## 🧭 O Que Foi Concluído Recentemente

- **Otimização da Integração Frigate NVR & go2rtc (`integracao-frigate`)**:
  - **AC-028 (Watchdog de Auto-Reconexão e Anti-Congelamento)**: Implementado no `WebRTCPlayer.tsx` heartbeat periódico e tolerância inteligente a stalls com auto-recarregamento isolado e recuperação visual suave, eliminando congelamento em TVs, APKs e Web App.
  - **AC-029 (Pipeline HD Nativo Prioritário para Snapshots e Thumbnails)**: Priorização do frame de resolução nativa full-sensor (`/go2rtc/api/frame.jpeg`) no `WebRTCPlayer.tsx`, `CameraMosaic.tsx` e `frigate_bridge.py`, deixando o detect stream recortado de 360p do Frigate apenas como último recurso de fallback.
  - **AC-030 (Pipeline Resiliente de Clipes CFR com Áudio AAC)**: Validação e transcodificação com reconstrução de timestamps PTS (`setpts=N/(FPS*TB)`), preservação de áudio sincronizado AAC e reenvio exponencial no `frigate_bridge.py` e `mqtt_service.py`.
- **Validação Rigorosa onp-spec**: Auditoria executada com sucesso total (`onp-spec audit`), resultando em exit code 0 e 30/30 critérios provados.
- **Grafo de Conhecimento e Obsidian**: Atualizado via `graphify extract . --code-only` (1.132 nós, 1.864 arestas) e exportado para o cofre Obsidian em `graphify-out/obsidian-vault/` (1.211 notas + canvas).

---

## ⚡ Próximos Passos e Itens em Aberto

1. **Front-end Web (Next.js Dashboard)**:
   - Especificar formalmente as features restantes da interface Web (timeline de gravações, modal de desenho de zonas poligonais e configurações do sistema) com `onp-spec`.
2. **Manutenção do Grafo de Conhecimento**:
   - Sempre executar `graphify extract . --code-only` e `graphify export obsidian --dir graphify-out/obsidian-vault` após alterações de código.
3. **Persistência de Sessão**:
   - Manter este `STATE.md` atualizado em cada início e fim de sessão, preservando decisões técnicas e progresso.

