# Graph Report - SentinelaFrigate  (2026-09-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1130 nodes · 1868 edges · 63 communities (35 shown, 17 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `43120c12`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TvNetflixScreen.kt
- OverlayService
- useSentinelaStore
- devices.py
- sentinela-pro-tv/src/App.tsx
- cameras.py
- api/telemetry.py
- settings.py
- sentinela-pro-mobile-nvr/src/App.tsx
- asyncio
- SentinelaRepository
- compilerOptions
- Observer
- events.py
- compilerOptions
- TelegramVaultService
- dependencies
- compilerOptions
- TvDesignTokens.kt
- ScannerService
- FrigateBridgeService
- X509Certificate
- PiPGatewayService
- dependencies
- MseCameraView
- TelemetryService
- 3. Catálogo de Endpoints da API REST (`/api`)
- 🛡️ Sentinela Frigate Pro
- dependencies
- X509TrustManager
- manifest.json
- Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4)
- TvAudioManager
- SentinelaMobileTokens.kt
- logger.ts
- Settings
- postcss.config.mjs
- logs/page.tsx
- graphify.js
- build_apk.sh
- compile_apk.sh
- next.config.mjs
- next-env.d.ts
- tailwind.config.ts
- setup-autostart.sh
- setup_ubuntu.sh
- simulate_event.sh
- opencode.json
- Run and deploy your AI Studio app
- Run and deploy your AI Studio app
- AGENTS.md
- execution.md

## God Nodes (most connected - your core abstractions)
1. `useSentinelaStore` - 28 edges
2. `SentinelaRepository` - 27 edges
3. `PairedDevice` - 25 edges
4. `Camera` - 25 edges
5. `OverlayService` - 20 edges
6. `TelegramVaultService` - 20 edges
7. `SeamlessCameraImage()` - 20 edges
8. `CameraItem` - 19 edges
9. `SentinelaPreferences` - 17 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `get_camera_diagnostics()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/cameras.py → backend/app/db/models.py
- `device_diagnostics()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/devices.py → backend/app/db/models.py
- `get_audit_logs()` --uses--> `AuditLog`  [INFERRED]
  backend/app/api/telemetry.py → backend/app/db/models.py
- `clean_server_storage()` --uses--> `EventRecord`  [INFERRED]
  backend/app/api/settings.py → backend/app/db/models.py
- `MQTTService` --uses--> `EventRecord`  [INFERRED]
  backend/app/services/mqtt_service.py → backend/app/db/models.py

## Import Cycles
- None detected.

## Communities (63 total, 17 thin omitted)

### Community 0 - "TvNetflixScreen.kt"
Cohesion: 0.06
Nodes (63): CameraItem, PipDuration, D_10S, D_15S, D_20S, D_30S, D_45S, D_5S (+55 more)

### Community 1 - "OverlayService"
Cohesion: 0.09
Nodes (24): BootReceiver, Context, Intent, SentinelaWebSocket, android, Context, Intent, SslErrorHandler (+16 more)

### Community 2 - "useSentinelaStore"
Cohesion: 0.07
Nodes (39): CamerasPage(), EventsPage(), metadata, viewport, DashboardPage(), DeviceHealth, PairedDevice, ScreensPage() (+31 more)

### Community 3 - "devices.py"
Cohesion: 0.09
Nodes (55): BatchTestRequest, check_devices_health(), cleanup_all_devices(), deduplicate_devices(), delete_device(), device_diagnostics(), device_heartbeat(), DeviceAllowedCamerasUpdate (+47 more)

### Community 4 - "sentinela-pro-tv/src/App.tsx"
Cohesion: 0.09
Nodes (36): App(), KotlinCodeModal(), KotlinCodeModalProps, TvCameraCarousel(), TvCameraCarouselProps, TvHeroSpotlight(), TvHeroSpotlightProps, TvLogsView() (+28 more)

### Community 5 - "cameras.py"
Cohesion: 0.10
Nodes (48): add_camera(), CameraCreate, CameraUpdate, delete_camera(), FrigateZonesPayload, get_camera_diagnostics(), get_camera_stream_info(), get_frigate_camera_zones() (+40 more)

### Community 6 - "api/telemetry.py"
Cohesion: 0.06
Nodes (42): BaseModel, post, Triggers concurrent ONVIF Discovery and verified CCTV port scanner., ScanPayload, trigger_network_scan(), BenchmarkPayload, download_diagnostic_logs(), fetch_docker_container_logs() (+34 more)

