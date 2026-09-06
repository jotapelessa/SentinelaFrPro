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

### US-019 — Estabilidade de Conexão, Resolução HD e Resiliência Anti-Travamento
Como usuário do aplicativo web, TV ou smartphone
Quero que a reprodução das câmeras se auto-recupere de travamentos e que as fotos e vídeos tenham a máxima nitidez nativa
Para manter vigilância contínua sem necessidade de recarregar a página ou receber mídias de baixa resolução.

#### AC-028 — Watchdog de Auto-Reconexão e Anti-Congelamento no Player
- **Dado** que o player WebRTC/MSE está reproduzindo o stream de vídeo ao vivo
- **Quando** a conexão de rede oscilar, o stream congelar ou o elemento de vídeo registrar stall/erro
- **Então** o player deve ativar o watchdog inteligente com heartbeat, reconectando automaticamente o fluxo sem travar a interface e alternando suavemente entre WebRTC e MSE se persistir.

#### AC-029 — Pipeline HD Nativo Prioritário para Snapshots e Thumbnails
- **Dado** que um evento de detecção ocorre ou o usuário visualiza as câmeras em modo de economia/mosaico
- **Quando** o sistema requisitar a imagem estática da câmera
- **Então** o pipeline deve buscar primeiramente o frame em resolução nativa HD via `/go2rtc/api/frame.jpeg` ou RTSP nativo, recorrendo ao detect stream do Frigate apenas se o frame nativo estiver inacessível.

#### AC-030 — Pipeline de Clipes Resiliente com Sincronismo PTS e Verificação de Áudio AAC
- **Dado** que o Frigate finaliza a gravação de um evento com timestamps variáveis
- **Quando** o backend iniciar a transcodificação e empacotamento do clipe MP4
- **Então** o pipeline CFR deve validar a integridade dos streams com ffprobe, regenerar os timestamps PTS (`setpts=N/(FPS*TB)`), incorporar áudio AAC sincronizado e manter retry exponencial com validação de stream de vídeo antes do envio.

### US-020 — Persistência e Sincronização Instantânea de Câmeras Descobertas
Como operador do sistema
Quero que qualquer câmera encontrada pelo scanner e adicionada seja gravada de forma persistente e imediata no Frigate, go2rtc e banco de dados
Para que ela apareça instantaneamente no mosaico do app web, nos APKs e TVs sem ser descartada por purges indevidos ou dessincronia de cache.

#### AC-031 — Persistência Atômica Bidirecional e Invalidação de Cache de Câmeras
- **Dado** que o scanner de rede descobre uma nova câmera IP (RTSP/ONVIF)
- **Quando** o usuário confirmar a adição direta via modal ou formulário de cadastro
- **Então** o sistema deve persistir a câmera no banco SQLite/Postgres, gravar sua configuração no arquivo `config.yml` do Frigate e go2rtc, invalidar o cache em memória do backend, e garantir que rotinas de listagem não a purguem indevidamente, refletindo a nova câmera instantaneamente nas interfaces.

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
