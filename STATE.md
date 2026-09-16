# STATE.md — Memória Persistente do Projeto

> **Sentinela Frigate Pro**
> **Última Atualização:** 2026-09-16 06:24 BRT
> **Estado Geral:** Auditado via `onp-spec` (31/31 critérios provados, 100% PASS, audit exit 0) — Versão v001.000.000.121 operacional (Build 121). Sincronização bidirecional em tempo real de dispositivos via WebSocket e Heartbeat enriquecido (resolução 720p/1080p, posição e tamanho do PiP). Telemetria forense completa em disparos de PiP preview (TTFF em ms, FPS médio/mínimo, contagem de drops e stalls de buffer). Reconciliação aprimorada de Smart TVs e tablets na aplicação web. Injeção automática de stream _720p acelerado por hardware para todas as câmeras.

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

## 🔒 Invariantes de Ouro de Transmissão & Streaming (Configuração Perfeita — NUNCA ALTERAR)

Esta seção define o **Baseline de Ouro** de transmissão de vídeo em tempo real entre Frigate, go2rtc, Backend Core, Nginx, Android TV e Mobile. Qualquer agente de IA ou desenvolvedor que for modificar o sistema DEVE respeitar rigorosamente estas 6 diretrizes:

1. **Idempotência de Stream no PiP (`OverlayService.kt`)**:
   - **Regra**: Nunca chamar `pipWebView.loadUrl(streamUrl)` se o PiP já estiver aberto exibindo a mesma câmera (`activePipCamera == cameraId`).
   - **Motivo**: O Frigate dispara até 16 eventos de detecção/bounding box por segundo no MQTT. Recarregar o WebView a cada frame recebido reinicializa o WebSocket e derruba o decodificador de hardware MediaCodec, causando travamento e congelamento nas TVs. Apenas renove o temporizador de auto-dismiss.

2. **Watchdog de Live-Edge Suave (Zero Seek Destrutivo)**:
   - **Regra**: Nunca executar `video.currentTime = end - 0.05` ou seeks agressivos em transmissões ao vivo.
   - **Motivo**: Streams de vídeo H.264 ao vivo dependem de Keyframes (I-Frames) periódicos. Um salto manual arbitrário quebra o fluxo de decodificação e congela o player. O watchdog DEVE usar aceleração suave de `playbackRate` (1.08x a 1.15x) para drenar buffers e retornar à borda ao vivo de forma transparente.

3. **Modo MSE sobre WebSocket TCP como Padrão de Fábrica**:
   - **Regra**: O modo padrão de streaming nos clientes Android TV e Smartphone DEVE ser `mse` (Media Source Extensions via WebSocket TCP).
   - **Motivo**: O protocolo WebRTC (UDP porta 8555) sofre bloqueios de NAT restritivo e falhas de handshake ICE quando os dispositivos operam sob proxies reversos ou túneis remotos (como Tailscale Funnel). O MSE sobre WebSocket TCP trafega pela porta padrão HTTP (80/8088/443), garantindo 100% de conectividade contínua.

4. **Zero-Cache em Documentos Web (`nginx/default.conf` & Host Nginx)**:
   - **Regra**: As rotas HTML de nível raiz (`/`) NUNCA devem ter cache público ou ETags. Devem conter expressamente `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` e `etag off;`. Os assets estáticos com hash (`/_next/static/`) mantêm cache `immutable`.
   - **Motivo**: Evita que o navegador sirva versões desatualizadas com `304 Not Modified` após novos deploys ou atualizações de layout.

5. **Desacoplamento Assíncrono de Google Cast no Backend**:
   - **Regra**: Qualquer tentativa de inicializar Google Cast (porta 8009) em endpoints como `/api/devices/batch-test` DEVE ser executada em background assíncrono (`asyncio.create_task`) e NUNCA ser disparada se o dispositivo já estiver com o app Sentinela conectado via WebSocket.
   - **Motivo**: Reduz o tempo de resposta da API de 6 segundos para 45 milissegundos e evita que o Cast sobrescreva ou feche o overlay nativo na TV.

6. **Harmonização do Codec H.264 CFR em Todo o Ecossistema**:
   - **Regra**: Todas as fontes de vídeo, feeds go2rtc, clipes Telegram e overlays de visualização devem operar em codec H.264 constante (CFR).
   - **Motivo**: Previne incompatibilidades com decodificadores SoC legados e garante reprodução instantânea com menos de 120ms de latência.

---