### Community 7 - "settings.py"
Cohesion: 0.10
Nodes (41): _cached_dir_size(), clean_server_storage(), _dir_size_bytes(), dispatch_backup_to_telegram(), DNDConfigUpdate, download_database_file(), export_backup(), get_dnd_settings() (+33 more)

### Community 8 - "sentinela-pro-mobile-nvr/src/App.tsx"
Cohesion: 0.11
Nodes (26): App(), CapturesView(), CapturesViewProps, DesignTokensDoc(), KotlinCodeViewer(), CameraStreamCardItemProps, LiveFeedView(), LiveFeedViewProps (+18 more)

### Community 9 - "asyncio"
Cohesion: 0.08
Nodes (18): asyncio, Background loop sending hardware telemetry every 5.0 seconds to connected UI…, telemetry_broadcast_loop(), websocket_endpoint(), WebSocketManager, publish_simulated_event(), Publishes a mock Frigate security event to Mosquitto MQTT., MQTTService (+10 more)

### Community 10 - "SentinelaRepository"
Cohesion: 0.05
Nodes (37): AuditLogEntry, CaptureEvent, DiagnosticStatus, PairedDeviceItem, PipPosition, BOTTOM_CENTER, BOTTOM_LEFT, BOTTOM_RIGHT (+29 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "Observer"
Cohesion: 0.07
Nodes (14): WebRtcManager, SdpObserver, Observer, SdpObserver, DataChannel, EglBase, IceCandidate, MediaStream (+6 more)

### Community 13 - "events.py"
Cohesion: 0.11
Nodes (32): clear_audit_trail(), delete_event(), delete_events_batch(), delete_events_by_date(), EventBatchDeleteRequest, get_audit_trail(), get_event_clip(), get_events_summary() (+24 more)

### Community 14 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 15 - "TelegramVaultService"
Cohesion: 0.10
Nodes (14): Any, Appends an event to the in-memory Telegram audit trail., Dispatches watermarked snapshot to Telegram using the classic template., Dispatches MP4 clip to Telegram using the classic template., Formats real-time telemetry into a rich Telegram status message., Validates bot credentials with Telegram API and sends a confirmation test…, Loads Bot Token and Chat ID from database if available, or seeds defaults., Sends a text message to the configured Telegram chat. (+6 more)

### Community 16 - "dependencies"
Cohesion: 0.04
Nodes (47): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+39 more)

### Community 17 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowJs, downlevelIteration, esModuleInterop, incremental, isolatedModules, jsx, lib (+19 more)

### Community 18 - "TvDesignTokens.kt"
Cohesion: 0.09
Nodes (25): CameraEntity, CameraStatus, ALERT, ONLINE, RECORDING, STANDBY, CameraStreamTelemetry, DetectionBox (+17 more)

