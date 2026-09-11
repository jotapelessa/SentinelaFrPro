# STATE.md — Memória Persistente do Projeto

> **Sentinela Frigate Pro**
> **Última Atualização:** 2026-09-10 17:40 BRT
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

---

## ⚡ Próximos Passos e Itens em Aberto

1. **Front-end Web (Next.js Dashboard)**:
   - Especificar formalmente as features restantes da interface Web (timeline de gravações, modal de desenho de zonas poligonais e configurações do sistema) com `onp-spec`.
2. **Manutenção do Grafo de Conhecimento**:
   - Sempre executar `graphify extract . --code-only` e `graphify export obsidian --dir graphify-out/obsidian-vault` após alterações de código.
3. **Persistência de Sessão**:
   - Manter este `STATE.md` atualizado em cada início e fim de sessão, preservando decisões técnicas e progresso.

