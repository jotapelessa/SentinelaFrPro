# Graph Report - SentinelaFrigate  (2026-09-12)

## Corpus Check
- 158 files · ~155,256 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1369 nodes · 2151 edges · 102 communities (66 shown, 20 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf01cfc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- events.py
- useSentinelaStore
- devices.py
- OverlayService
- sentinela-pro-tv/src/App.tsx
- cameras.py
- SentinelaRepository
- settings.py
- sentinela-pro-mobile-nvr/src/App.tsx
- compilerOptions
- Observer
- TelegramVaultService
- dependencies
- compilerOptions
- TvDesignTokens.kt
- ScannerService
- TvNetflixScreen.kt
- FrigateBridgeService
- Histórias
- FastAPI
- compilerOptions
- X509Certificate
- Models.kt
- PiPGatewayService
- api/telemetry.py
- dependencies
- Histórias
- TelemetryService
- Histórias
- Spec: Disparo de Fotos e Vídeos de Intrusão para o Telegram (Telegram Vault & Drive)
- PipPosition
- 3. Catálogo de Endpoints da API REST (`/api`)
- 🛡️ Sentinela Frigate Pro
- dependencies
- Spec: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)
- PipDuration
- manifest.json
- PipSize
- SentinelaRepository.kt
- gradlew
- onp-spec-driven — a especificação que continua verdadeira (Antigravity)
- X509TrustManager
- MseCameraView
- ConnectionTestState
- Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4)
- SentinelaMobileTokens.kt
- .registerOrHeartbeat
- logger.ts
- opencode.json
- android-smartphone-app.spec.test.js
- telegram-vault.spec.test.js
- Run and deploy your AI Studio app
- Run and deploy your AI Studio app
- Tasks: Integração Frigate NVR 0.17 & go2rtc
- Settings
- logs/page.tsx
- graphify.js
- AGENTS.md
- execution.md
- build_apk.sh
- compile_apk.sh
- next.config.mjs
- next-env.d.ts
- postcss.config.mjs
- tailwind.config.ts
- setup-autostart.sh
- setup_ubuntu.sh
- simulate_event.sh
- ws.py
- trigger_network_scan
- MemoryRingBufferHandler
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
- run_server_benchmark
- rules/graphify.md
- workflows/graphify.md
- telegram-vault/tasks.md
- get_audit_logs

## God Nodes (most connected - your core abstractions)
1. `SentinelaRepository` - 32 edges
2. `SentinelaPreferences` - 28 edges
3. `useSentinelaStore` - 28 edges
4. `OverlayService` - 26 edges
5. `Camera` - 26 edges
6. `PairedDevice` - 26 edges
7. `TelegramVaultService` - 20 edges
8. `CameraItem` - 19 edges
9. `SeamlessCameraImage()` - 18 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `TvToolsViewport()` --calls--> `VideoStabilityResult`  [EXTRACTED]
  android/app/src/main/java/com/sentinela/pro/tv/TvNetflixScreen.kt → android/app/src/main/java/com/sentinela/pro/data/Models.kt
- `SeamlessCameraImage()` --calls--> `MseCameraView()`  [INFERRED]
  android/app/src/main/java/com/sentinela/pro/ui/components/SeamlessCameraImage.kt → android/app/src/main/java/com/sentinela/pro/ui/components/MseCameraView.kt
- `get_device_permitted_cameras()` --uses--> `Camera`  [INFERRED]
  backend/app/api/devices.py → backend/app/db/models.py
- `device_diagnostics()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/devices.py → backend/app/db/models.py
- `get_audit_trail()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/events.py → backend/app/db/models.py

## Import Cycles
- None detected.

## Communities (102 total, 20 thin omitted)

### Community 0 - "events.py"
Cohesion: 0.06
Nodes (43): asyncio, clear_audit_trail(), delete_event(), delete_events_batch(), delete_events_by_date(), EventBatchDeleteRequest, get_audit_trail(), get_event_clip() (+35 more)

### Community 1 - "useSentinelaStore"
Cohesion: 0.07
Nodes (39): CamerasPage(), EventsPage(), metadata, viewport, DashboardPage(), DeviceHealth, PairedDevice, ScreensPage() (+31 more)

