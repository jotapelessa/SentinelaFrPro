# Spec: Disparo de Fotos e Vídeos de Intrusão para o Telegram (Telegram Vault & Drive)

> feature: telegram-vault
> status: pronta

## Contexto

Pipeline de segurança e inteligência do Sentinela Frigate Pro responsável pelo processamento, aplicação de marca d'água HUD profissional, compressão em tempo hábil, formatação contextual rica em português com nuvem de hashtags indexadas e despacho imediato de fotos em alta resolução e vídeos MP4 fluidos em taxa de quadros constante (CFR) para o Telegram, viabilizando armazenamento e retenção infinita (Telegram Drive), auditoria e controle bidirecional via bot interativo.

## Histórias

### US-016 — Foto de Alerta Instantâneo com Marca d'Água HUD e Metadados Ricos
Como proprietário ou operador do sistema de monitoramento
Quero que o Sentinela envie imediatamente uma foto da detecção para o Telegram com marca d'água profissional e metadados
Para que eu seja notificado em menos de 2 segundos com contexto visual completo de quem ou o que invadiu o perímetro.

#### AC-022 — Marca d'Água HUD Dinâmica e Formatação de Snapshot
- **Dado** que um evento de detecção de alta prioridade (pessoa, veículo ou animal) é recebido pelo `MQTTService`
- **Quando** o método `send_alert_photo` do `TelegramVaultService` for invocado com o frame da câmera
- **Então** o sistema deve aplicar marca d'água HUD superior com faixa ciano, nome da câmera, rótulo do objeto, zona e data/hora (`apply_watermark`), garantindo arquivo JPEG otimizado abaixo de 4.5 MB.

#### AC-023 — Formatação Rica de Mensagem com Tags de Busca (Telegram Drive)
- **Dado** que uma foto ou vídeo está sendo preparado para despacho no Telegram
- **Quando** a legenda for montada através de `format_event_message`
- **Então** deve ser gerada uma mensagem contendo cabeçalho estilizado, local e zona, data e hora com dia da semana, precisão em porcentagem, tamanho em MB e nuvem de hashtags contextuais (`#ano`, `#mes`, `#dia`, `#camera`, `#periodo`, `#rotulo`, `#foto_jpg` ou `#video_mp4`) para busca instantânea.

### US-017 — Gravação e Envio de Clipes de Vídeo MP4 Otimizados
Como usuário do Sentinela Frigate Pro
Quero receber no Telegram o vídeo em MP4 do evento com pré-captura e pós-captura em taxa de quadros constante
Para que eu possa ver a movimentação completa sem travamentos ou cortes bruscos.

#### AC-024 — Captura de Clipe Estendido com Pré e Pós-Captura
- **Dado** que o evento Frigate é finalizado (`event_type == "end"`)
- **Quando** a rotina de envio de vídeo `_dispatch_telegram_video_with_retry` for acionada
- **Então** o sistema deve calcular janela temporal com no mínimo 5s de pré-captura e 5s de pós-captura (duração mínima de 20s e máxima de 60s), aguardando a sincronização dos segmentos do NVR.

#### AC-025 — Transcodificação H.264 CFR Fluida e Envio com Streaming
- **Dado** que o arquivo MP4 bruto foi obtido do NVR ou gravador de emergência
- **Quando** o clipe for processado antes do despacho via `transcode_to_30fps` e `send_alert_video`
- **Então** o sistema deve transcodificar o vídeo para H.264 constante (QSV ou libx264 veryfast) com sinalizador `supports_streaming: "true"`, garantindo reprodução inline instantânea no Telegram.

### US-018 — Idempotência e Auditoria de Disparos de Mídia
Como administrador de segurança
Quero que o sistema impeça envio de vídeos duplicados e mantenha histórico de auditoria de todos os envios
Para evitar spam no canal do Telegram e auditar a taxa de entrega.

#### AC-026 — Guarda de Idempotência em Memória e Banco de Dados
- **Dado** que um evento pode emitir múltiplos sinais de encerramento pelo broker MQTT
- **Quando** o `MQTTService` processar a finalização do evento
- **Então** ele deve verificar a chave `_processed_videos` em memória cache e o campo `video_sent` no `EventRecord` do banco SQLite/Postgres, abortando envios duplicados para o mesmo `event_id`.

#### AC-027 — Trilha de Auditoria em Memória e Suporte a Pausa de Alertas
- **Dado** que ações de envio de fotos, vídeos ou documentos ocorrem no `TelegramVaultService`
- **Quando** cada operação `send_alert_photo` ou `send_alert_video` for concluída (sucesso ou falha)
- **Então** o sistema deve registrar entrada detalhada via `record_audit`, e respeitar o estado `is_paused()` caso alertas tenham sido pausados via comando `/pausar` ou API.

## Fora de escopo

- Reconhecimento facial de alta precisão em nuvem pública externa.
- Armazenamento em mídias físicas de fita magnética.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-009 | O servidor possui conectividade HTTPS de saída para a API oficial do Telegram (`api.telegram.org`). | confirmada | Validado no serviço de checagem e teste de conexão do bot. |
| ASM-010 | As ferramentas de linha de comando `ffmpeg` e `ffprobe` estão instaladas no ambiente de execução. | confirmada | Utilizadas nas rotinas de probe e transcodificação CFR. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-005 | O Telegram Bot deve aceitar comandos de usuários não autorizados nos grupos? | respondida | Não; apenas mensagens vindas do `chat_id` configurado são executadas pelo interpretador de comandos. |
