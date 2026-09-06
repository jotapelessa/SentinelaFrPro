# STATE.md — Memória Persistente do Projeto

> **Sentinela Frigate Pro**
> **Última Atualização:** 2026-09-06 08:48 BRT
> **Estado Geral:** Auditado via `onp-spec` (31/31 critérios provados, 100% PASS, audit exit 0)

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
| `integracao-frigate` | Integração Frigate NVR 0.17 & go2rtc | AC-001 a AC-005, AC-028 a AC-031 | `test/integracao-frigate.spec.test.js` | 9/9 Provados (PASS) |
| `sentinela-core` | Núcleo de Serviços Sentinela Core | AC-006 a AC-010 | `test/sentinela-core.spec.test.js` | 5/5 Provados (PASS) |
| `android-tv-app` | Aplicativo Android TV (Netflix Edition) | AC-011 a AC-015 | `test/android-tv-app.spec.test.js` | 5/5 Provados (PASS) |
| `android-smartphone-app` | Aplicativo Android Smartphone (YouTube Edition) | AC-016 a AC-021 | `test/android-smartphone-app.spec.test.js` | 6/6 Provados (PASS) |
| `telegram-vault` | Disparo de Fotos e Vídeos para Telegram Drive | AC-022 a AC-027 | `test/telegram-vault.spec.test.js` | 6/6 Provados (PASS) |

**Total de Governança:** 5 Features · 20 Histórias de Usuário · 31 Critérios de Aceite · 31/31 Provados (100% de conformidade com a Constituição `.spec/constituicao.md`).

---

## 🧭 O Que Foi Concluído Recentemente

- **Otimização da Integração Frigate NVR & go2rtc (`integracao-frigate`)**:
  - **AC-028 (Watchdog de Auto-Reconexão e Anti-Congelamento)**: Implementado no `WebRTCPlayer.tsx` heartbeat periódico e tolerância inteligente a stalls com auto-recarregamento isolado e recuperação visual suave, eliminando congelamento em TVs, APKs e Web App.
  - **AC-029 (Pipeline HD Nativo Prioritário para Snapshots e Thumbnails)**: Priorização do frame de resolução nativa full-sensor (`/go2rtc/api/frame.jpeg`) no `WebRTCPlayer.tsx`, `CameraMosaic.tsx` e `frigate_bridge.py`, deixando o detect stream recortado de 360p do Frigate apenas como último recurso de fallback.
  - **AC-030 (Pipeline Resiliente de Clipes CFR com Áudio AAC)**: Validação e transcodificação com reconstrução de timestamps PTS (`setpts=N/(FPS*TB)`), preservação de áudio sincronizado AAC e reenvio exponencial no `frigate_bridge.py` e `mqtt_service.py`.
  - **AC-031 (Persistência Atômica, Resolução do Erro 404 e Otimização de Detecção)**:
    - **Diagnóstico da Câmera Nova (`192.168.1.136:8554/live`)**:
      - A análise profunda via `ffprobe` confirmou que a transmissão da câmera possui **qualidade técnica excelente**: codec H.264 High Profile, resolução Full HD 1080p (1920x1080), framerate fluido de 29.9 FPS progressivo, sem perda de pacotes e probe score 100%. A câmera não apresenta transmissão defeituosa ou de baixa qualidade.
    - **Causa Raiz do Erro 404 nos Logs do Frigate / FFmpeg**:
      - O erro `[in#0 @ ...] Error opening input: Server returned 404 Not Found rtsp://127.0.0.1:8554/camera_principal` ocorria porque a câmera antiga `camera_principal` (`192.168.1.6:1935`) estava fisicamente offline ou inacessível na porta 1935.
      - Quando o upstream RTSP está fora, o go2rtc não registra a rota interna no `:8554`. O watchdog do Frigate tentava continuamente reiniciar o FFmpeg a cada 10 segundos, consumindo ciclos de CPU e poluindo os logs com erros 404.
      - Solução: Aplicada a pausa/desativação limpa (`enabled: false`) em `camera_principal` via endpoint `/api/cameras/1/pause`, cessando imediatamente os crashes em loop e liberando todos os recursos do NVR para a câmera ativa.
    - **Resolução da Lentidão na Detecção da Câmera Secundária**:
      - A detecção de objetos do Frigate é disparada por janelas de movimento. Com o `motion.threshold` legado alto (25~30), variações suaves de cena não ativavam o detector com frequência.
      - O limiar de movimento foi ajustado com precisão para `motion_threshold: 18` e persistido atomicamente no SQLite e no Frigate.
      - Resultado imediato nas estatísticas do Frigate (`/api/stats`): a taxa de detecção saltou de 0 FPS para **11.8 FPS**, `camera_fps` cravou em 5.0 FPS sem nenhum frame perdido (`skipped_fps: 0.0`) e inferência no OpenVINO acelerada em **14.5ms**.
