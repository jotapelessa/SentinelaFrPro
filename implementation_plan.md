# Resolução de Tela Preta e Vídeos Dessincronizados (v060)

Identifiquei com precisão a causa dos vídeos gravados pretos e dos envios pro Telegram conterem apenas "vídeos vazios" (sem as pessoas). 

## Causa Raiz
O Celeron Jasper Lake (N5105) possui aceleração QuickSync (QSV), mas no Frigate `config.yml` o sistema estava usando `preset-vaapi` de forma **global**. 
1. **Vídeo Preto:** O uso do `preset-vaapi` global corrompe a gravação (roles record) porque o FFmpeg não consegue fazer um "copy stream" seguro após ativar a superfície VAAPI no H264. O vídeo é salvo com o container corrompido, ficando "preto" no Review (UI) e no Sentinela.
2. **Vídeo Repetido/Vazio no Telegram:** A aceleração VAAPI estava engasgando o processo de decodificação (`detect`) a 3 FPS. Como a GPU engasga, o FFmpeg de detecção começa a ficar com 15 a 30 segundos de "atraso" em relação à vida real. Ou seja: quando o Sentinela detecta uma pessoa, a pessoa já passou faz 30 segundos! O Telegram baixa o clip dos últimos 30 segundos reais e acaba pegando uma cena onde a rua já está vazia.

## Proposed Changes

### `frigate/config/config.yml`
Substituiremos a engine global de hardware VAAPI pelo **Intel QSV nativo** (QuickSync Video), que suporta transição de memória segura (Zero-Copy) e elimina o atraso de buffer da CPU Intel.
- Trocar `hwaccel_args: preset-vaapi` por `hwaccel_args: preset-intel-qsv-h264`.
- Adicionar o parâmetro de buffer de TCP para evitar corrupção na transmissão local: `preset-rtsp-restream` para o input_args.

### Android APKs (Entregável do Codespaces)
Como solicitado, fornecerei as instruções exatas de compilação dos novos APKs com o número de versão `v060`.

## User Review Required
> [!IMPORTANT]
> Vou aplicar essas correções de arquitetura no Frigate e avançar a versão para a v060 para garantir o tracking correto. Aguardo sua aprovação para injetar as otimizações no servidor!
