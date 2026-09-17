# Graph Report - SentinelaFrigate  (2026-09-17)

## Corpus Check
- 167 files · ~194,851 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1493 nodes · 2374 edges · 102 communities (66 shown, 20 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80ef2143`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SentinelaRepository
- useSentinelaStore
- devices.py
- OverlayService
- sentinela-pro-tv/src/App.tsx
- cameras.py
- SentinelaPreferences
- settings.py
- sentinela-pro-mobile-nvr/src/App.tsx
- compilerOptions
- Observer
- TelegramVaultService
- dependencies
- compilerOptions
- TvDesignTokens.kt
- ScannerService
- MseCameraView
- FrigateBridgeService
- Histórias
- api/telemetry.py
- compilerOptions
- events.py
- 🛠️ Guia de Compilação do Sentinela Frigate Pro no GitHub Codespaces
- PipPosition
- TelegramVideoQueue
- dependencies
- Histórias
- TelemetryService
- Histórias
- Spec: Disparo de Fotos e Vídeos de Intrusão para o Telegram (Telegram Vault & Drive)
- ActivityLifecycleCallbacks
- 3. Catálogo de Endpoints da API REST (`/api`)
- 🛡️ Sentinela Frigate Pro
- dependencies
- Spec: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)
- Models.kt
- manifest.json
- .getTelemetry
- get_audit_trail
- gradlew
- onp-spec-driven — a especificação que continua verdadeira (Antigravity)
- asyncio
- cerebro.md
- PipDuration
- Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4)
- SentinelaMobileTokens.kt
- WebClientLogger
- logger.ts
- opencode.json
- android-smartphone-app.spec.test.js
- telegram-vault.spec.test.js
- Run and deploy your AI Studio app
- Run and deploy your AI Studio app
- Tasks: Integração Frigate NVR 0.17 & go2rtc
- Settings
- clear_client_device_logs
- graphify.js
- AGENTS.md
- execution.md
- build_apk.sh
- compile_apk.sh
- next.config.mjs
- next-env.d.ts
- postcss.config.mjs
- AuditLog
- tailwind.config.ts
- setup-autostart.sh
- setup_ubuntu.sh
- simulate_event.sh
- .registerOrHeartbeat
- PiPGatewayService
- SentinelaRepository.kt
- Escrevendo especificações auditáveis
- Lições — aprendizado com lastro mecânico
- Passo a passo no Antigravity
- Tasks: Aplicativo Android Smartphone (Sentinela Mobile YouTube Edition)
- Fluxo detalhado — do zero ao audit limpo
- Tasks: Aplicativo Android TV (Sentinela TV Netflix Edition)
- Tasks: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)
- Constituição — v1.1.0
- STATE.md — Memória Persistente do Projeto
- Constituição — princípios que a máquina verifica
- X509TrustManager
- rules/graphify.md
- workflows/graphify.md
- telegram-vault/tasks.md

## God Nodes (most connected - your core abstractions)
1. `SentinelaRepository` - 38 edges
2. `SentinelaPreferences` - 35 edges
3. `useSentinelaStore` - 30 edges
4. `PairedDevice` - 28 edges
5. `OverlayService` - 27 edges
6. `Camera` - 26 edges
7. `TelegramVaultService` - 21 edges
8. `CameraItem` - 18 edges
9. `TvToolsViewport()` - 18 edges
10. `SeamlessCameraImage()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `SeamlessCameraImage()` --calls--> `MseCameraView()`  [INFERRED]
  android/app/src/main/java/com/sentinela/pro/ui/components/SeamlessCameraImage.kt → android/app/src/main/java/com/sentinela/pro/ui/components/MseCameraView.kt
- `get_camera_diagnostics()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/cameras.py → backend/app/db/models.py
- `get_device_permitted_cameras()` --uses--> `Camera`  [INFERRED]
  backend/app/api/devices.py → backend/app/db/models.py
- `device_diagnostics()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/devices.py → backend/app/db/models.py
- `get_audit_trail()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/events.py → backend/app/db/models.py

## Import Cycles
- None detected.

## Communities (102 total, 20 thin omitted)

### Community 0 - "SentinelaRepository"
Cohesion: 0.22
Nodes (3): SentinelaRepository, ServiceStatus, put

### Community 1 - "useSentinelaStore"
Cohesion: 0.05
Nodes (52): CamerasPage(), EventsPage(), dynamic, metadata, revalidate, viewport, DashboardPage(), DeviceHealth (+44 more)

### Community 2 - "devices.py"
Cohesion: 0.09
Nodes (58): BatchTestRequest, check_devices_health(), cleanup_all_devices(), deduplicate_devices(), delete_device(), device_diagnostics(), device_heartbeat(), DeviceAllowedCamerasUpdate (+50 more)

### Community 3 - "OverlayService"
Cohesion: 0.08
Nodes (26): BootReceiver, Context, Intent, DevicePolicy, android, Context, Intent, PermissionRequest (+18 more)

### Community 4 - "sentinela-pro-tv/src/App.tsx"
Cohesion: 0.07
Nodes (37): App(), KotlinCodeModal(), KotlinCodeModalProps, TvCameraCarousel(), TvCameraCarouselProps, TvHeroSpotlight(), TvHeroSpotlightProps, TvLogsView() (+29 more)

### Community 5 - "cameras.py"
Cohesion: 0.10
Nodes (50): add_camera(), CameraCreate, CameraUpdate, delete_camera(), FrigateZonesPayload, get_camera_diagnostics(), get_camera_stream_info(), get_frigate_camera_zones() (+42 more)

### Community 6 - "SentinelaPreferences"
Cohesion: 0.05
Nodes (67): CameraItem, CaptureEvent, SentinelaPreferences, java, X509TrustManager, MainActivity, X509TrustManager, SentinelaWebSocket (+59 more)

### Community 7 - "settings.py"
Cohesion: 0.05
Nodes (63): BaseModel, post, Triggers concurrent ONVIF Discovery and verified CCTV port scanner., ScanPayload, trigger_network_scan(), _cached_dir_size(), clean_server_storage(), _dir_size_bytes() (+55 more)

### Community 8 - "sentinela-pro-mobile-nvr/src/App.tsx"
Cohesion: 0.11
Nodes (26): App(), CapturesView(), CapturesViewProps, DesignTokensDoc(), KotlinCodeViewer(), CameraStreamCardItemProps, LiveFeedView(), LiveFeedViewProps (+18 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "Observer"
Cohesion: 0.07
Nodes (15): WebRtcManager, SdpObserver, Observer, SdpObserver, DataChannel, EglBase, HttpClient, IceCandidate (+7 more)

### Community 11 - "TelegramVaultService"
Cohesion: 0.10
Nodes (15): Any, Applies a professional HUD watermark on the snapshot with dynamic scaling for…, Appends an event to the in-memory Telegram audit trail., Dispatches watermarked snapshot to Telegram using the classic template., Dispatches MP4 clip to Telegram using the classic template., Loads Bot Token and Chat ID from database if available, or seeds defaults., Formats real-time telemetry into a rich Telegram status message., Validates bot credentials with Telegram API and sends a confirmation test… (+7 more)

### Community 12 - "dependencies"
Cohesion: 0.04
Nodes (47): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+39 more)

### Community 13 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowJs, downlevelIteration, esModuleInterop, incremental, isolatedModules, jsx, lib (+19 more)

### Community 14 - "TvDesignTokens.kt"
Cohesion: 0.09
Nodes (25): CameraEntity, CameraStatus, ALERT, ONLINE, RECORDING, STANDBY, CameraStreamTelemetry, DetectionBox (+17 more)

### Community 15 - "ScannerService"
Cohesion: 0.13
Nodes (12): Any, Tries to connect to a specific port on an IP address., Sends authentic RTSP OPTIONS / DESCRIBE probes to verify real video stream…, Queries ONVIF SOAP GetDeviceInformation to retrieve real hardware metadata:…, Classifies camera hardware, identifying AITEK SEG6050BP (Guangdong Pineng…, Sends hybrid WS-Discovery UDP probes on port 3702 to all subnets (wildcard +…, Concurrently scans CCTV ports with semaphore control, ONVIF SOAP inspection,…, Runs comprehensive multi-probe scan discovering ONVIF and RTSP CCTV devices. (+4 more)

### Community 16 - "MseCameraView"
Cohesion: 0.15
Nodes (12): android, Modifier, PermissionRequest, SslErrorHandler, WebChromeClient, WebView, WebViewClient, MseCameraView() (+4 more)

### Community 17 - "FrigateBridgeService"
Cohesion: 0.13
Nodes (10): FrigateBridgeService, Any, Retrieves a live JPEG frame at native/main-stream resolution using a multi-…, Verifies with ffprobe that the MP4 contains at least one valid video stream and…, Probes average frame rate, duration, width and height of a video file., Checks whether the file contains an audio stream., Robust H.264/AAC constant-frame-rate preparation for Telegram & mobile…, Performs deep health check of all Frigate & go2rtc communication channels with… (+2 more)

### Community 18 - "Histórias"
Cohesion: 0.10
Nodes (20): AC-001 — Streaming WebRTC funcional via go2rtc, AC-002 — Detecção de Objetos e Bounding Boxes por IA, AC-003 — Snapshot em Resolução Nativa com Marca d'Água HUD, AC-004 — Clipes de Vídeo em Framerate Constante (CFR), AC-005 — Medição Real e Purge do Armazenamento, AC-028 — Watchdog de Auto-Reconexão e Anti-Congelamento no Player, AC-029 — Pipeline HD Nativo Prioritário para Snapshots e Thumbnails, AC-030 — Pipeline de Clipes Resiliente com Sincronismo PTS e Verificação de Áudio AAC (+12 more)

### Community 19 - "api/telemetry.py"
Cohesion: 0.12
Nodes (25): BenchmarkPayload, ClientLogEventPayload, ClientLogsBatchPayload, download_diagnostic_logs(), fetch_docker_container_logs(), get_detailed_stats(), get_frigate_deep_status(), get_service_logs() (+17 more)

### Community 20 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 21 - "events.py"
Cohesion: 0.20
Nodes (20): clear_audit_trail(), delete_event(), delete_events_batch(), delete_events_by_date(), EventBatchDeleteRequest, list_events(), AsyncSession, BaseModel (+12 more)

### Community 22 - "🛠️ Guia de Compilação do Sentinela Frigate Pro no GitHub Codespaces"
Cohesion: 0.22
Nodes (8): 1. Requisitos do Codespace, 2. Preparação do Ambiente Android (SDK + JDK 17), 3. Compilação dos APKs Nativos Android, 4. Execução e Testes do Backend (FastAPI Core), 5. Compilação e Build do Web Dashboard (Next.js 14), 6. Auditoria de Especificação & Governança (onp-spec), 🛠️ Guia de Compilação do Sentinela Frigate Pro no GitHub Codespaces, Localização dos APKs Gerados:

### Community 23 - "PipPosition"
Cohesion: 0.10
Nodes (18): PipPosition, BOTTOM_CENTER, BOTTOM_LEFT, BOTTOM_RIGHT, CENTER_LEFT, CENTER_RIGHT, TOP_CENTER, TOP_LEFT (+10 more)

### Community 24 - "TelegramVideoQueue"
Cohesion: 0.15
Nodes (9): Worker that sequentially consumes video alert tasks one at a time., Processes a single event item: waits for segments, fetches MP4, transcodes…, Tries to download the extended range clip from Frigate with incremental delays., FFmpeg pipeline specifically engineered to fix color blotches, green frames,…, Sequential Disk-Buffered Video Processing Queue for Telegram Alerts.…, Recovers any pending disk-buffered events from /tmp/event_queue/ upon startup., Calculates the Golden Duration window (5s pre + min 10s det + 5s post = MIN…, TelegramEventItem (+1 more)

### Community 25 - "dependencies"
Cohesion: 0.05
Nodes (38): clsx, dependencies, clsx, lucide-react, next, react, react-dom, tailwind-merge (+30 more)

### Community 26 - "Histórias"
Cohesion: 0.11
Nodes (17): AC-016 — Feed Vertical Contínuo e Modal de Zoom 5x, AC-017 — Botão Flutuante (FAB) de Alerta Instantâneo e Silenciamento, AC-018 — Player de Evidências em Diálogo Flutuante, AC-019 — Edição de Políticas e Permissões de Dispositivos, AC-020 — Painel de Testes Rápidos e Ping do Ecossistema, AC-021 — Ajuste de Taxa de Quadros Eco e Console de Logs, Contexto, Fora de escopo (+9 more)

### Community 27 - "TelemetryService"
Cohesion: 0.23
Nodes (6): Any, Scans Linux processes and returns top consumers of CPU and RAM., Provides an exhaustive statistical overview of the entire system., Reads CPU temperature from Linux thermal zones (/sys/class/thermal/ or psutil).…, Executes real stress/benchmark workloads on the server CPU/iGPU and returns…, TelemetryService

### Community 28 - "Histórias"
Cohesion: 0.12
Nodes (16): AC-011 — Sidebar Fixa com Relógio e Indicador de Foco, AC-012 — Player Hero com Telemetria e Alternância por Carrossel, AC-013 — Galeria de Capturas e Reprodução de Vídeos, AC-014 — Execução de Ferramentas e Disparo de Alerta PiP de Teste, AC-015 — Ajuste de Parâmetros PiP e Monitoramento de Logs, Contexto, Fora de escopo, Histórias (+8 more)

### Community 29 - "Spec: Disparo de Fotos e Vídeos de Intrusão para o Telegram (Telegram Vault & Drive)"
Cohesion: 0.12
Nodes (15): AC-022 — Marca d'Água HUD Dinâmica e Formatação de Snapshot, AC-023 — Formatação Rica de Mensagem com Tags de Busca (Telegram Drive), AC-024 — Captura de Clipe Estendido com Pré e Pós-Captura, AC-025 — Transcodificação H.264 CFR Fluida e Envio com Streaming, AC-026 — Guarda de Idempotência em Memória e Banco de Dados, AC-027 — Trilha de Auditoria em Memória e Suporte a Pausa de Alertas, Contexto, Fora de escopo (+7 more)

### Community 30 - "ActivityLifecycleCallbacks"
Cohesion: 0.07
Nodes (25): ClientLogEntry, Context, LogCategory, NAVIGATION, NETWORK, PIP, PLAYER, SYSTEM (+17 more)

### Community 31 - "3. Catálogo de Endpoints da API REST (`/api`)"
Cohesion: 0.17
Nodes (11): 1. Visão Geral da Arquitetura, 2. Mapa de Serviços e Portas de Rede, 3.1. Módulo de Câmeras (`/api/cameras`), 3.2. Módulo de Dispositivos e Telas PiP (`/api/devices`), 3.3. Módulo de Eventos & Gravações (`/api/events`), 3.4. Módulo de Telemetria e Diagnósticos (`/api/telemetry`), 3.5. Módulo de Configurações & Telegram (`/api/settings`), 3.6. Módulo Scanner de Rede (`/api/scanner`) (+3 more)

### Community 32 - "🛡️ Sentinela Frigate Pro"
Cohesion: 0.17
Nodes (11): 📺 1. Android TV 55" (Layout Horizontal Estilo Netflix), 📱 2. Android Smartphone (Layout Vertical Estilo YouTube), 📱 Aplicativos Nativos Android (`v001.000.000.135`), 🖥️ Como Atualizar o Servidor Ubuntu, 🚀 Como Compilar os APKs no GitHub Codespaces, 📥 Download dos APKs Oficiais (`v001.000.000.135`), 📄 Licença, 🗺️ Mapa de Portas e Serviços (+3 more)

### Community 33 - "dependencies"
Cohesion: 0.04
Nodes (47): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+39 more)

### Community 34 - "Spec: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)"
Cohesion: 0.14
Nodes (13): AC-006 — Telemetria de Hardware via WebSocket e REST, AC-007 — Gerenciamento de Câmeras e Zonas no Mosaico, AC-008 — Pareamento de Dispositivos e Políticas de Acesso, AC-009 — Botão Flutuante (FAB) de Silenciamento de Alertas no Smartphone, AC-010 — Gateway Picture-in-Picture (PiP) para Android TV, Contexto, Fora de escopo, Histórias (+5 more)

### Community 35 - "Models.kt"
Cohesion: 0.15
Nodes (10): AuditLogEntry, ConnectionTestState, FAILED, IDLE, SUCCESS, TESTING, DiagnosticStatus, PairedDeviceItem (+2 more)

### Community 36 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 37 - ".getTelemetry"
Cohesion: 0.20
Nodes (6): BandwidthSuiteResult, SingleConnectionResult, VideoStabilityResult, com, RouteTelemetry, TelemetryData

### Community 38 - "get_audit_trail"
Cohesion: 0.22
Nodes (10): get_audit_trail(), get_event_clip(), get_event_snapshot(), get_events_summary(), get, Returns real-time analytics summary directly from Frigate NVR., Retrieves operational audit logs (system mutations, alerts, errors)., Streams a universally compatible H.264 MP4 video clip with HTTP Range support.… (+2 more)

### Community 39 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 40 - "onp-spec-driven — a especificação que continua verdadeira (Antigravity)"
Cohesion: 0.20
Nodes (10): Auto-dimensionamento, Carregamento de contexto, Catálogo de problemas que o audit aponta, Contrato de execução — inegociável, Interação — use todo o potencial do Antigravity, O motor embarcado (zero instalação), onp-spec-driven — a especificação que continua verdadeira (Antigravity), Perguntas que o motor responde por você (+2 more)

### Community 41 - "asyncio"
Cohesion: 0.08
Nodes (17): asyncio, Background loop sending hardware telemetry every 5.0 seconds to connected UI…, telemetry_broadcast_loop(), websocket_endpoint(), WebSocketManager, publish_simulated_event(), Publishes a mock Frigate security event to Mosquitto MQTT., MQTTService (+9 more)

### Community 43 - "PipDuration"
Cohesion: 0.22
Nodes (9): PipDuration, D_10S, D_15S, D_20S, D_30S, D_45S, D_5S, D_60S (+1 more)

### Community 44 - "Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4)"
Cohesion: 0.33
Nodes (5): `frigate/config/config.yml`, Proposed Changes, Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4), Status Atual, User Review Required

### Community 45 - "SentinelaMobileTokens.kt"
Cohesion: 0.40
Nodes (4): SentinelaColors, SentinelaDimens, SentinelaShapes, SentinelaTypography

### Community 47 - "logger.ts"
Cohesion: 0.40
Nodes (3): COLORS, logger, LogLevel

### Community 48 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 49 - "android-smartphone-app.spec.test.js"
Cohesion: 0.50
Nodes (3): prefsFile, repoFile, smartphoneScreenFile

### Community 50 - "telegram-vault.spec.test.js"
Cohesion: 0.50
Nodes (3): frigateBridgeFile, mqttServiceFile, tgVaultFile

### Community 53 - "Tasks: Integração Frigate NVR 0.17 & go2rtc"
Cohesion: 0.20
Nodes (9): T-001 — Ingestão RTSP e Proxy WebRTC/MSE via go2rtc [concluida], T-002 — Ingestão de Eventos MQTT e Bounding Boxes no Backend [concluida], T-003 — Transcoder H.264/AAC CFR e Snapshot HUD para Telegram [concluida], T-004 — Rotação Automática de Gravações e Limpeza NVMe [concluida], T-005 — Watchdog de Auto-Reconexão e Anti-Congelamento WebRTC/MSE [concluida], T-006 — Ingestão Prioritária de Snapshots HD Nativos [concluida], T-007 — Validação e Empacotamento Resiliente de Clipes CFR com Áudio AAC [concluida], T-008 — Persistência e Sincronização Atômica de Câmeras Escaneadas [concluida] (+1 more)

### Community 55 - "clear_client_device_logs"
Cohesion: 0.25
Nodes (8): clear_client_device_logs(), get_audit_logs(), get_client_device_logs(), AsyncSession, delete, Returns application audit logs with newest events at the top (DESC order)., Queries unified client operational telemetry logs with optional filters., Deletes client device telemetry logs.

### Community 57 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): graphify, 🔒 Regras de Ouro Inegociáveis de Streaming & PiP (NUNCA QUEBRAR), 🧠 Segundo Cérebro (Obsidian em ~/segundo-cerebro/), STATE.md (Memória Persistente)

### Community 65 - "AuditLog"
Cohesion: 0.36
Nodes (5): AuditLog, ClientDeviceLog, AuditService, Records an audit log entry in SQLite asynchronously., Base

### Community 77 - "PiPGatewayService"
Cohesion: 0.16
Nodes (9): _cast_sync(), PiPGatewayService, Any, Dispatches Picture-in-Picture or Google Cast notification to registered TVs.…, Fast concurrent non-blocking port check to verify if Smart TV / device is…, Dispatches an interactive test PiP alert to a specific TV using real accessible…, Records an execution acknowledgement from a remote device overlay., Checks if current time falls in Do Not Disturb period. (+1 more)

### Community 78 - "SentinelaRepository.kt"
Cohesion: 0.29
Nodes (4): ClientDeviceLogItem, RemoteDeviceItem, HttpURLConnection, URL

### Community 81 - "Escrevendo especificações auditáveis"
Cohesion: 0.25
Nodes (8): Códigos de rastreio são globais e únicos, Dado / Quando / Então — os três são obrigatórios, E precisa ser amigável — o dono do produto vai ler, Escrevendo especificações auditáveis, O ciclo de vida do status da especificação, Suposições vs. perguntas em aberto, Tarefas: formato dos campos, Um critério de aceite precisa ser observável

### Community 82 - "Lições — aprendizado com lastro mecânico"
Cohesion: 0.25
Nodes (8): Arquivos (todos do motor), Como frasear (é o que faz a recorrência deduplicar), Escala, ESCREVER — depois do gate, nunca antes, LER — no Especificar (e no Projetar, se houver design.md), Lições — aprendizado com lastro mecânico, Quando uma lição confirmada não funcionar, Sem node no ambiente

### Community 83 - "Passo a passo no Antigravity"
Cohesion: 0.25
Nodes (8): 1. Especificar, 2. Projetar (features grandes), 3. Tarefas, 4. Plano de execução (2+ tarefas pendentes), 5. Executar, 6. Verificar e Auditar (o gate), 7. Aprender (fecha o ciclo), Passo a passo no Antigravity

### Community 84 - "Tasks: Aplicativo Android Smartphone (Sentinela Mobile YouTube Edition)"
Cohesion: 0.25
Nodes (7): T-015 — Feed Vertical de Câmeras e Modal Zoom 5x [concluida], T-016 — Botão Flutuante FAB para Silenciamento de Alertas [concluida], T-017 — Galeria de Capturas e Player Flutuante de Clipes [concluida], T-018 — Central Master e Edição de Políticas de Dispositivos [concluida], T-019 — Ferramentas de Diagnóstico, Teste de Ping e Velocidade [concluida], T-020 — Painel de Configurações, Modo Eco e Console de Logs [concluida], Tasks: Aplicativo Android Smartphone (Sentinela Mobile YouTube Edition)

### Community 85 - "Fluxo detalhado — do zero ao audit limpo"
Cohesion: 0.29
Nodes (6): A tabela de status, Exemplo completo: "entrega de dever de casa", Fluxo detalhado — do zero ao audit limpo, Integração com CI, Paralelizando: `onp-spec plano` (2+ tarefas pendentes), Por que isso mata o vibecoding

### Community 86 - "Tasks: Aplicativo Android TV (Sentinela TV Netflix Edition)"
Cohesion: 0.29
Nodes (6): T-010 — Implementação da TvSidebar e Roteamento Leanback [concluida], T-011 — Viewport de Câmeras Hero e Carrossel Horizontal [concluida], T-012 — Galeria de Capturas e Player de Evidências [concluida], T-013 — Viewport de Ferramentas e Teste de PiP Manual [concluida], T-014 — Viewport de Configurações, Logs e Ajustes de PiP [concluida], Tasks: Aplicativo Android TV (Sentinela TV Netflix Edition)

### Community 87 - "Tasks: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)"
Cohesion: 0.29
Nodes (6): T-005 — Telemetria e Monitoramento de Hardware no FastAPI e Web [concluida], T-006 — Gestão de Câmeras, Zonas e Sincronização Dinâmica [concluida], T-007 — Heartbeat, Pareamento e Políticas de Dispositivos [concluida], T-008 — Botão Flutuante FAB para Silenciamento de Alertas no Smartphone [concluida], T-009 — Gateway PiP para Notificações Flutuantes em Smart TVs [concluida], Tasks: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)

### Community 88 - "Constituição — v1.1.0"
Cohesion: 0.33
Nodes (5): Constituição — v1.1.0, P-001 [DEVE] Todo requisito tem prova executável, P-002 [RECOMENDADO] Segredos nunca em código, P-003 [DEVE] Performance e Não-Bloqueio de Threads, P-004 [DEVE] Padronização de Vídeo H.264 / AAC

### Community 93 - "STATE.md — Memória Persistente do Projeto"
Cohesion: 0.14
Nodes (13): 🔒 Invariantes de Ouro de Transmissão & Streaming (Configuração Perfeita — NUNCA ALTERAR), 🛡️ Matriz de Especificações e Cobertura onp-spec, ⚡ Próximos Passos e Itens em Aberto, STATE.md — Memória Persistente do Projeto, 📦 Versão Anterior: v001.000.000.114 (Otimização Térmica, Atomicidade e Unificação Web), 📦 Versão Anterior: v001.000.000.115 (Correção da Aba Câmeras nos APKs, Harmonização MSE e Cache-Busting Web), 📦 Versão Anterior: v001.000.000.116 (Resolução de PiP na TV, Reconciliação Master, Capturas HD e Desduplicação de Câmeras), 📦 Versão Anterior: v001.000.000.117 (Estabilidade Multi-Dispositivo de PiP, Zero-Cache Nginx Host & App Web) (+5 more)

### Community 94 - "Constituição — princípios que a máquina verifica"
Cohesion: 0.40
Nodes (5): Constituição — princípios que a máquina verifica, Níveis de obrigação, Preset LGPD + educação, Quatro formas de verificação, Rastreabilidade que dá diferencial de segurança

### Community 95 - "X509TrustManager"
Cohesion: 0.47
Nodes (3): java, X509TrustManager, X509TrustManager

## Knowledge Gaps
- **410 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `version` (+405 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 652 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PairedDevice` connect `devices.py` to `AuditLog`, `api/telemetry.py`, `PiPGatewayService`, `settings.py`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `SentinelaPreferences` connect `SentinelaPreferences` to `SentinelaRepository`, `OverlayService`, `PipDuration`, `.registerOrHeartbeat`, `PipPosition`, `ActivityLifecycleCallbacks`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `SentinelaWebSocket` connect `SentinelaPreferences` to `Observer`, `OverlayService`, `ActivityLifecycleCallbacks`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SentinelaPreferences` (e.g. with `PhoneCameraStreamCard()` and `PhoneCapturesTab()`) actually correct?**
  _`SentinelaPreferences` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `PairedDevice` (e.g. with `check_devices_health()` and `cleanup_all_devices()`) actually correct?**
  _`PairedDevice` has 22 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _410 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useSentinelaStore` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._