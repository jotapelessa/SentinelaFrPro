# Correção Crítica das Zonas e Gravação (v060.1)

O diagnóstico da "Tela Preta e falha nas detecções" revelou duas falhas técnicas cruciais nas configurações da câmera:

1. **Apenas a trilha de Áudio estava sendo salva!** 
   O `ffprobe` revelou que o arquivo `mp4` salvo pelo Frigate na v060 estava omitindo a stream de vídeo e salvando apenas a trilha `aac`. Isso é causado pelo conflito da flag nativa do FFmpeg `-an` (no-audio) que entrava em choque com o `-c copy` cego, fazendo ele mapear a trilha de áudio no lugar do vídeo (um bug bizarro de parse de RTSP).
   **Correção:** Modificaremos o `output_args` para `preset-record-generic-audio`, que mapeia explicitamente `-c:v copy` (vídeo) e `-c:a copy` (áudio), forçando a existência da imagem em todos os arquivos salvos.

2. **As zonas de Detecção (Monitoramento e Entrada) estão invisíveis para a IA!**
   O sensor neural (OpenVINO) está enxergando uma imagem redimensionada em 640x360 (para ganhar performance de processamento na N5105). No entanto, o `config.yml` ainda estava utilizando as coordenadas baseadas na câmera original de 1280x720! (ex: `Y=720`). Como 720 está fora dos limites de 360, a zona ficava num "ponto cego" do Frigate, ignorando completamente pessoas e carros.
   **Correção:** Redimensionei as coordenadas das zonas para caberem em escala (fator 0.5) dentro da resolução de detecção de 640x360.

> [!IMPORTANT]
> Aprovação automática não necessária para comandos imediatos, mas eu procederei com os ajustes caso concorde com a correção das falhas lógicas e mapeamento de trilha.