### Community 19 - "ScannerService"
Cohesion: 0.13
Nodes (12): Any, Tries to connect to a specific port on an IP address., Sends authentic RTSP OPTIONS / DESCRIBE probes to verify real video stream…, Queries ONVIF SOAP GetDeviceInformation to retrieve real hardware metadata:…, Classifies camera hardware, identifying AITEK SEG6050BP (Guangdong Pineng…, Sends hybrid WS-Discovery UDP probes on port 3702 to all subnets (wildcard +…, Concurrently scans CCTV ports with semaphore control, ONVIF SOAP inspection,…, Runs comprehensive multi-probe scan discovering ONVIF and RTSP CCTV devices. (+4 more)

### Community 20 - "FrigateBridgeService"
Cohesion: 0.13
Nodes (10): FrigateBridgeService, Any, Retrieves a live JPEG frame at native/main-stream resolution using a multi-…, Verifies with ffprobe that the MP4 contains at least one valid video stream and…, Probes average frame rate, duration, width and height of a video file., Checks whether the file contains an audio stream., Robust H.264/AAC constant-frame-rate preparation for Telegram & mobile…, Performs deep health check of all Frigate & go2rtc communication channels with… (+2 more)

### Community 21 - "X509Certificate"
Cohesion: 0.20
Nodes (8): X509TrustManager, SentinelaApplication, X509TrustManager, X509TrustManager, Application, ImageLoader, ImageLoaderFactory, X509Certificate

### Community 22 - "PiPGatewayService"
Cohesion: 0.16
Nodes (9): _cast_sync(), PiPGatewayService, Any, Dispatches Picture-in-Picture or Google Cast notification to registered TVs.…, Fast concurrent non-blocking port check to verify if Smart TV / device is…, Dispatches an interactive test PiP alert to a specific TV using real accessible…, Records an execution acknowledgement from a remote device overlay., Checks if current time falls in Do Not Disturb period. (+1 more)

### Community 23 - "dependencies"
Cohesion: 0.05
Nodes (38): clsx, dependencies, clsx, lucide-react, next, react, react-dom, tailwind-merge (+30 more)

### Community 24 - "MseCameraView"
Cohesion: 0.15
Nodes (12): android, Modifier, SslErrorHandler, WebChromeClient, WebView, WebViewClient, MseCameraView(), WebChromeClient (+4 more)

### Community 25 - "TelemetryService"
Cohesion: 0.23
Nodes (6): Any, Scans Linux processes and returns top consumers of CPU and RAM., Provides an exhaustive statistical overview of the entire system., Reads CPU temperature from Linux thermal zones (/sys/class/thermal/ or psutil).…, Executes real stress/benchmark workloads on the server CPU/iGPU and returns…, TelemetryService

### Community 26 - "3. Catálogo de Endpoints da API REST (`/api`)"
Cohesion: 0.17
Nodes (11): 1. Visão Geral da Arquitetura, 2. Mapa de Serviços e Portas de Rede, 3.1. Módulo de Câmeras (`/api/cameras`), 3.2. Módulo de Dispositivos e Telas PiP (`/api/devices`), 3.3. Módulo de Eventos & Gravações (`/api/events`), 3.4. Módulo de Telemetria e Diagnósticos (`/api/telemetry`), 3.5. Módulo de Configurações & Telegram (`/api/settings`), 3.6. Módulo Scanner de Rede (`/api/scanner`) (+3 more)

### Community 27 - "🛡️ Sentinela Frigate Pro"
Cohesion: 0.17
Nodes (11): 📺 1. Android TV 55" (Layout Horizontal Estilo Netflix), 📱 2. Android Smartphone (Layout Vertical Estilo YouTube), 📱 Aplicativos Nativos Android (`v001.000.000.087`), 🖥️ Como Atualizar o Servidor Ubuntu, 🚀 Como Compilar os APKs no GitHub Codespaces, 📥 Download dos APKs Oficiais (`v001.000.000.087`), 📄 Licença, 🗺️ Mapa de Portas e Serviços (+3 more)

### Community 28 - "dependencies"
Cohesion: 0.04
Nodes (47): dependencies, dotenv, express, @google/genai, lucide-react, motion, react, react-dom (+39 more)

### Community 29 - "X509TrustManager"
Cohesion: 0.47
Nodes (3): java, X509TrustManager, X509TrustManager

### Community 30 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 31 - "Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4)"
Cohesion: 0.33
Nodes (5): `frigate/config/config.yml`, Proposed Changes, Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4), Status Atual, User Review Required

### Community 33 - "SentinelaMobileTokens.kt"
Cohesion: 0.40
Nodes (4): SentinelaColors, SentinelaDimens, SentinelaShapes, SentinelaTypography

### Community 34 - "logger.ts"
Cohesion: 0.40
Nodes (3): COLORS, logger, LogLevel

### Community 58 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **239 isolated node(s):** `TvDeviceStatus`, `DiagnosticStatus`, `PairedDeviceItem`, `TelemetryData`, `DetectionBox` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 441 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `update_device_permissions()` connect `devices.py` to `SentinelaRepository`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `update_device_status()` connect `devices.py` to `SentinelaRepository`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `SentinelaPreferences` connect `TvNetflixScreen.kt` to `OverlayService`, `SentinelaRepository`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `PairedDevice` (e.g. with `check_devices_health()` and `cleanup_all_devices()`) actually correct?**
  _`PairedDevice` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `Camera` (e.g. with `add_camera()` and `delete_camera()`) actually correct?**
  _`Camera` has 18 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TvDeviceStatus`, `DiagnosticStatus`, `PairedDeviceItem` to the rest of the system?**
  _239 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TvNetflixScreen.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._