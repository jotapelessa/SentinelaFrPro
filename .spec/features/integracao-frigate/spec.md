# Spec: Integração Frigate NVR 0.17 & go2rtc

> feature: integracao-frigate
> status: pronta

## Contexto

Integração central entre o Frigate NVR 0.17, o motor go2rtc e o ecossistema Sentinela Frigate Pro, garantindo ingestão RTSP das câmeras, detecção de objetos por IA com acelerador GPU, publicação de eventos via Mosquitto MQTT e streaming de baixíssima latência (WebRTC/MSE) para as interfaces Web, Android TV e Smartphone.

## Histórias

### US-001 — Ingestão de Câmeras e Streaming de Baixa Latência
Como operador do sistema de monitoramento
Quero visualizar o vídeo ao vivo das câmeras cadastradas em tempo real via WebRTC e go2rtc
Para monitorar o perímetro com latência inferior a 500ms e sem consumo excessivo de CPU.

#### AC-001 — Streaming WebRTC funcional via go2rtc
- **Dado** que uma câmera está devidamente cadastrada com URL RTSP válida
- **Quando** o cliente Web ou o app Android solicitar o fluxo de vídeo da câmera
- **Então** o go2rtc deve entregar o stream H.264 via WebRTC/MSE sem transcodificação desnecessária e com reprodução contínua.

#### AC-002 — Detecção de Objetos e Bounding Boxes por IA
- **Dado** que a câmera está com a detecção ativada no Frigate
- **Quando** uma pessoa, veículo ou animal entrar na zona configurada
- **Então** o Frigate deve processar o frame via modelo de detecção acelerado por hardware e publicar o evento com as coordenadas (box) no tópico MQTT `frigate/events`.

### US-002 — Disparo de Alertas e Clipes com Áudio H.264 / AAC
Como proprietário do imóvel
Quero que os eventos detectados pelo Frigate gerem alertas automáticos com foto e clipe de vídeo fluido no Telegram
Para registrar evidências visuais de qualquer movimentação suspeita.

#### AC-003 — Snapshot em Resolução Nativa com Marca d'Água HUD
- **Dado** que um evento de detecção é iniciado pelo Frigate
- **Quando** o serviço `MQTTService` receber a mensagem com snapshot
- **Então** o `TelegramVaultService` deve aplicar a marca d'água HUD dinâmica (timestamp, zona, câmera e confiança) sem forçar downscale e enviar a foto ao Telegram.

#### AC-004 — Clipes de Vídeo em Framerate Constante (CFR)
- **Dado** que um evento com gravação de vídeo é finalizado pelo Frigate
- **Quando** o clipe MP4 for processado pelo backend
- **Então** o arquivo deve ser re-empacotado em framerate constante (CFR entre 15 e 30 FPS) com H.264/AAC, evitando vídeos com sensação de 3 FPS ou travamentos no player móvel.

### US-003 — Gerenciamento e Limpeza Automática do SSD NVMe
Como administrador do servidor
Quero que o sistema monitore e faça a rotação das gravações e capturas do Frigate no SSD
Para impedir que o disco atinja 100% de ocupação e trave o sistema operacional Ubuntu.

#### AC-005 — Medição Real e Purge do Armazenamento
- **Dado** que o espaço utilizado pelas gravações se aproxima da cota definida
- **Quando** a rotina de limpeza (`/api/settings/storage/clean`) for executada
- **Então** os arquivos de gravação e clipes mais antigos que a retenção devem ser deletados fisicamente do diretório `/media/frigate`, liberando espaço real no sistema de arquivos.

## Fora de escopo

- Treinamento local de modelos de inteligência artificial (usa-se os modelos otimizados padrão do Frigate).
- Gravação contínua em resolução 4K RAW sem compressão no SSD local.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | As câmeras IP suportam streams RTSP H.264 nas portas 554 ou 1935 com credenciais configuráveis. | confirmada | Validadas e ativas no scanner de rede do sistema. |
| ASM-002 | O processador Intel N5105 do servidor possui driver Intel QuickSync (QSV) ativo para aceleração gráfica. | confirmada | Verificado `/dev/dri/renderD128` no container Frigate. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | O Frigate deve reiniciar automaticamente quando uma nova câmera for adicionada via REST API? | respondida | Não; a configuração é aplicada dinamicamente para não interromper a gravação das câmeras já ativas. |