### Community 2 - "devices.py"
Cohesion: 0.09
Nodes (58): BatchTestRequest, check_devices_health(), cleanup_all_devices(), deduplicate_devices(), delete_device(), device_diagnostics(), device_heartbeat(), DeviceAllowedCamerasUpdate (+50 more)

### Community 3 - "OverlayService"
Cohesion: 0.08
Nodes (28): BootReceiver, Context, Intent, DevicePolicy, SentinelaWebSocket, android, Context, Intent (+20 more)

### Community 4 - "sentinela-pro-tv/src/App.tsx"
Cohesion: 0.07
Nodes (37): App(), KotlinCodeModal(), KotlinCodeModalProps, TvCameraCarousel(), TvCameraCarouselProps, TvHeroSpotlight(), TvHeroSpotlightProps, TvLogsView() (+29 more)

### Community 5 - "cameras.py"
Cohesion: 0.09
Nodes (52): add_camera(), CameraCreate, CameraUpdate, delete_camera(), FrigateZonesPayload, get_camera_diagnostics(), get_camera_stream_info(), get_frigate_camera_zones() (+44 more)

### Community 6 - "SentinelaRepository"
Cohesion: 0.20
Nodes (4): SentinelaRepository, ServiceStatus, put, TelemetryData

### Community 7 - "settings.py"
Cohesion: 0.10
Nodes (44): _cached_dir_size(), clean_server_storage(), _dir_size_bytes(), dispatch_backup_to_telegram(), DNDConfigUpdate, download_database_file(), export_backup(), get_dnd_settings() (+36 more)

