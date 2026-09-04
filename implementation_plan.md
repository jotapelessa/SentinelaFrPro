# Resgate do Sistema: Solução Final para o Vídeo do Telegram (v060.4)

## Status Atual
O Frigate foi restaurado e as detecções e Live Stream estão online. Contudo, identifiquei **por que o vídeo não foi pro Telegram**:
O backend do Telegram usa uma função (`has_video_stream`) que escaneia o MP4 salvo no HD. Devido ao WiFi da câmera introduzir falhas na rede (`decode_slice_header error`), o motor de gravação FFmpeg estava ignorando e **excluindo a trilha de vídeo** dos arquivos temporários de evento (pois eles vinham quebrados). Como o MP4 gerado possuía 0 bytes de imagem, o envio de vídeo era cancelado.

## Proposed Changes

### `frigate/config/config.yml`
Vou adicionar os argumentos `-fflags +genpts+discardcorrupt` e `-err_detect ignore_err` diretamente nos **input_args** da câmera.
Isso forçará o FFmpeg a ignorar pacotes de vídeo corrompidos pela rede e **jamais desistir da gravação da trilha de vídeo**, salvando o que estiver bom do H264 no arquivo `.mp4`. Com a trilha de vídeo garantida no arquivo, o envio do vídeo para o Telegram terá sucesso imediato.

## User Review Required
Nenhuma ação manual necessária. Irei injetar a correção da tolerância de erros da rede no FFmpeg e reiniciar o servidor. Logo em seguida os vídeos do Telegram voltarão ao ar caso aja uma nova detecção!
