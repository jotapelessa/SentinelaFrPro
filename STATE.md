# STATE.md — Memória Persistente do Projeto

> **Sentinela Frigate Pro**
> **Última Atualização:** 2026-09-06 07:18 BRT
> **Estado Geral:** Auditado via `onp-spec` (27/27 critérios provados, 100% PASS, audit exit 0)

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
| `integracao-frigate` | Integração Frigate NVR 0.17 & go2rtc | AC-001 a AC-005 | `test/integracao-frigate.spec.test.js` | 5/5 Provados (PASS) |
| `sentinela-core` | Núcleo de Serviços Sentinela Core | AC-006 a AC-010 | `test/sentinela-core.spec.test.js` | 5/5 Provados (PASS) |
| `android-tv-app` | Aplicativo Android TV (Netflix Edition) | AC-011 a AC-015 | `test/android-tv-app.spec.test.js` | 5/5 Provados (PASS) |
| `android-smartphone-app` | Aplicativo Android Smartphone (YouTube Edition) | AC-016 a AC-021 | `test/android-smartphone-app.spec.test.js` | 6/6 Provados (PASS) |
| `telegram-vault` | Disparo de Fotos e Vídeos para Telegram Drive | AC-022 a AC-027 | `test/telegram-vault.spec.test.js` | 6/6 Provados (PASS) |

**Total de Governança:** 5 Features · 18 Histórias de Usuário · 27 Critérios de Aceite · 27/27 Provados (100% de conformidade com a Constituição `.spec/constituicao.md`).

---

## 🧭 O Que Foi Concluído Recentemente

- **Feature Android TV (`android-tv-app`)**: Especificada em `.spec`, com testes cobrindo navegação D-Pad, carrossel de câmeras, galeria de gravações, teste manual de PiP e preferências salvas.
- **Feature Android Smartphone (`android-smartphone-app`)**: Especificada e provada cobrindo feed vertical com `PhoneZoomCameraDialog` (gesto pinch-to-zoom 1x-5x), botão flutuante FAB de silenciamento rápido, diálogo de clipe de evidência, gerenciamento de permissões de TVs pareadas (`DeviceConfigEditDialog`), abas de ferramentas (`PhoneToolsTab`), configurações e logs.
- **Feature Telegram Drive (`telegram-vault`)**: Especificada e provada cobrindo marca d'água HUD superior com linha ciano e timestamp (`apply_watermark`), legenda rica com busca contextual de hashtags, cálculo de janela estendida pré/pós-captura, transcodificação CFR fluida com `supports_streaming: "true"`, guarda de idempotência dupla (`_processed_videos` + `video_sent`) e registro de trilha de auditoria (`record_audit`).
- **Graphify & Obsidian Vault**: Grafo de conhecimento em `graphify-out/graph.json` sincronizado com 1.132 nós e 1.865 arestas; cofre do Obsidian gerado com 1.216 notas em `graphify-out/obsidian-vault/`.

---

## ⚡ Próximos Passos e Itens em Aberto

1. **Front-end Web (Next.js Dashboard)**:
   - Especificar formalmente as features da interface Web (mosaico de câmeras, timeline de gravações, modal de desenho de zonas poligonais e configurações do sistema) com `onp-spec`.
2. **Manutenção do Grafo de Conhecimento**:
   - Sempre executar `graphify extract . --code-only` e `graphify export obsidian --dir graphify-out/obsidian-vault` após alterações de código.
3. **Persistência de Sessão**:
   - Manter este `STATE.md` atualizado em cada início e fim de sessão, preservando decisões técnicas e progresso.