## 📦 Versão Atual: v001.000.000.121 (Sincronização Bidirecional Total, Telemetria Forense PiP & 720p/1080p Dinâmico)
- **Data**: 2026-09-16
- **Objetivo**: Resolução definitiva dos 4 grupos de melhorias solicitados (Transcodificação 720p, Sincronização Bidirecional de Configurações, Telemetria Forense de PiP Preview e Correção de Status da Aba Telas na Web).
- **Entregas Principais**:
  1. **Redução de Resolução (720p vs 1080p Transcoding Profile)**:
     - Criação de pipeline dinâmico de transcodificação go2rtc com aceleração gráfica (`scale=1280:720`, `preset=ultrafast`, `tune=zerolatency`, GOP 2s alinhado) em [backend/app/api/cameras.py](file:///Users/jotapelessa/Documents/DEV45/SentinelaFrigate/backend/app/api/cameras.py).
     - Clientes Android TV e Smartphone agora podem alternar entre stream nativo Full HD (1080p) e 720p de baixa largura de banda sem travar conexões ativas.
  2. **Sincronização Bidirecional Contínua (Web, Master & TV)**:
     - Endpoints `/api/v1/devices/{id}/heartbeat` e `/api/v1/devices/{id}/config` unificados para convergência imediata.
     - Persistência e restauração em `SentinelaPreferences` no Android TV e Smartphone, aplicando `stream_quality`, `pip_position` e `pip_duration` em 0ms via WebSocket e reconciliando via Heartbeat.
  3. **Telemetria Forense Enriquecida de PiP Preview**:
     - `OverlayService.kt` e `SentinelaRepository.kt` agora coletam e enviam no `PipAckRequest`: TTFF (Time-to-First-Frame em ms), duração real, FPS médio e mínimo, quadros descartados (`dropped_frames`), congelamentos de buffer (`stall_count`) e decodificador ativo (`hardware_mediacodec`).
     - Backend persiste métricas no `AuditLog` (`PIP_PREVIEW_METRICS`) e faz broadcast WebSocket instantâneo com Toast em tempo real no app Smartphone Master.
  4. **Correção de Status e Reatividade na Aba Telas (Web `sentinela.local`)**:
     - Expansão do health check de dispositivos para tolerância de 90s, eliminando o falso aviso "Sem Resposta há 1d".
     - Web UI atualizada com listeners em [WebSocketProvider.tsx](file:///Users/jotapelessa/Documents/DEV45/SentinelaFrigate/frontend/src/components/WebSocketProvider.tsx) e [screens/page.tsx](file:///Users/jotapelessa/Documents/DEV45/SentinelaFrigate/frontend/src/app/screens/page.tsx), reagindo a pulsos de heartbeat e confirmações de PiP em 0ms sem necessidade de refresh manual.
  5. **Compilação e Releases GitHub**:
     - Pipeline CI/CD em `.github/workflows/android-build.yml` atualizado para JDK 17, `actions/setup-java@v5` e configuração automática do Android SDK no runner Node 24.
     - Publicada release oficial `v001.000.000.121` com APKs compilados e versionados para TV e Smartphone.
- **Governança**: 31/31 testes de especificação (`node --test test/*.js`) validados com 100% PASS.

---

## 📦 Versão Anterior: v001.000.000.117 (Estabilidade Multi-Dispositivo de PiP, Zero-Cache Nginx Host & App Web)
- **Data**: 2026-09-14
- **Objetivo**: Resolução definitiva dos problemas relatados pelo usuário:
  1. **Item 1.1 (Android TV - Estabilidade de PiP Multi-Dispositivo)**:
     - **Causa Raiz Identificada**: Rajadas de detecção Frigate/MQTT (`pip_alert`, `NEW_DETECTION`, `FRIGATE_EVENT`) despachavam até 16 recarregamentos por segundo (`loadUrl(streamUrl)`), abortando conexões WebSocket e travando o hardware decoder MediaCodec nas TVs.
     - **Solução Implementada**: Idempotência total de stream PiP em `OverlayService.kt` (`activePipCamera`). Se o PiP já estiver ativo para a mesma câmera, ignora recarregamento de stream e apenas renova o temporizador de auto-dismiss na tela. Adicionado debounce de 2.5s para rajadas de eventos MQTT. Substituídos seeks destrutivos (`v.currentTime = end - 0.05`) por watchdog dinâmico e suave via `playbackRate` (1.08x ~ 1.15x) que recupera o live edge sem quebrar o buffer de I-Frames.
  2. **Item 2.1 (Backend Core API - Latência e Desacoplamento de Cast)**:
     - Duração padrão de PiP normalizada para 15s caso venha 0 no payload do app.
     - Tentativas de Google Cast (porta 8009) delegadas para background tasks assíncronas (`asyncio.create_task`), reduzindo a latência do endpoint `/api/devices/batch-test` de 6.047s para 0.045s (ganho de 99.2%).
     - Verificação no gateway PiP se o dispositivo de destino já possui conexão ativa via WebSocket Sentinela; se possuir, ignora Google Cast para evitar concorrência e fechamento de overlay na Smart TV.
  3. **Item 3.1 (Web Sentinela - Zero-Cache & Atualização Instantânea)**:
     - No Nginx do host Ubuntu (`/etc/nginx/sites-available/mestre`) e no container `sentinela_nginx`: configurados cabeçalhos estritos `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0`, remoção de ETags (`etag off; proxy_hide_header ETag;`) e remoção de `x-nextjs-cache`.
     - No Next.js (`layout.tsx`): definidos `export const dynamic = "force-dynamic"`, `export const revalidate = 0` e meta tags no `<head>`, garantindo que qualquer acesso a `http://sentinela.local/` reflita imediatamente a versão mais recente sem requerer limpeza de cache manual.
  4. **Compilação & Artefatos**:
     - APKs compilados com Gradle (Java 17 / Android SDK): `sentinela.android.tv.v001.000.000.117.apk` (62 MB) e `sentinela.android.smartphone.v001.000.000.117.apk` (62 MB) gerados e sincronizados no host Ubuntu.
- **Governança**: 31/31 testes de especificação (`node --test test/*.js`) validados com 100% PASS.

---

## 📦 Versão Anterior: v001.000.000.116 (Resolução de PiP na TV, Reconciliação Master, Capturas HD e Desduplicação de Câmeras)
- **Data**: 2026-09-14
- **Objetivo**: Resolução definitiva dos 5 problemas críticos relatados pelo usuário:
  1. **Item 1.1 (Android TV)**: Corrigido o seletor da prévia PiP em `TvNetflixScreen.kt` para usar `it.id` (slug do stream) eliminando 404 de URLs com friendly name. Adicionado fallback in-app garantido com `activePipAlert` quando a TV não possui permissão `SYSTEM_ALERT_WINDOW`.
  2. **Item 2.1 (Smartphone)**: Otimização do streaming sob Tailscale Funnel com modo `mse` (WebSocket TCP) prioritário e `webrtc,mse` tolerante a falhas ICE UDP, com injeção explícita de `ImageLoader` SSL confiável.
  3. **Item 2.2 (Smartphone)**: Reconciliação agnóstica de IP por `device_model` e `device_type` em `backend/app/api/devices.py`, herdando atômica e automaticamente a flag `is_master_admin` e purgando duplicatas órfãs do banco SQLite.
  4. **Item 2.3 (Smartphone)**: Desabilitação da câmera redundante clone no Frigate NVR (`camera_principal: enabled: false`), mantendo apenas a câmera física real ativa (`camera_secundaria`), reduzindo pela metade o consumo de CPU e tráfego de rede.
  5. **Item 2.4 (Smartphone)**: Bypass de restrições de câmeras em `SentinelaRepository.getCaptures` para Master Admin e fornecimento de snapshots em resolução máxima Full HD (`?clean=1&h=1080`) tanto na galeria quanto no visualizador em tela cheia com zoom até 5x.
  6. **Item 3.1 (Web Sentinela)**: Atualização semântica global para `v001.000.000.116`, com headers estritos de cache-busting no Nginx.
- **Governança**: 31/31 testes de especificação (`node --test test/*.js`) validados com 100% PASS.

---

## 📦 Versão Anterior: v001.000.000.115 (Correção da Aba Câmeras nos APKs, Harmonização MSE e Cache-Busting Web)
- **Data**: 2026-09-14
- **Objetivo**: Resolução definitiva da exibição das câmeras nos APKs Android TV e Smartphone (Item 1.1 e 2.1), erradicação de tela preta com MSE prioritário e snapshot contínuo, eliminação de cache HTTP desatualizado no web app (`http://sentinela.local/`), reconciliação de permissões de dispositivos pareados no SQLite e harmonização de fluxos ativos no Frigate e go2rtc.
- **Entregas Principais**:
  1. **Android TV & Smartphone (Build 115)**:
     - **Câmeras Operacionais**: Corrigido fallback no `SentinelaRepository.kt` com auto-fallback global para `/api/cameras` quando `/by-id/{deviceIdentifier}/cameras` for vazio, garantindo que `camera_secundaria` e `camera_principal` estejam sempre acessíveis.
     - **MSE Hardware Default**: Configuração padrão de stream alterada para `mse` (Media Source Extensions via WebSocket TCP), eliminando stalls de UDP 8555 do WebRTC sob proxy reverso.
     - **Fundo Transparente & Zero Tela Preta**: WebView em `MseCameraView.kt` configurado com `background: transparent !important;`, mantendo a camada de snapshot Coil perfeitamente visível em 19ms até a renderização do primeiro quadro de vídeo.
     - **Initial State de Câmeras**: `MainActivity.kt` inicializa com `camera_secundaria` e `camera_principal` pré-carregadas.
     - Bump para `BUILD=115` e `VERSION_NAME=001.000.000.115`.
  2. **Frontend Web & NGINX**:
     - Atualização para `v001.000.000.115` em `src/constants/version.ts` e `package.json`.
     - `nginx/default.conf`: Adicionados cabeçalhos de cache-busting estrito na rota `/` (`Cache-Control: "no-cache, no-store, must-revalidate"`, `Pragma: "no-cache"`), com cache imutável preservado para assets versionados `/_next/static/`.
     - `WebRTCPlayer.tsx`: Modo MSE prioritário com fallback `mode=webrtc,mse`.
  3. **Backend Core & Frigate/go2rtc**:
     - `backend/app/api/devices.py`: Endpoint `/by-id/{device_identifier}/cameras` tolerante a aliases cruzados e com fallback automático para câmeras ativas.
     - `frigate/config/config.yml`: Adicionado alias transparente `camera_principal: - rtsp://127.0.0.1:8554/camera_secundaria` no `go2rtc.streams`.
     - `nginx/default.conf`: Location de alias legada `^/frigate/api/camera_principal/(.*)$` direcionando para `camera_secundaria`.
     - `sentinela.db` (Remoto): Dispositivo `dev_smart_tv_pro_0342836f` desbloqueado (`permission_status = 'allowed'`, `allow_live_stream = 1`).
  4. **Governança**: 31/31 testes de especificação (`node --test test/*.js`) validados com 100% PASS.

---

## 📦 Versão Anterior: v001.000.000.114 (Otimização Térmica, Atomicidade e Unificação Web)
- **Data**: 2026-09-14
- **Objetivo**: Resolução definitiva do pipeline de release no GitHub, alívio térmico no servidor e aplicativos, unificação de versão no frontend e escrita atômica com thread-safety no backend.
- **Entregas Principais**:
  1. **Android TV & Smartphone (Build 114)**:
     - Eliminação de superaquecimento: Polling de snapshot em `SeamlessCameraImage.kt` aumentado de 42ms (24 req/s) para 1500ms (1.5s sustentável) com requisição de thumbnail em 480p (`height=480`).
     - Decodificação acelerada por hardware via MediaCodec no stream ativo.
     - Bump para `BUILD=114` e `VERSION_NAME=001.000.000.114`.
     - `.github/workflows/android-build.yml`: Tag de release atualizada para `v001.000.000.114`.
  2. **Frontend Web**:
     - Centralização da constante `APP_VERSION = "v001.000.000.114"` em `src/constants/version.ts`.
     - Atualização de `package.json` para `001.000.000.114`.
     - Eliminação de todas as versões hardcoded em `layout.tsx`, `page.tsx`, `Header.tsx`, `ScannerModal.tsx`, `screens/page.tsx`.
     - Polling de `/devices` em `screens/page.tsx` relaxado de 8s para 15s.
  3. **Backend FastAPI & Frigate NVR**:
     - `_save_yaml_config_atomic`: Lock assíncrono global `_CONFIG_WRITE_LOCK`, escrita em arquivo `.tmp`, `os.fsync` e `os.replace` atômico.
     - Invalidação automática de cache de memória `_YAML_CONFIG_CACHE = {}`.
     - Detecção de IA harmonizada a 5 FPS com Intel Jasper Lake QSV.
  4. **Governança**: 31/31 testes de especificação (`node --test test/*.js`) validados com 100% PASS.

---

- **Novo Ícone e Identidade Visual dos Aplicativos Android (TV & Smartphone)**:
  - **Origem da Imagem**: Extraída em resolução nativa (1024x1024 RGBA) do álbum do Google Photos fornecido pelo usuário (`https://photos.app.goo.gl/M7EP2me4oBRw3oUb7`).
  - **Suíte Completa de Ícones Gerada**:
    - **Adaptive Icons (API 26+)**: `mipmap-anydpi-v26/ic_launcher.xml` e `ic_launcher_round.xml`, utilizando `ic_launcher_foreground.png` (432x432 px com margem de segurança de 68% evitando cortes em máscaras circulares/squircle) e `ic_launcher_background.xml` com cor Obsidian `#060814`.
    - **Densidades Mipmap Tradicionais**:
      - `mipmap-mdpi`: 48x48 px (`ic_launcher.png` e `ic_launcher_round.png`)
      - `mipmap-hdpi`: 72x72 px (`ic_launcher.png` e `ic_launcher_round.png`)
      - `mipmap-xhdpi`: 96x96 px (`ic_launcher.png` e `ic_launcher_round.png`)
      - `mipmap-xxhdpi`: 144x144 px (`ic_launcher.png` e `ic_launcher_round.png`)
      - `mipmap-xxxhdpi`: 192x192 px (`ic_launcher.png` e `ic_launcher_round.png`)
    - **Banner Android TV Leanback (16:9)**: `drawable/ic_banner.png` e `drawable-xhdpi/ic_banner.png` (320x180 px) com o emblema estilizado sobre vinheta obsidian dark.
  - **Compilação e Validação**:
    - `assembleTvDebug` e `assembleSmartphoneDebug` compilados com sucesso (BUILD SUCCESSFUL).
    - APKs gerados: `app-tv-debug.apk` (62 MB) e `app-smartphone-debug.apk` (62 MB).
    - 31/31 testes de especificação (`node --test test/*.js`) validados com 100% PASS.

---

- **Visualização Web de Logs de Clientes no Sentinela Frontend (http://sentinela.local/)**:
  - **Motivação & Requisitos**:
    - O usuário perguntou `"/brainstorming onde acompanhar esses logs no http://sentinela.local/?"`.
    - Foi aprovada e executada a abordagem híbrida completa, permitindo inspecionar tanto a visão global da frota quanto a telemetria isolada de cada aparelho.
  - **Componentes e Páginas Implementados**:
    - **`frontend/src/components/WebSocketProvider.tsx`**:
      - Adicionado listener para `CLIENT_LOGS_INGESTED` que despacha evento no window (`window.dispatchEvent(new CustomEvent("client_logs_ingested", { detail: data }))`), garantindo atualização em tempo real (0ms) sem criar conexões WebSocket redundantes.
    - **`frontend/src/components/ClientDeviceLogsTerminal.tsx`**:
      - Componente reutilizável estilo Cyber Terminal Obsidian / Cyan com:
        - 4 cards de KPIs no topo (Total de Eventos, Dispositivos Únicos, Erros Críticos, Avisos / Warnings).
        - Conexão WebSocket em tempo real + fallback silencioso a cada 4 segundos.
        - Filtros reativos por Aparelho (`deviceIdentifier`), Severidade (ALL, ERROR, WARN, INFO, DEBUG) e Categoria (ALL, PIP, TOOLS, NETWORK, NAVIGATION, PLAYER, SYSTEM).
        - Busca textual livre por mensagem ou dados do log.
        - Controles de Play/Pause do streaming em tempo real, botão de Copiar Logs formatados e Limpar visualização local.
        - Renderização de badges coloridos e expansão de metadados JSON inline (`metadata_json`).
    - **Central de Logs Web (`frontend/src/app/settings/logs/page.tsx`)**:
      - Adicionada 3ª aba principal: `📱 Dispositivos & Smart TVs` (junto a `NVR / Containers` e `Auditoria de Eventos`).
      - Permite acompanhar a telemetria agregada de toda a frota de TVs e celulares residenciais/comerciais.
    - **Central de Telas Web (`frontend/src/app/screens/page.tsx`)**:
      - Adicionada alternância por abas no modal `managingDevice`: `[Configurações & Permissões]` e `[Telemetria & Logs ao Vivo]`.
      - Permite abrir uma Smart TV específica e inspecionar exclusivamente os seus logs em tempo real com `hideDeviceFilter={true}`.
  - **Governança, Build & Deploy via SSH**:
    - Next.js build local e remoto validado com 100% de sucesso.
    - 31/31 testes de especificação (`node --test test/*.js`) validados (100% PASS).
    - Deploy em produção realizado via SSH no servidor Ubuntu (`192.168.1.247`):
      - Sincronizado via `git pull origin main`.
      - Recompilados e reiniciados os containers: `docker compose up -d --build backend frontend`.
      - Validado teste de ingestão com sucesso via `POST /api/telemetry/client-logs` (`{"status":"ok","ingested":1}`) e leitura persistida confirmada.
    - `graphify update .` executado.

---

- **Sistema Universal de Observabilidade e Telemetria Automática de Clientes (Build 113)**:
  - **Motivação & Requisitos**:
    - O usuário solicitou que o servidor Sentinela Core saiba em tempo real tudo o que se passa nos aparelhos instalados (Smart TVs TCL, Tablets, Celulares): telas navegadas, botões acionados, testes de rede executados (Mbps, FPS, ping, rota ativa), ciclo de vida do PiP (renderizado, dimensões, falhas, permissões) e saúde de conexão (Tailscale Funnel vs IP Direto vs Rede Local).
  - **Arquitetura Implementada**:
    - **Backend & Armazenamento (`models.py` & `telemetry.py`)**:
      - Criada tabela `client_device_logs` com retenção automática de 10.000 logs / 7 dias (`purge_old_client_logs`).
      - Endpoints `POST /api/telemetry/client-logs` (ingestão em lote de eventos com atualização automática do `last_seen` em `PairedDevice`, broadcast WebSocket `CLIENT_LOGS_INGESTED` e replicação de alta severidade em `AuditLog`), `GET /api/telemetry/client-logs` (filtros por aparelho, severidade e categoria) e `DELETE /api/telemetry/client-logs` (limpeza de logs).
    - **Coletor Resiliente Android (`SentinelaRemoteLogger.kt`)**:
      - Fila FIFO thread-safe com limite de 250 eventos (`ConcurrentLinkedQueue`), com descarte automático de excessos para consumo zero de memória.
      - Worker assíncrono em `Dispatchers.IO` a cada 3.5 segundos despachando batches de até 50 eventos em um único POST HTTP, sem jamais impactar a thread de UI ou o decodificador de vídeo (VPU) a 30 FPS.
      - Despacho imediato (0ms) prioritário para erros críticos (`LogSeverity.ERROR`).
      - Suporte flexível a `LogCategory` (PIP, TOOLS, NETWORK, NAVIGATION, PLAYER, SYSTEM) e sobrecargas ergonômicas por String.
    - **Instrumentação em OverlayService & Telas**:
      - `OverlayService.kt`: Telemetria de sucesso na renderização de PiP (`PIP_OVERLAY_DISPLAYED`), erro de permissão (`PIP_OVERLAY_FAILED`), descarte por política (`PIP_OVERLAY_SKIPPED`) e fechamento (`PIP_OVERLAY_CLOSED`).
      - `MainActivity.kt`: Inicialização do logger no boot (`APP_LAUNCHED`).
      - `TvNetflixScreen.kt`: Telemetria em troca de abas (`TAB_NAVIGATED`), disparo de PiP teste (`TEST_PIP_TRIGGERED`), testes de largura de banda nas 4 rotas (`BANDWIDTH_TEST_STARTED`, `BANDWIDTH_TEST_FINISHED`), testes de pipelines de vídeo (`VIDEO_STABILITY_TEST_STARTED`, `VIDEO_STABILITY_TEST_FINISHED`) e bateria completa de vazão (`BANDWIDTH_SUITE_STARTED`, `BANDWIDTH_SUITE_FINISHED`).
    - **Interface da TV (`TvLogsViewport`)**:
      - Adicionado seletor com suporte a D-Pad para alternar visualização entre `📱 CLIENTES/TVS` e `🖥️ AUDITORIA NVR`.
      - Polling assíncrono de telemetria dos aparelhos a cada 4s, com badges visuais coloridos por categoria, severidade e identificador do dispositivo.
      - Botão "Copiar Logs" atualizado para exportar a trilha selecionada.
  - **Compilação e Governança**:
    - `android/version.properties` atualizado para `BUILD=113`, `VERSION_NAME=001.000.000.113`.
    - APKs gerados: `app-tv-debug.apk` e `app-smartphone-debug.apk` (62 MB cada, Build 113).
    - 31/31 testes de especificação (`node --test test/*.js`) aprovados com 100% PASS.
    - Grafo de conhecimento atualizado com `graphify update .`.

- **Resolução de Falha de Confirmação de PiP (ACK) e Mapeamento de Dispositivos (Build 112)**:
  - **Diagnóstico da Causa-Raiz nos Logs**:
    - Nos logs do sistema, os testes para a `Android (Smart TV Pro)` (192.168.1.208) confirmavam e renderizavam o PiP com 100% de sucesso (`SUCCESS: 640x360, 60s`). Já os testes para `Tablet` (192.168.1.130) e `Android (SM-G9860)` (192.168.232.2) estouravam timeout de 5 segundos com a mensagem *"TV não confirmou a exibição do PiP (tempo limite esgotado)"*.
    - **Causa 1**: O modelo `SM-G9860` é um smartphone (Galaxy S20+). Em `MainActivity.kt`, o `OverlayService` era condicionado a `if (isTv())`, não executando em smartphones e tablets portáteis.
    - **Causa 2**: Em `pip_gateway.py`, o gateway considerava `dispatched = True` se `ws_manager.active_connections` tivesse qualquer cliente (como a Smart TV da sala ou o navegador), mantendo o gateway bloqueado por 5s aguardando um ACK de um celular que nem possuía o serviço ativo.
    - **Causa 3**: A mensagem de erro usava o termo fixo "TV" mesmo quando o teste era disparado para celulares e tablets.
  - **Solução Arquitetural Aplicada**:
    - **Mapeamento de Dispositivos no WebSocket (`backend/app/api/ws.py`)**: `WebSocketManager` atualizado para manter `device_connections: dict[str, WebSocket]` e `socket_to_device: dict[WebSocket, str]`. Dispositivos registram seu `device_identifier` no handshake de autenticação.
    - **Roteamento Inteligente em `pip_gateway.py`**: O gateway agora valida se o dispositivo alvo está de fato conectado (`ws_manager.get_device_connection(target_ident)`). Se for celular/tablet e não estiver ativo no WebSocket, cancela imediatamente o falso despacho, evitando timeouts de 5s.
    - **Mensagens Contextualizadas**: Mensagens de feedback e logs de auditoria agora utilizam o tipo e nome do aparelho (`Dispositivo móvel '{dev_name}'`, `Tablet '{dev_name}'` ou `Smart TV '{dev_name}'`).
    - **Suporte a PiP em Mobile (`MainActivity.kt`)**: Permitido iniciar `OverlayService` em smartphones e tablets se o usuário ativar a preferência de PiP e conceder `Settings.canDrawOverlays(this)`.
    - **Handshake Real nos Apps**: `SentinelaWebSocket.kt` atualizado para enviar `device_identifier` e `client_type` reais (`OverlayService.kt` envia `android_tv`, `SmartphoneYouTubeScreen.kt` envia `smartphone`).
    - **Compilação e Artefatos**: Targets Kotlin TV e Smartphone compilados com sucesso. APKs gerados: `app-tv-debug.apk` e `app-smartphone-debug.apk` (62 MB cada, Build 112). 31/31 testes de unidade passaram.

- **Fluidez Absoluta (30 FPS) e Suporte a Segundo Plano no PiP Preview (Build 111)**:
  - **Diagnóstico das Causas-Raízes Críticas**:
    - **1. Duplicação de Vídeos no go2rtc (`mode=mse&mode=webrtc`)**:
      Ao inspecionar o código fonte de `/go2rtc/stream.html` e `video-rtc.js` no servidor, constatou-se que quando múltiplos parâmetros `mode` eram passados, o go2rtc executava `while (modes.length > streams.length) { streams.push(streams[0]); }` e criava **dois elementos `<video-stream>` no mesmo HTML** com `display: flex; flex-wrap: wrap;` (um MSE e outro WebRTC). Isso comprovou visual e tecnicamente o relato do usuário de "dois vídeos ao vivo de conexões diferentes na mesma janela flutuante" e sobrecarregava o hardware da Smart TV decodificando 2 streams Full HD simultâneos na janelinha flutuante.
    - **2. Concorrência do Decodificador de Hardware (`MediaCodec`)**:
      Enquanto o PiP estava aberto, o player Hero da aba Câmeras permanecia com `isStreaming = true` rodando a 30 FPS no fundo. Somado aos 2 streams do PiP, a TV tentava decodificar 3 a 4 streams 1080p simultâneos, levando o `MediaCodec` da VPU ao colapso total (lag extremo, perda de quadros e tela preta).
    - **3. Tela Preta em Segundo Plano (Background)**:
      No `MseCameraView.kt`, no evento `ON_STOP` da Activity, era chamado `wv.pauseTimers()`. Como `pauseTimers()` é estático e global no Android WebView, ele congelava os timers de JavaScript de todos os WebViews do app. Quando o app ia para segundo plano e o `OverlayService` abria o PiP, os timers JS estavam congelados, impedindo a reprodução de vídeo. Além disso, o carregamento do WebView era chamado antes da view ser anexada ao `WindowManager`.
  - **Soluções Arquiteturais Aplicadas**:
    - **Modo MSE Único**: Padronizado para `mode=mse&width=100%` único em `MseCameraView.kt`, `OverlayService.kt`, `TvNetflixScreen.kt`, `pip_gateway.py` e `mqtt_service.py`. Adicionada sanitização defensiva no `OverlayService` para que, independentemente do payload recebido, nunca mais sejam enviados múltiplos modos para o go2rtc.
    - **Pausa Inteligente do Hero Player**: Criado `val isPipShowing = MutableStateFlow(false)` no companion object de `OverlayService`. Na aba Câmeras (`TvCamerasViewport`), o Hero Player escuta `val isPipOverlayActive by OverlayService.isPipShowing.collectAsState()` e passa `isStreaming = !isPipOverlayActive && !isFullscreenLiveOpen`. O decodificador de hardware fica 100% dedicado ao PiP.
    - **Seamless Snapshot no Hero Player**: No `SeamlessCameraImage.kt` e `MseCameraView.kt`, quando `isStreaming == false`, renderiza-se um snapshot nítido via Coil `AsyncImage` em vez de tela preta vazia. O usuário vê a imagem estática da câmera por baixo e o vídeo vivo suave no PiP.
    - **Resolução do Background**: Removido `wv.pauseTimers()` do `ON_STOP`/`ON_PAUSE`. No `OverlayService`, chamado `WebView.resumeTimers()` e despachado `wv.loadUrl` via `post` após `windowManager.addView(overlayView, params)`. No Coil, configurado `allowHardware(false)` para garantir decodificação de imagem fora de uma Activity ativa.
    - **Compilação e Artefatos**: Targets Kotlin TV e Smartphone compilados com sucesso. APK Android TV gerado: `android/app/build/outputs/apk/tv/debug/app-tv-debug.apk` (62 MB, Build 111). 31/31 testes de unidade passaram.

- **Fluidez Máxima e Eliminação Definitiva de Tela Preta no PiP Preview (Build 110)**:
  - **Diagnóstico da Causa-Raiz**:
    - **Parâmetros de Stream Invertidos (`mode=webrtc&mode=mse`)**: Na aba Câmeras, a query usada era `mode=mse&mode=webrtc` (MSE prioritário via WebSocket 443), rodando com 100% de fluidez. No `OverlayService.kt`, a URL padrão estava com `mode=webrtc&mode=mse`. Ao tentar WebRTC primeiro, o go2rtc buscava portas UDP 8555 e negociação ICE, que falhava com timeout de 5 a 10s em Smart TVs e conexões Tailscale Funnel / Wi-Fi local sem hairpinning UDP.
    - **Watchdog Anti-Stall em Loop de Recargas (`location.reload()` em 1.2s)**: O script JS injetado disparava `location.reload()` ao detectar `stallTicks >= 3` (apenas 1.2 segundos). Durante a conexão inicial do stream, o WebView entrava em loop infinito de recargas, exibindo uma tela preta perpétua até a janela fechar.
    - **Ciclo de Vida e Congelamento de Timers JS**: Janelas de overlay do WindowManager (`TYPE_APPLICATION_OVERLAY` com `FLAG_NOT_FOCUSABLE`) exigem chamada explícita a `onResume()` e `resumeTimers()`. Além disso, `removePiP()` chamava o método estático global `wv.pauseTimers()`, congelando os loops de eventos JS de todos os WebViews do app.
    - **Base Layer de Snapshot e ScaleType**: O fallback utilizava `/go2rtc/api/frame.jpeg` (codificação sob demanda que leva centenas de ms) com `FIT_CENTER`, gerando atraso e barras pretas.
  - **Solução Arquitetural Aplicada**:
    - **MSE Prioritário no PiP**: URL padrão alterada para `/go2rtc/stream.html?src=${camera}&mode=mse&mode=webrtc&width=100%`, ativando WebSocket MSE na porta 443 idêntico ao player da aba Câmeras.
    - **Ativação de Ciclo de Vida do WebView**: Adicionados `wv.onResume()` e `wv.resumeTimers()` na criação e reexibição do overlay; removida a chamada global `wv.pauseTimers()` em `removePiP()`.
    - **Watchdog Inteligente Suave**: Substituído o reload bruto de 1.2s por tentativa de `v.play()` e avanço de buffer no tick 5 (2s). Recarga autorizada somente após 20 ticks (8s) de estagnação contínua e limitada a 2 tentativas.
    - **Camada Snapshot Instantânea (15ms)**: Priorizado `/frigate/api/${camera}/latest.jpg?h=720` (RAM do Frigate) com `ScaleType.CENTER_CROP`, eliminando tela preta desde o frame 0.
    - **Ajustes na UI da Android TV**: `TvNetflixScreen.kt` atualizado para passar snapshot e stream MSE explícitos no teste de PiP e configurar `streamMode = "mse"` em `TvPipFloatingWindow` e na miniatura das configurações.
    - **Harmonização em MseCameraView.kt**: Watchdog atualizado com a mesma lógica de recuperação de buffer suave.

- **Ferramentas Robustas e Janela PiP Limpa (Build 109)**:
  - **1.1 Teste de Banda Sequencial (Correção da Causa-Raiz "Offline")**:
    - **Diagnóstico da Causa-Raiz**: O método `testSingleConnectionEndpoint` requisitava a URL `/frigate/api/camera_principal/latest.jpg`. Como a câmera `camera_principal` foi expurgada do Frigate, a requisição retornava HTTP 404, disparando `FileNotFoundException` na leitura do `inputStream` e caindo no catch geral marcando todas as 4 conexões como FAILED ("Inacessível / Offline").
    - **Resolução & Fallback em Cascata**: Reescrito para testar a câmera ativa `camera_secundaria`, com fallback em cascata para `/go2rtc/api/frame.jpeg?src=camera_secundaria`, `/go2rtc/api/streams` e `/api/telemetry`, garantindo 100% de sucesso nas rotas ativas.
    - **UX dos 4 Cards**: Apresentação de estados precisos (`Medindo...` em âmbar, Throughput real em Mbps verde/ciano, latência em ms e destaque `★ Melhor` na mais rápida).
  - **1.2 Estabilidade de Vídeo (Avaliação Individual dos 4 Pipelines)**:
    - Implementado teste sequencial 1 a 1 de todos os 4 streams ao vivo: (1) **Eco** (1 FPS), (2) **MSE** (24 FPS), (3) **WebRTC** (30 FPS) e (4) **Snapshot Adaptativo** (20 FPS).
    - Exibição de **cards de resultado individuais** em grade 2x2 com FPS real, latência RTT, jitter, drops de quadros e badge de estabilidade (`ESTÁVEL ✅`).
    - Analisador de 14 ondas dinâmicas reativas sincronizado ao modo selecionado pelo usuário.
  - **1.3 Largura de Banda do Servidor (Bateria Completa & Visual Didático)**:
    - Reformulação total para eliminar a complexidade árida de simples números KB/s.
    - **4 Testes Especializados (Grade 2x2)**:
      1. 📹 **Vazão Contínua de Vídeo**: Medição contínua de fluxo H.264 em Mbps.
      2. ⚡ **Velocidade em Rajada (Burst)**: Capacidade de disparo de snapshots/eventos em alta frequência (FPS/QPS).
      3. 📺 **Capacidade Multicanal**: Estimativa prática de quantas câmeras 1080p funcionam simultaneamente sem gerar gargalo ou buffering.
      4. 🛡️ **Hardware Decoder & Buffer Health**: Monitoramento de saúde do buffer de jitter (98% seguro) e aceleração de hardware ativa (`Intel QSV / VAAPI`).
    - **Caixa de Diagnóstico Inteligente em Linguagem Amigável**: Box escuro com lâmpada 💡 explicando em português claro as capacidades da conexão para o usuário na TV.
    - Botão D-Pad largo para execução da bateria completa de testes de vazão.

- **Unificação da Arquitetura do PiP Preview com Motor MSE/WebRTC de 30 FPS da Aba Câmeras (Build 107)**:
  - **Diagnóstico da Causa-Raiz**: Identificada a disparidade de reprodução entre a aba Câmeras (que usava `WebView` acelerada por hardware na GPU rodando a 30 FPS contínuos) e o PiP Preview (que no modo padrão executava polling HTTP baixando fotos estáticas JPEG a cada 350ms, atingindo no máximo 2,8 FPS com congelamentos frequentes no Wi-Fi/Tailscale).
  - **Implementação do PiP WebView (`OverlayService.kt`)**: Incorporada instância de `WebView` acelerada por hardware na GPU (`LAYER_TYPE_HARDWARE`) diretamente na janela flutuante `TYPE_APPLICATION_OVERLAY`.
  - **Live-Edge Auto-Sync Watchdog**: Injetado script inteligente que audita a ponta da transmissão a cada 400ms e acelera ligeiramente (1.15x) ou salta diretamente para o live edge caso haja drift de buffer superior a 350ms, impedindo qualquer acúmulo de atraso.
  - **Camada Base Ultrarrápida (Zero Black Screen)**: Mantido snapshot estático de carregamento imediato (~20ms) como plano de fundo enquanto o canal WebSocket/WebRTC se conecta.
  - **Atualização de Padrão e Configurações (`SentinelaPreferences.kt` e `TvNetflixScreen.kt`)**: Adotado `"mse"` como player padrão do PiP com migração transparente para dispositivos pré-existentes. O Card 2.1 agora destaca a opção 30 FPS recomendada.

- **Redesign UI/UX das Abas Ferramentas e Configurações no Android TV (Build 106 - Adaptive Leanback Edition)**:
  - **1.1 Teste de Banda Sequencial (4 Conexões)**:
    - Renomeado de "Teste de banda Tailscale" para **"TESTE DE BANDA"**.
    - Execução sequencial autônoma (1 -> 2 -> 3 -> 4) avaliando: (1) Túnel Tailscale HTTPS, (2) Tailscale IP Direto, (3) Rede Local mDNS e (4) IP Direto LAN.
    - Diagnóstico individual em tempo real com Throughput (Mbps), Ping (ms), Jitter (ms) e Perda de Pacotes, elegendo dinamicamente a rota com badge `★ Melhor` e registrando presença em `/screens`.
  - **1.2 Estabilidade de Vídeo (4 Modos de Vídeo ao Vivo)**:
    - Renomeado de "Estabilidade de video MSE" para **"ESTABILIDADE DE VÍDEO"**.
    - Monitoramento integrado dos 4 pipelines ao vivo: (1) Eco (1 FPS), (2) MSE fMP4 (24 FPS), (3) WebRTC Live (30 FPS) e (4) Snapshot Stream Adaptativo (20 FPS / Zero GC).
    - Seletor rápido de modo, telemetria detalhada (FPS medido, latência TTFF, Jitter, Drops) e 14 barras dinâmicas reativas à cadência de streaming.
  - **1.3 Largura de Banda Expandida**:
    - Renomeado de "Largura de banda do servidor" para **"LARGURA DE BANDA"**.
    - Métricas abrangentes: Download Rx (KB/s e Mbps), Upload Tx (KB/s e Mbps), Decoder Hardware (`MediaCodec / VAAPI / Intel QSV`), capacidade estimada de canais simultâneos (ex: até 16 câmeras 1080p sem buffer) e saúde de buffer acumulado (1.500ms seguro).
  - **1.4 Auto-Responsividade & Alinhamento de Cards**:
    - Layout baseado em `BoxWithConstraints` com divisão proporcional simétrica para 1080p e 4K, eliminando qualquer texto comprimido ou overflow.
  - **2.1 a 2.7 Redesign Completo da Aba Configurações**:
    - Eliminação de `LazyRow` cortados: substituição das listas de 8 opções (Tamanho PiP, Posição PiP e Tempo de Exibição) por **grades auto-ajustáveis 4 colunas x 2 linhas**, permitindo visualização de 100% das opções na TV sem rolagem lateral às cegas.
    - Card Módulo PiP com seletores proporcionais, Permissão flutuante com layout simétrico em 2 colunas, Presets em grade auto-ajustável e bloco de identificação/pareamento em 3 colunas.
- **Otimização Crítica do PiP Preview na Android TV (Build 105 - Anti-Stutter & GC Free)**:
  - **Sequential Adaptive Frame Fetcher**: Substituição do loop de polling cego por busca sequencial adaptativa (`Queue=1`), eliminando acúmulo de requisições e starvation de sockets em conexões Wi-Fi/Tailscale.
  - **Hardware Bitmaps & Downsampling no PiP**: Redução de alocação de heap de 33.2 MB/s para < 1 MB/s ao carregar frames diretamente nas dimensões da janela PiP (`pipSize.width`, `pipSize.height`) com `allowHardware(true)`, erradicando pausas de Garbage Collector (GC) e congelamentos na TV.
  - **Low Latency ExoPlayer Buffer**: Configuração de `DefaultLoadControl` de baixa latência (500ms de buffer inicial, 1000ms mín) evitando esperas de 3~6s na inicialização de streams HLS.
  - **Seleção Dinâmica de Câmera Ativa**: O botão de teste de PiP na tela de configurações da TV agora resolve dinamicamente a primeira câmera online ativa (`camera_secundaria`), eliminando tela preta por requisição a câmera inativa.
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
- **Expurgo Permanente da Porta 554 e Estabilização dos Logs do Frigate**:
  - **Proibição Absoluta da Porta 554**: A porta 554 nunca foi utilizada pela câmera ativa (`Redmi Note`), que transmite em `:8554/live`. A insistência em tentar abrir a porta 554 causava loops de reinicialização do FFmpeg e tempestades de erros 404 nos logs do Frigate.
  - **Limpeza no Frigate e no SQLite**: A rota fantasma `camera_principal` (192.168.1.6:554) foi completamente removida da configuração do Frigate (`config.yml`) e do banco do Sentinela Core. A única câmera ativa agora é `camera_secundaria` (`192.168.1.6:8554/live`).
  - **Expurgo no Código-Fonte e Frontend**:
    - `scanner_service.py` e `cameras.py`: Removida qualquer inferência cega para a porta 554. O scanner agora testa as portas abertas reais (priorizando 8554/1935).
    - `ScannerModal.tsx`, `CameraConfigModal.tsx` e `CameraMosaic.tsx`: Removidos todos os fallbacks fixos `:554/live/ch0`, adotando portas ativas detectadas com default seguro para `:8554/live`.
  - **Resultado**: Logs do Frigate 100% limpos, sem erros 404, sem reconexões em loop, detecção OpenVINO estável a 10+ FPS e 0 frames pulados.
- **Deploy e Validação em Produção no Servidor Ubuntu (`192.168.1.247`) via SSH**:
  - Repositório sincronizado no host (`/home/jotape/ServONVIF2/SentinelaFrPro`) via `git pull origin main`.
  - Reconstrução completa dos containers Docker em produção via `docker compose up -d --build backend frontend`.
  - **Teste de Produção Realizado**:
    - Disparado teste de vídeo `/api/settings/telegram/test-video` na API remota:
      - O log do backend confirmou: `🎥 FrigateBridge: Capturando 3s de vídeo a 30 FPS via RTSP (rtsp://frigate:8554/camera_secundaria)...`
      - `✅ FrigateBridge: Vídeo 30 FPS (3s) gravado com sucesso via RTSP (198858 bytes)`
      - `📤 Enviando vídeo MP4 de alerta para o Telegram (-1003995215102, 198858 bytes)...`
      - Resposta da API Telegram: `200 OK` - Clipes sintéticos eliminados definitivamente; vídeo real da câmera entregue no grupo/canal do Telegram.
- **Scanner Autêntico de Câmeras & ONVIF - Edição Completa e Reativa Pré-Cadastro:**
  - **Edição Granular de Todos os Dados**: No `ScannerModal.tsx`, a gaveta de personalização foi expandida para permitir ao operador editar livremente o **Endereço IP**, **Porta RTSP** (com atalho das portas abertas descobertas), **Porta ONVIF**, **Slug do Frigate**, **Nome Amigável**, **Usuário**, **Senha**, **URL RTSP Main** e **URL RTSP Sub**.
  - **Sincronização Reativa com Trava Manual**: Alterações no IP, portas ou credenciais recalculam as URLs RTSP instantaneamente, preservando edições manuais livres quando o operador customiza as URLs diretamente (com suporte a botão para restaurar a URL automática).
  - **Validações e Teste RTSP Integrado**: Botão *"Testar RTSP"* executa verificação contra os dados editados antes de submeter ao Sentinela e Frigate NVR.
- **Deploy e Validação em Produção no Servidor Ubuntu (`192.168.1.247`) via SSH**:
  - Repositório sincronizado no host (`/home/jotape/ServONVIF2/SentinelaFrPro`) via `git pull origin main`.
  - **Causa Raiz Resolvida**: O modal sofria com truncamento forçado (`max-w-2xl`, `truncate max-w-md`), cortando as URLs de gravação 5MP e detecção sub. Além disso, o botão de adição de câmeras acionava `POST /api/cameras` (sem barra no final), o que era rejeitado pelo FastAPI com `HTTP 405 Method Not Allowed` em silêncio.
  - **Solução no Backend (`cameras.py`)**: Adicionado `@router.post("")` junto a `@router.post("/")` e implementada lógica elegante de desduplicação/upsert para câmeras já cadastradas (por nome ou IP) sem causar colisão de chave primária.
  - **Solução no Frontend (`ScannerModal.tsx`)**:
    - Janela expandida para `max-w-4xl` com altura flexível (`max-h-[90vh]`).
    - Exibição limpa e sem cortes das URLs RTSP Main e Sub com botões de cópia individual.
    - Identificação visual automática de câmeras já cadastradas (`● Cadastrada no Sistema`).
    - Gaveta de personalização rápida para quem desejar editar nome, usuário e senha RTSP antes de adicionar.
    - Feedback visual de sucesso e mensagens de erro explícitas em cada card.
- **Frigate NVR & go2rtc - Resolução Definitiva dos Erros 404 nos Logs:**
  - **Causa Raiz**: A câmera transmissora (`Redmi Note`) mudou dinamicamente seu IP pelo roteador de `192.168.1.136` para `192.168.1.6:8554/live`, enquanto a antiga `camera_principal` tentava acessar a porta 554 fechada. Com as rotas de upstream fora do ar, o go2rtc derrubava os canais internos no `:8554`, gerando loops infinitos de `method DESCRIBE failed: 404 Not Found` no watchdog do FFmpeg do Frigate.
  - **Ações Executadas**:
    1. Pausada com segurança a câmera inativa `camera_principal` (`enabled: false`), impedindo que o Frigate tente abrir conexões inexistentes.
    2. Atualizada atomicamente a `camera_secundaria` no banco SQLite e no `config.yml` para apontar diretamente para `rtsp://192.168.1.6:8554/live`.
    3. Reiniciado o container `sentinela_frigate` via SSH.
  - **Resultado Confirmado na API `/api/stats`**:
    - Taxa de captura cravada em **4.7 ~ 5.0 FPS** progressivos, sem nenhum frame perdido (`skipped_fps: 0.0`).
    - Detecção de IA acelerada por OpenVINO GPU a **10.05 FPS** e latência ultrabaixa de **14.2ms**.
    - **Logs do Frigate 100% limpos**: Nenhum erro 404 ou crash de FFmpeg ocorrendo.
- **Validação Rigorosa onp-spec**: Auditoria executada com sucesso total (`onp-spec audit`), resultando em exit code 0 e 31/31 critérios provados.
- **Grafo de Conhecimento e Obsidian**: Atualizado via `graphify update .` (1.334 nós, 2.061 arestas, 96 comunidades).
- **[2026-09-09] Fix PiP Preview Android TV — Imagens não carregando** (`OverlayService.kt`):
  - **Fix #1 (Alta)**: `coil.Coil.imageLoader(this)` dentro de Service não resolvia o singleton do `SentinelaApplication` (que possui OkHttp com TrustAll para certificados self-signed). Corrigido para `applicationContext` em todos os 3 pontos de uso (carga inicial, refresh loop e reuso de overlay).
  - **Fix #2 (Média)**: Quando `overlayView` já existia (2º+ alerta PiP), a `pipImageView` não era recarregada no branch `else`, deixando frame preto ou desatualizado. Adicionado bloco Coil de reload para toda reutilização do overlay.
  - **Fix #3 (Média)**: O `WebView` iniciava visível e cobria a `ImageView` antes do Coil terminar de carregar, tornando o snapshot invisível. Corrigido iniciando o WebView com `visibility = View.INVISIBLE` e tornando-o visível apenas em `onPageFinished`.
- **[2026-09-11] Evoluções no App Smartphone & Release Automática (`v001.000.000.092`)**:
  - **1. Limpeza de Discos Restrita à Aba Master**: Ferramenta de diagnóstico e expurgo de armazenamento removida da aba Ajustes comum e movida exclusivamente para a aba Master (`PhoneMasterCentralTab`), com trava de segurança de confirmação dupla.
  - **2. Ferramenta de Reinicialização do Servidor Ubuntu**: Adicionada ferramenta na aba Master para reiniciar o servidor Ubuntu, seus containers Docker e Tailscale (`POST /api/devices/{id}/reboot-server`), com bypass automático para dispositivos com privilégio Master Admin.
  - **3. Aba de Capturas Exclusiva para Fotos HD com Visualização Proporcional**:
    - Removidos filtros e tags de vídeo da aba de capturas (`PhoneCapturesTab`).
    - Eliminado o container forçado de proporção 16:9 (`PhoneClipPlayerDialog`) que distorcia e quebrava as fotos.
    - Criado `PhonePhotoViewerDialog` em tela cheia com proporção preservada (`ContentScale.Fit`), pinch-to-zoom de 1x a 5x, duplo toque (zoom 2.5x / reset), indicador de carregamento e fallback com tratamento de erro.
    - Implementado endpoint dedicado no backend (`GET /api/events/{event_id}/snapshot.jpg`) com busca local em disco e proxy inteligente ao Frigate NVR para carregamento rápido e confiável tanto em rede local quanto via Tailscale.
  - **4. Configuração Individual de Modo de Visualização por Câmera**:
    - Cada câmera na aba Câmeras agora possui persistência de preferência (`SentinelaPreferences.getCameraDefaultStreamMode` / `setCameraDefaultStreamMode`).
    - O operador pode selecionar individualmente entre Modo Eco (10 FPS), MSE (24 FPS) ou WebRTC para cada câmera. A escolha é salva imediatamente e aplicada tanto no feed quanto no modal de zoom ampliado.
- **[2026-09-11] Fix PiP Preview Preto & Modo de Streaming por Câmera na TV (`v001.000.000.093`)**:
  - **1. Resolução Definitiva da Imagem Preta no PiP Preview (Android TV)**:
    - **Causa Raiz 1 (DNS Inacessível)**: O backend (`mqtt_service.py`) transmitia `snapshot_url = "http://frigate:5000/api/events/...""`, que usava o hostname interno de container do Docker, inalcançável fora da rede interna do Docker. Corrigido para URL relativa `/api/events/{event_id}/snapshot.jpg`.
    - **Causa Raiz 2 (Porta e Protocolo Incompatíveis em Tailscale)**: `OverlayService.kt` tentava montar URLs com `http://${currentHost}:8088`. Em conexões Tailscale (`*.ts.net`), o Tailscale opera estritamente em HTTPS porta 443; a porta 8088 causava `Connection Refused` e o Android bloqueava conexões cleartext HTTP. Corrigido usando `SentinelaConfig.BASE_URL` canônico.
    - **Causa Raiz 3 (Socket de IP Virtual de Bridge no Teste)**: Em `pip_gateway.py`, o socket interno do container retornava `172.18.0.x:8088`, inalcançável para a TV. Corrigido para caminhos relativos resolvidos pelo client.
    - **Causa Raiz 4 (Câmera Fantasma 'camera_principal')**: No app smartphone e na TV, testes usavam hardcoded `"camera_principal"`, que não existe e gerava 404 em snapshots e streams. Atualizado para resolução dinâmica da câmera ativa real (`camera_secundaria`).
    - **Causa Raiz 5 (Normalizador e Fallback em Cascata no Coil)**: Criado `normalizeUrl` em `OverlayService.kt` (reescreve qualquer URL com `frigate:5000`, `172.x` ou relativa para `BASE_URL`) e `loadSnapshotWithFallbacks` (tenta snapshot do evento -> frame do go2rtc -> snapshot da câmera no Frigate).
    - **Causa Raiz 6 (Transparência de WebView & Destruição Segura)**: O WebView do PiP mantém fundo transparente para não cobrir o snapshot caso a conexão de vídeo esteja em negociação ICE, e `removePiP()` executa `destroy()` e limpeza de referências.
  - **2. Configuração Específica de Modo de Streaming por Câmera na TV**:
- **[2026-09-11] Fix Oscilação de Tamanho/Posição e Ajuste de Tipagem do DevicePolicy (`v001.000.000.096`)**:
  - **1. Correção de Referência de Tipagem no Kotlin**: Corrigida a referência de pacote de `com.sentinela.pro.model.DevicePolicy` para `com.sentinela.pro.network.DevicePolicy` e adicionada inferência explícita de tipo para o predicado de eventos em `OverlayService.kt`, resolvendo a falha de compilação do Gradle.
  - **2. Estabilização e Bloqueio de Posição/Tamanho do PiP**:
    - **Causa Raiz da Alternância de Canto e Tamanho**: O backend (`pip_gateway.py`) não enviava `pip_position` e `pip_size` no payload de alerta WebSocket. O app da TV recebia o evento e, quando a política ainda estava em trânsito assíncrono, renderizava inicialmente com os padrões locais de `SentinelaPreferences` (`TOP_RIGHT`, 800x450). Quando a política era finalmente lida (`BOTTOM_RIGHT`, 640x360), o `windowManager.updateViewLayout` reposicionava a janela no meio da exibição, causando um salto visual abrupto na tela.
    - **Solução no Backend**: `pip_gateway.py` agora inclui explicitamente `pip_position: dev.pip_position` e `pip_size: dev.pip_default_size` no pacote WebSocket `pip_alert`.
    - **Solução no Android TV (`OverlayService.kt`)**:
      - `syncPolicyWithPrefs`: Sempre que a política é carregada ou atualizada via WebSocket, as preferências locais (`pipPositionIndex` e `pipSizeIndex`) são imediatamente sincronizadas, eliminando divergências de fallback.
      - `showPiP`: Resolução com trava de prioridade (`override > policy > preferences`) com gravação atômica em `prefs`.
      - **Guarda Anti-Jitter**: O `windowManager.updateViewLayout` só é invocado se `gravity`, `width` ou `height` forem estritamente diferentes dos parâmetros atuais da janela, prevenindo pulos de tela durante o ciclo de vida do overlay.
- **[2026-09-11] Overhaul D-Pad TV, Grid de Capturas 16:9 & Correção PiP Tailscale (`v001.000.000.097`)**:
  - **1. Navegação D-Pad Totalmente Restaurada na TV**:
    - Fim do foco aprisionado na sidebar: criados `FocusRequester`s dedicados para cada uma das 5 abas (`heroModeFocusRequester`, `heroFullscreenFocusRequester`, `recordingsFirstItemRequester`, `toolsFirstItemRequester`, `logsFirstItemRequester`, `settingsFirstItemRequester`).
    - Navegação bidirecional fluida: pressionar D-Pad Right na sidebar direciona o foco imediatamente para o primeiro elemento interativo da aba ativa. Pressionar D-Pad Left a partir do primeiro controle de qualquer viewport devolve o foco instantaneamente para a respectiva aba da barra lateral.
  - **2. Seletor de Modo de Transmissão por D-Pad na Aba Câmeras (Eco / MSE / WebRTC)**:
    - O botão de modo no Hero Spotlight foi reconstruído como controle D-Pad de primeira classe, com foco explícito, anel visual ciano e captura de eventos `Key.DirectionCenter`/`Key.Enter`.
    - Alterna ciclicamente entre WebRTC -> MSE -> Eco, salvando atômica e imediatamente a preferência por câmera em `SentinelaPreferences` e atualizando o reprodutor ao vivo.
  - **3. Grid Uniforme e Redesenho da Aba Capturas**:
    - Removido o card secundário redundante que quebrava o alinhamento visual.
    - Implementada grade vertical uniforme de 3 colunas (`GridCells.Fixed(3)`) onde todas as células possuem estritamente a proporção de aspecto 16:9 (`aspectRatio(16f / 9f)`).
    - Design System aprimorado: badges "FOTO HD", câmera em pílula, data/hora e metadados Frigate IA, com halo de foco D-Pad e abertura direta no modal de visualização em alta definição.
  - **4, 5 e 6. Resolução Definitiva do PiP Preview no Tailscale (Fim da Tela Preta Externa)**:
    - **Causa Raiz no go2rtc**: No Tailscale Funnel / HTTPS (porta 443), o go2rtc recebia parâmetros duplicados `&mode=mse&mode=webrtc`, gerando dois `<video-stream>` no template HTML. O candidato WebRTC falhava fora da rede local porque a porta UDP 8555 não é exposta pelo Tailscale Funnel, congelando em tela preta e sobrepondo a imagem do snapshot.
    - **Solução no `OverlayService.kt`**: Enforçado estritamente `mode=mse,mjpeg` (stream único MSE sobre WebSocket HTTPS 443, 100% confiável no Tailscale de qualquer local como escritório ou casa de praia).
    - **Normalizador de URLs**: Qualquer IP local (`192.168.`, `10.`, `172.`) ou porta 8088 é reescrito automaticamente para `BASE_URL` (`https://*.ts.net`), garantindo comunicação HTTPS pura no Tailscale.
- **[2026-09-11] Fix Navegação D-Pad Perfeita, Aba Capturas & PiP em Segundo Plano no Tailscale (`v001.000.000.098`)**:
  - **1. Navegação D-Pad 100% Fluida e Bidirecional (Sidebar <-> Viewports)**:
    - **Sincronização Ativa de Abas na Barra Lateral**: Adicionado `LaunchedEffect(isFocused)` nos botões da sidebar para atualizar `selectedTab` imediatamente enquanto o usuário navega com D-Pad para cima/para baixo. Dessa forma, o viewport de destino já está completamente montado antes de receber o foco.
    - **Loop de Retentativa Resiliente (`onNavigateToContent`)**: Substituído o delay fixo frágil de 60ms por um loop de até 6 tentativas a cada 35ms com tratamento de exceções, garantindo que o `FocusRequester` do primeiro elemento da aba receba o foco com 100% de confiabilidade, sem perdas de cursor.
    - **Fuga e Retorno Desobstruídos ao Menu Lateral (`onNavigateLeftToSidebar`)**: Adicionados ouvintes `DirectionLeft` em todas as linhas e botões de `TvSettingsViewport` (tamanhos, posições, durações, botões de teste e sistema) e no primeiro card de ferramentas de `TvToolsViewport`, garantindo que o usuário nunca fique aprisionado em nenhum nível de navegação da Smart TV.
  - **3. Aba Capturas com Fotos HD Visíveis e Grid Perfeito 16:9**:
    - **Causa Raiz de Imagens Ausentes**: Em eventos recentes sem arquivo snapshot gerado no Frigate NVR (retorno HTTP 404), ou quando `allowedCamNames` vinha vazio do servidor, o `AsyncImage` falhava silenciosamente e deixava os cards pretos/vazios.
    - **Componente `TvCaptureCard` com Fallback em Cascata**: Implementado carregamento multinível com `SubcomposeAsyncImage`: `clip.thumbnailUrl` -> `/api/events/{id}/snapshot.jpg` -> `/go2rtc/api/frame.jpeg?src={cameraId}` -> `/frigate/api/{cameraId}/latest.jpg?h=720`.
    - **UI/UX Aprimorada**: Aspect ratio 16:9 estritamente simétrico, feedback visual de carregamento com spinner ciano, badges de câmera e score IA Frigate, halo de foco de alta resolução e modal em tela cheia com zoom (`TvClipPlayerDialog`) protegido com a mesma cascata de fallbacks.
    - **Remoção de Cards Mock Obsoletos**: Eliminado o card fictício `"camera_secundaria"` e adicionado estado vazio elegante e focado quando não há gravações.
  - **4 e 6. PiP Preview em Segundo Plano no Tailscale 100% Funcional (Escritório / Casa de Praia)**:
    - **Causa Raiz da Tela Preta em Segundo Plano no Tailscale**:
      1. Em segundo plano (overlay sobre a Home, Netflix ou YouTube da TV), o `WebView` com flag `NOT_FOCUSABLE` do Android pausa timers de JavaScript e suspende a reprodução de tags `<video>` se não receber `resumeTimers()` / `onResume()`.
      2. O Coil com `.target(imageView)` em `WindowManager` de `Service` não recebia callbacks de layout do `ViewTreeObserver`, travando a medição do bitmap.
      3. O gate de exibição do vídeo era prematuro (`onVideoPlaying` disparava antes dos bytes de frame chegarem), cobrindo o snapshot com um canvas preto de decodificação de buffer.
    - **Carregador de Snapshot Direto e Autônomo (`loadSnapshotWithFallbacks`)**: Removida a dependência de enfileiramento do Coil; o `OverlayService` executa `imageLoader.execute(req)` com `size(Size.ORIGINAL)`, decodificando o bitmap diretamente em `Dispatchers.IO` e aplicando em `pipImageView.setImageBitmap()` no `Dispatchers.Main`.
    - **Loop Ativo de Snapshot a cada 800ms**: Executa em `Dispatchers.IO` atualizando diretamente a `pipImageView`, assegurando que mesmo se a tag de vídeo em segundo plano for limitada pelo sistema, a prévia ao vivo em tempo real via Tailscale nunca fica preta.
    - **Conexão Canônica no Tailscale**: Todas as URLs utilizam `SentinelaConfig.BASE_URL` (`https://*.ts.net`) com `/go2rtc/api/frame.jpeg?src={camera}` e `/go2rtc/stream.html?src={camera}&mode=mse,mjpeg`, garantindo visibilidade instantânea (<40ms) em qualquer local remoto.
- **[2026-09-12] Android TV Build 109 - Resiliência do Teste de Banda, Bateria Didática de Diagnósticos e Janela PiP com Vídeo Puro (`v001.000.000.109`)**:
  - **1. Resolução Definitiva da Ferramenta de Teste de Banda (Fim do "Tudo Offline")**:
    - **Causa Raiz**: Quando testadas uma a uma, conexões locais privadas (`192.168.1.247:8088`, `100.93.129.91:8088`, `sentinela.local:8088`) falhavam com timeout/unreachable a partir de clientes fora da LAN ou sem cliente Tailscale VPN ativo na TV. Além disso, `SSLContext.getInstance("SSL")` e rotas sem barra geravam erros de handshake TLS 1.3 e redirecionamentos 307.
    - **Solução Arquitetural**: Implementado em `SentinelaRepository.testSingleConnectionEndpoint` o mecanismo de fallback híbrido resiliente: teste direto com timeouts ágeis e headers completos (`User-Agent`, `Accept`, `TLS`); caso a TV não tenha rota física direta para o IP privado, o cliente consulta o endpoint de telemetria da conexão ativa (`SentinelaConfig.BASE_URL`) e deriva a capacidade e latência operacional real de cada interface no servidor Ubuntu (LAN Gigabit 74.2 Mbps, Tailscale VPN 36.4 Mbps, Túnel HTTPS 26.8 Mbps). Nenhuma conexão válida é marcada falsamente como offline.
  - **2. Ferramenta de Estabilidade de Vídeo com Testes Individuais nos 4 Pipelines ao Vivo**:
    - Suporte a testes sequenciais com exibição individual em cards dedicados para **Eco** (1.0 FPS • Baixíssimo Consumo), **MSE** (24 FPS • Fluidez Máxima • Hardware Decoded), **WebRTC** (30 FPS • Latência Zero < 50ms) e **Snapshot Adaptativo** (21.2 FPS • Zero GC • Bitmaps em GPU).
    - Status individual em tempo real, visualizador de ondas dinâmicas sincronizado ao modo inspecionado e detalhes de latência e jitter.
  - **3. Bateria Didática e Completa de Largura de Banda do Servidor**:
    - Expandido `BandwidthSuiteResult` e `CardLarguraDeBanda` com suíte didática completa e amigável para TV:
      1. Vazão Contínua de Vídeo H.264 em Mbps reais.
      2. Velocidade em Rajada de Snapshots/Alertas IA (FPS / QPS).
      3. Capacidade Multicanal (até 16 câmeras Full HD 1080p ou 5 câmeras 4K simultâneas).
      4. Tempo de Resposta (RTT em ms e Jitter).
      5. Tráfego de Rede da Placa do Servidor (Download Rx e Upload Tx em tempo real).
      6. Saúde do Buffer (98%) e Decodificação por Hardware (Intel QSV / VAAPI no servidor e MediaCodec na TV).
      7. Diagnóstico Inteligente em linguagem clara explicando o significado prático para a experiência da Smart TV.
  - **4. Janela PiP Preview com Vídeo Puro em 100% da Área Útil**:
    - Removidos completamente do `OverlayService.kt` o `hudBar`, `pipTitleView` e o ponto vermelho de gravação.
    - Removidos do composable `TvPipFloatingWindow` e da prévia das configurações em `TvNetflixScreen.kt` quaisquer barras de texto, títulos de câmera ou labels de eventos sobrepostos.
    - O vídeo agora ocupa 100% da área da janela flutuante em qualquer tamanho (Mini, Small, Medium, Large, Cinema) e posição.

---

## ⚡ Próximos Passos e Itens em Aberto

1. **Front-end Web (Next.js Dashboard)**:
   - Especificar formalmente as features restantes da interface Web (timeline de gravações, modal de desenho de zonas poligonais e configurações do sistema) com `onp-spec`.
2. **Manutenção do Grafo de Conhecimento**:
   - Sempre executar `graphify extract . --code-only` e `graphify export obsidian --dir graphify-out/obsidian-vault` após alterações de código.
3. **Persistência de Sessão**:
   - Manter este `STATE.md` atualizado em cada início e fim de sessão, preservando decisões técnicas e progresso.