### Community 8 - "sentinela-pro-mobile-nvr/src/App.tsx"
Cohesion: 0.11
Nodes (26): App(), CapturesView(), CapturesViewProps, DesignTokensDoc(), KotlinCodeViewer(), CameraStreamCardItemProps, LiveFeedView(), LiveFeedViewProps (+18 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 10 - "Observer"
Cohesion: 0.07
Nodes (14): WebRtcManager, SdpObserver, Observer, SdpObserver, DataChannel, EglBase, IceCandidate, MediaStream (+6 more)

### Community 11 - "TelegramVaultService"
Cohesion: 0.10
Nodes (14): Any, Appends an event to the in-memory Telegram audit trail., Dispatches watermarked snapshot to Telegram using the classic template., Dispatches MP4 clip to Telegram using the classic template., Formats real-time telemetry into a rich Telegram status message., Validates bot credentials with Telegram API and sends a confirmation test…, Loads Bot Token and Chat ID from database if available, or seeds defaults., Sends a text message to the configured Telegram chat. (+6 more)

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

### Community 16 - "TvNetflixScreen.kt"
Cohesion: 0.06
Nodes (66): CameraItem, CaptureEvent, SentinelaPreferences, java, X509TrustManager, MainActivity, X509TrustManager, SentinelaConfig (+58 more)

### Community 17 - "FrigateBridgeService"
Cohesion: 0.13
Nodes (10): FrigateBridgeService, Any, Retrieves a live JPEG frame at native/main-stream resolution using a multi-…, Verifies with ffprobe that the MP4 contains at least one valid video stream and…, Probes average frame rate, duration, width and height of a video file., Checks whether the file contains an audio stream., Robust H.264/AAC constant-frame-rate preparation for Telegram & mobile…, Performs deep health check of all Frigate & go2rtc communication channels with… (+2 more)

### Community 18 - "Histórias"
Cohesion: 0.10
Nodes (20): AC-001 — Streaming WebRTC funcional via go2rtc, AC-002 — Detecção de Objetos e Bounding Boxes por IA, AC-003 — Snapshot em Resolução Nativa com Marca d'Água HUD, AC-004 — Clipes de Vídeo em Framerate Constante (CFR), AC-005 — Medição Real e Purge do Armazenamento, AC-028 — Watchdog de Auto-Reconexão e Anti-Congelamento no Player, AC-029 — Pipeline HD Nativo Prioritário para Snapshots e Thumbnails, AC-030 — Pipeline de Clipes Resiliente com Sincronismo PTS e Verificação de Áudio AAC (+12 more)

### Community 19 - "FastAPI"
Cohesion: 0.21
Nodes (10): get_db(), init_db(), audit_http_requests(), health_check(), lifespan(), get, Request, root() (+2 more)

### Community 20 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 21 - "X509Certificate"
Cohesion: 0.20
Nodes (8): X509TrustManager, SentinelaApplication, X509TrustManager, X509TrustManager, Application, ImageLoader, ImageLoaderFactory, X509Certificate

### Community 22 - "Models.kt"
Cohesion: 0.17
Nodes (8): AuditLogEntry, DiagnosticStatus, PairedDeviceItem, SingleConnectionResult, StorageStatus, TelemetryData, VideoStabilityResult, com

### Community 23 - "PiPGatewayService"
Cohesion: 0.16
Nodes (9): _cast_sync(), PiPGatewayService, Any, Dispatches Picture-in-Picture or Google Cast notification to registered TVs.…, Fast concurrent non-blocking port check to verify if Smart TV / device is…, Dispatches an interactive test PiP alert to a specific TV using real accessible…, Records an execution acknowledgement from a remote device overlay., Checks if current time falls in Do Not Disturb period. (+1 more)

### Community 24 - "api/telemetry.py"
Cohesion: 0.20
Nodes (15): download_diagnostic_logs(), fetch_docker_container_logs(), get_detailed_stats(), get_frigate_deep_status(), get_service_logs(), get_system_diagnostics(), get_telemetry(), get (+7 more)

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

### Community 30 - "PipPosition"
Cohesion: 0.22
Nodes (9): PipPosition, BOTTOM_CENTER, BOTTOM_LEFT, BOTTOM_RIGHT, CENTER_LEFT, CENTER_RIGHT, TOP_CENTER, TOP_LEFT (+1 more)

### Community 31 - "3. Catálogo de Endpoints da API REST (`/api`)"
Cohesion: 0.17
Nodes (11): 1. Visão Geral da Arquitetura, 2. Mapa de Serviços e Portas de Rede, 3.1. Módulo de Câmeras (`/api/cameras`), 3.2. Módulo de Dispositivos e Telas PiP (`/api/devices`), 3.3. Módulo de Eventos & Gravações (`/api/events`), 3.4. Módulo de Telemetria e Diagnósticos (`/api/telemetry`), 3.5. Módulo de Configurações & Telegram (`/api/settings`), 3.6. Módulo Scanner de Rede (`/api/scanner`) (+3 more)

### Community 32 - "🛡️ Sentinela Frigate Pro"
Cohesion: 0.17
Nodes (11): 📺 1. Android TV 55" (Layout Horizontal Estilo Netflix), 📱 2. Android Smartphone (Layout Vertical Estilo YouTube), 📱 Aplicativos Nativos Android (`v001.000.000.091`), 🖥️ Como Atualizar o Servidor Ubuntu, 🚀 Como Compilar os APKs no GitHub Codespaces, 📥 Download dos APKs Oficiais (`v001.000.000.091`), 📄 Licença, 🗺️ Mapa de Portas e Serviços (+3 more)

### Community 33 - "dependencies"
Cohesion: 0.04
Nodes (47): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+39 more)

### Community 34 - "Spec: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)"
Cohesion: 0.14
Nodes (13): AC-006 — Telemetria de Hardware via WebSocket e REST, AC-007 — Gerenciamento de Câmeras e Zonas no Mosaico, AC-008 — Pareamento de Dispositivos e Políticas de Acesso, AC-009 — Botão Flutuante (FAB) de Silenciamento de Alertas no Smartphone, AC-010 — Gateway Picture-in-Picture (PiP) para Android TV, Contexto, Fora de escopo, Histórias (+5 more)

### Community 35 - "PipDuration"
Cohesion: 0.22
Nodes (9): PipDuration, D_10S, D_15S, D_20S, D_30S, D_45S, D_5S, D_60S (+1 more)

