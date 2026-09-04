# Resgate do Sistema: Solução do Crash do FFmpeg (v060.2)

Eu cometi um erro fatal no preset de gravação do Frigate que derrubou os motores da câmera em loop infinito. O servidor está tentando processar uma flag de áudio não mapeada e isso travou todas as detecções, por isso pararam de funcionar de vez agora!

## O que causou a parada repentina?
O preset de nome `preset-record-generic-audio` não foi reconhecido pelo pacote de ffmpeg padrão dessa build (ele tenta abrir como um nome de arquivo de destino, e retorna `Invalid argument`). O motor de gravação e detecção do Frigate, atrelados ao mesmo container, reinicia ininterruptamente e inviabiliza as notificações.

## O problema oculto da "Tela Preta" finalmente desmascarado
Lendo os logs recentes de falha, encontrei dois erros críticos escondidos no seu Feed RTSP da Câmera (RTSP vindo da `192.168.1.6`):
```text
[h264] Missing reference picture, default is 0
[h264] decode_slice_header error
```
A sua câmera original (ou a rede Wifi dela) perde pacotes corrompendo os cabeçalhos (`slice_header`) dos frames H.264. O FFmpeg original tenta "copiar" a stream, descobre que a stream de vídeo tá corrompida e a DROPA! Sobrando **apenas áudio** (como o meu teste com `ffprobe` revelou, o mp4 salvo tinha 100% de áudio e 0% de vídeo). Como o vídeo não existe, fica tudo preto!

## Proposed Changes

### `frigate/config/config.yml` (A cartada final)
Como a stream nativa vinda do Wifi/RTSP está suja/quebrada, nós a interceptaremos pelo Go2RTC já embutido no sistema, recodificaremos no servidor (usando sua placa gráfica via hardware para não onerar CPU) e gravaremos a versão **impecavelmente limpa** no HD.

- **[MODIFY]** Restauração do preset record nativo para interromper o crash: `record: preset-record-generic`.
- **[MODIFY]** Substituição do Input da câmera no motor de captura. Trocarei `path: rtsp://127.0.0.1:8554/camera_principal` por `path: rtsp://127.0.0.1:8554/camera_principal_h264`. (Isso extrairá o stream sanitizado pelo próprio Frigate/Go2RTC).

## User Review Required
> [!CAUTION]
> Vou aplicar essas correções de resgate imediatamente, limpar seu container corrompido, colocar o `v060.2` no ar e testar via backend se a stream limpa resolveu. Como os containers caíram, recomendo a execução.