- **Otimização do Envio de Mídia para o Telegram (`telegram-vault`)**:
  - **Causa Raiz Resolvida**: Nos testes manuais da interface (`/api/settings/telegram/test-video` e `/test-photo`), o backend mantinha hardcoded o nome da câmera offline `"camera_principal"`. Ao falhar o acesso à câmera inativa, o pipeline de captura do `FrigateBridgeService` acionava um canal sintético do FFmpeg (`testsrc=size=...`), gerando barras de cores de teste em vez da transmissão real da câmera IP.
  - **Solução Arquitetural Implementada**:
    1. **Resolução Dinâmica da Câmera**: Criada a rotina `_resolve_active_test_camera` no `settings.py`, que consulta o banco SQLite e seleciona automaticamente a primeira câmera habilitada (`enabled == True`), apontando para a câmera ativa (`camera_secundaria` / `192.168.1.136`).
    2. **Controle de Fallback Sintético**: `frigate_bridge.record_live_video` recebeu o parâmetro `allow_synthetic: bool = False`. Em testes de câmeras IP, o sistema agora rejeita clipes sintéticos falsos e captura o fluxo real H.264 1080p do go2rtc (`/api/stream.mp4?src={camera_name}&duration={duration_s}`) ou retorna erro detalhado se o stream estiver indisponível.
    3. **Seletor de Câmeras na Interface Web**: Adicionado dropdown visual na Central de Testes da tela de configurações do Telegram (`/settings/telegram/page.tsx`), permitindo ao operador escolher explicitamente qualquer câmera registrada ou usar a câmera ativa pré-selecionada.
- **Deploy e Validação em Produção no Servidor Ubuntu (`192.168.1.247`) via SSH**:
  - Repositório sincronizado no host (`/home/jotape/ServONVIF2/SentinelaFrPro`) via `git pull origin main`.
  - Reconstrução completa dos containers Docker em produção via `docker compose up -d --build backend frontend`.
  - **Teste de Produção Realizado**:
    - Disparado teste de vídeo `/api/settings/telegram/test-video` na API remota:
      - O log do backend confirmou: `🎥 FrigateBridge: Capturando 3s de vídeo a 30 FPS via RTSP (rtsp://frigate:8554/camera_secundaria)...`
      - `✅ FrigateBridge: Vídeo 30 FPS (3s) gravado com sucesso via RTSP (198858 bytes)`
      - `📤 Enviando vídeo MP4 de alerta para o Telegram (-1003995215102, 198858 bytes)...`
      - Resposta da API Telegram: `200 OK` - Clipes sintéticos eliminados definitivamente; vídeo real da câmera entregue no grupo/canal do Telegram.
- **Validação Rigorosa onp-spec**: Auditoria executada com sucesso total (`onp-spec audit`), resultando em exit code 0 e 31/31 critérios provados.
- **Grafo de Conhecimento e Obsidian**: Atualizado via `graphify update .` (1.334 nós, 2.061 arestas, 96 comunidades).

---

## ⚡ Próximos Passos e Itens em Aberto

1. **Front-end Web (Next.js Dashboard)**:
   - Especificar formalmente as features restantes da interface Web (timeline de gravações, modal de desenho de zonas poligonais e configurações do sistema) com `onp-spec`.
2. **Manutenção do Grafo de Conhecimento**:
   - Sempre executar `graphify extract . --code-only` e `graphify export obsidian --dir graphify-out/obsidian-vault` após alterações de código.
3. **Persistência de Sessão**:
   - Manter este `STATE.md` atualizado em cada início e fim de sessão, preservando decisões técnicas e progresso.

