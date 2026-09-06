# Spec: Sentinela Core Ecosystem (Web, Mobile & Orquestrador)

> feature: sentinela-core
> status: pronta

## Contexto

Camada de orquestração do ecossistema Sentinela Frigate Pro: abrange o backend FastAPI (`/api`), o frontend Web Next.js reativo com WebSocket, o pareamento e telemetria de dispositivos (Smart TV Android TV e Smartphone Compose), as políticas de controle de acesso (DND / Não Perturbe) e o gateway PiP (Picture-in-Picture) para alertas visuais em tempo real.

## Histórias

### US-004 — Central de Controle Web Responsiva e Telemetria em Tempo Real
Como operador do sistema
Quero visualizar o mosaico de câmeras, telemetria de hardware (CPU, RAM, temperatura) e logs de auditoria no painel Web
Para ter visão unificada da saúde do sistema e dos eventos de intrusão.

#### AC-006 — Telemetria de Hardware via WebSocket e REST
- **Dado** que o backend FastAPI está em execução
- **Quando** o painel Web ou o app Android conectar ao endpoint `/api/telemetry/` ou WebSocket
- **Então** o sistema deve entregar o uso de CPU, temperatura do N5105, ocupação de RAM e status do Mosquitto sem bloqueio de I/O.

#### AC-007 — Gerenciamento de Câmeras e Zonas no Mosaico
- **Dado** que câmeras RTSP foram descobertas na rede
- **Quando** o usuário adicionar ou editar uma câmera pelo modal de configuração Web
- **Então** a câmera deve ser salva no banco SQLite (`sentinela.db`) e sincronizada dinamicamente com o go2rtc e Frigate sem derrubar o container.

### US-005 — Ecossistema Mobile Multiplataforma (Android TV & Smartphone)
Como morador utilizando TV ou celular
Quero navegar pelos canais de câmeras, receber notificações PiP e controlar os alertas na palma da mão
Para acessar o CFTV com experiência nativa sem depender de navegador web.

#### AC-008 — Pareamento de Dispositivos e Políticas de Acesso
- **Dado** que um dispositivo Android inicia pela primeira vez
- **Quando** ele enviar o heartbeat via `SentinelaRepository.registerOrHeartbeat` para `/api/devices/heartbeat`
- **Então** o backend deve cadastrar o dispositivo como `android_tv` ou `smartphone` e retornar a política de câmeras permitidas e permissões de controle.

#### AC-009 — Botão Flutuante (FAB) de Silenciamento de Alertas no Smartphone
- **Dado** que o usuário está no feed vertical de câmeras do Smartphone (`PhoneLiveCamerasTab`)
- **Quando** clicar no botão flutuante de silenciamento de alertas
- **Então** o aplicativo deve invocar `SentinelaRepository.pauseAlerts(60)` disparando `POST /api/settings/pause` e alterar o estado visual para âmbar indicando pausa de 1 hora.

#### AC-010 — Gateway Picture-in-Picture (PiP) para Android TV
- **Dado** que a Smart TV está vinculada ao servidor e assistindo a um canal ou streaming
- **Quando** um evento de alta relevância (pessoa detectada) for publicado no MQTT
- **Então** o serviço PiP Gateway deve acionar o overlay flutuante na Android TV mostrando o stream ao vivo da câmera durante o tempo configurado (ex: 10s).

## Fora de escopo

- Suporte a sistemas proprietários iOS / Apple TV (ecossistema focado em Android TV e Android Smartphone).
- Autenticação por biometria física nas Smart TVs.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-003 | Os dispositivos na rede local conseguem se comunicar via HTTP/WebSocket diretamente com a porta 8080 do backend ou via Tailscale. | confirmada | Heartbeats e WebSockets testados e operacionais. |
| ASM-004 | O Android TV possui permissão de `SYSTEM_ALERT_WINDOW` para renderizar janelas flutuantes sobre outros apps (Netflix, YouTube). | confirmada | Implementado no `OverlayService.kt` com fallback gracioso. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-002 | O usuário pode customizar o tempo de duração da janela flutuante PiP na TV? | respondida | Sim; o backend sincroniza as opções (5s, 10s, 15s, 30s) direto pelo `SentinelaPreferences`. |