### Community 36 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 37 - "PipSize"
Cohesion: 0.22
Nodes (9): PipSize, CINEMA, EXTRA_LARGE, EXTRA_SMALL, LARGE, MEDIUM, MEDIUM_LARGE, MEDIUM_SMALL (+1 more)

### Community 38 - "SentinelaRepository.kt"
Cohesion: 0.29
Nodes (4): Context, RemoteDeviceItem, HttpURLConnection, URL

### Community 39 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 40 - "onp-spec-driven — a especificação que continua verdadeira (Antigravity)"
Cohesion: 0.20
Nodes (10): Auto-dimensionamento, Carregamento de contexto, Catálogo de problemas que o audit aponta, Contrato de execução — inegociável, Interação — use todo o potencial do Antigravity, O motor embarcado (zero instalação), onp-spec-driven — a especificação que continua verdadeira (Antigravity), Perguntas que o motor responde por você (+2 more)

### Community 41 - "X509TrustManager"
Cohesion: 0.47
Nodes (3): java, X509TrustManager, X509TrustManager

### Community 42 - "MseCameraView"
Cohesion: 0.15
Nodes (12): android, Modifier, PermissionRequest, SslErrorHandler, WebChromeClient, WebView, WebViewClient, MseCameraView() (+4 more)

### Community 43 - "ConnectionTestState"
Cohesion: 0.40
Nodes (5): ConnectionTestState, FAILED, IDLE, SUCCESS, TESTING

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

### Community 76 - "ws.py"
Cohesion: 0.24
Nodes (5): Background loop sending hardware telemetry every 5.0 seconds to connected UI…, telemetry_broadcast_loop(), websocket_endpoint(), WebSocketManager, WebSocket

### Community 77 - "trigger_network_scan"
Cohesion: 0.40
Nodes (5): BaseModel, post, Triggers concurrent ONVIF Discovery and verified CCTV port scanner., ScanPayload, trigger_network_scan()

### Community 78 - "MemoryRingBufferHandler"
Cohesion: 0.40
Nodes (4): mask_sensitive_data(), MemoryRingBufferHandler, Captures all logging records in memory for real-time API streaming., LogRecord

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
Cohesion: 0.33
Nodes (5): 🛡️ Matriz de Especificações e Cobertura onp-spec, 🧭 O Que Foi Concluído Recentemente, ⚡ Próximos Passos e Itens em Aberto, STATE.md — Memória Persistente do Projeto, 🎯 Visão e Objetivos Atuais

### Community 94 - "Constituição — princípios que a máquina verifica"
Cohesion: 0.40
Nodes (5): Constituição — princípios que a máquina verifica, Níveis de obrigação, Preset LGPD + educação, Quatro formas de verificação, Rastreabilidade que dá diferencial de segurança

### Community 95 - "run_server_benchmark"
Cohesion: 0.40
Nodes (5): BenchmarkPayload, BaseModel, post, Runs on-demand stress & performance benchmarks for 1080p, 2K, 4K, IA detection…, run_server_benchmark()

### Community 101 - "get_audit_logs"
Cohesion: 0.67
Nodes (3): get_audit_logs(), AsyncSession, Returns application audit logs with newest events at the top (DESC order).

## Knowledge Gaps
- **374 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `name`, `private`, `version` (+369 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 599 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SentinelaPreferences` connect `TvNetflixScreen.kt` to `PipDuration`, `OverlayService`, `PipSize`, `SentinelaRepository.kt`, `SentinelaRepository`, `.registerOrHeartbeat`, `PipPosition`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `PairedDevice` connect `devices.py` to `PiPGatewayService`, `cameras.py`, `settings.py`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `SentinelaWebSocket` connect `OverlayService` to `TvNetflixScreen.kt`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `SentinelaPreferences` (e.g. with `PhoneCameraStreamCard()` and `PhoneCapturesTab()`) actually correct?**
  _`SentinelaPreferences` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Camera` (e.g. with `add_camera()` and `delete_camera()`) actually correct?**
  _`Camera` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `name` to the rest of the system?**
  _374 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `events.py` be split into smaller, more focused modules?**
  _Cohesion score 0.061016949152542375 - nodes in this community are weakly interconnected._