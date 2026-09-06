# Spec: Aplicativo Android TV (Sentinela TV Netflix Edition)

> feature: android-tv-app
> status: pronta

## Contexto

Interface de alta performance para Smart TVs (Android TV / Google TV) baseada no padrão visual Netflix/YouTube com foco total em controle remoto (D-Pad). A aplicação opera em modo Leanback com sidebar fixa de navegação, player Hero principal em tempo real (MSE/JPEG streaming), carrossel horizontal de câmeras, galeria de gravações com player de evidências, conjunto de ferramentas de diagnóstico, console de logs ao vivo e painel de ajustes com janela flutuante PiP (Picture-in-Picture).

## Histórias

### US-006 — Navegação por D-Pad e Sidebar de Menus
Como usuário assistindo à Smart TV com o controle remoto
Quero navegar entre as abas principais (Câmeras, Capturas, Ferramentas, Logs, Configurações) usando o direcional D-Pad
Para alternar rapidamente entre visualizações com feedback de foco visual imediato e sem engasgos.

#### AC-011 — Sidebar Fixa com Relógio e Indicador de Foco
- **Dado** que o aplicativo Android TV é iniciado em resolução 1080p/4K
- **Quando** o usuário pressionar as teclas Cima/Baixo ou Esquerda do controle remoto
- **Então** a `TvSidebar` deve mover o foco entre as 5 abas (`CAMERAS`, `RECORDINGS`, `TOOLS`, `LOGS`, `SETTINGS`) com borda ciano destacada (`focusedBorderColor`) e exibir o relógio em tempo real.

### US-007 — Menu Câmeras: Hero Viewport e Carrossel Horizontal
Como operador de segurança assistindo à Smart TV
Quero visualizar a câmera principal em destaque (Hero) e alternar entre outras câmeras em um carrossel inferior
Para monitorar a área de maior risco sem perder a visão geral dos demais canais.

#### AC-012 — Player Hero com Telemetria e Alternância por Carrossel
- **Dado** que a aba `CAMERAS` está selecionada
- **Quando** o usuário navegar no carrossel inferior (`TvCamerasViewport`) e pressionar `DPAD_CENTER` em uma câmera
- **Então** o painel Hero superior deve carregar imediatamente o stream da câmera selecionada exibindo o HUD com resolução, FPS, status online e nome amigável.

### US-008 — Menu Capturas (Gravações) e Player de Clipes
Como usuário da Smart TV
Quero navegar pela lista de eventos de intrusão e reproduzir o clipe gravado direto na TV
Para verificar rapidamente quem passou pelo portão ou garagem sem levantar do sofá.

#### AC-013 — Galeria de Capturas e Reprodução de Vídeos
- **Dado** que a aba `RECORDINGS` (`TvRecordingsViewport`) está ativa
- **Quando** o usuário selecionar um evento de detecção e clicar em reproduzir
- **Então** o player integrado (`TvClipPlayerDialog`) deve reproduzir o vídeo MP4 em tela cheia com barra de progresso, botão fechar e informações da zona detectada.

### US-009 — Menu Ferramentas: Diagnósticos, Testes de Rede e PiP Manual
Como administrador do sistema
Quero acessar ferramentas de teste de ping, velocidade de rede, reinicialização e disparo de PiP de teste na TV
Para diagnosticar problemas de conexão entre a TV e o servidor Sentinela.

#### AC-014 — Execução de Ferramentas e Disparo de Alerta PiP de Teste
- **Dado** que a aba `TOOLS` (`TvToolsViewport`) está aberta
- **Quando** o usuário selecionar e ativar o card "Testar Janela PiP"
- **Então** o sistema deve instanciar uma janela flutuante `TvPipFloatingWindow` no canto superior direito com contagem regressiva de 10s e som de notificação.

### US-010 — Menu Logs e Menu Configurações: Console e Parâmetros
Como usuário configurando a Smart TV
Quero inspecionar logs de eventos e ajustar o tamanho do PiP, duração e endereço IP do servidor
Para personalizar o comportamento das notificações de acordo com o tamanho da minha televisão.

#### AC-015 — Ajuste de Parâmetros PiP e Monitoramento de Logs
- **Dado** que a aba `SETTINGS` (`TvSettingsViewport`) ou `LOGS` (`TvLogsViewport`) está selecionada
- **Quando** o usuário alterar o tamanho do PiP (Pequeno, Médio, Grande, Cinema) ou tempo de exibição
- **Então** a preferência deve ser salva instantaneamente no `SentinelaPreferences` e enviada ao backend no próximo heartbeat.

## Fora de escopo

- Edição de zonas poligonais por controle remoto na TV (essa edição complexa é feita exclusivamente no mouse da aplicação Web).
- Configuração de chaves de API secretas via digitação no teclado virtual da TV.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-005 | O controle remoto da TV emite os eventos padrão `KEYCODE_DPAD_UP`, `DOWN`, `LEFT`, `RIGHT` e `CENTER`. | confirmada | Validado no emulador Leanback e em aparelhos Android TV reais. |
| ASM-006 | A Smart TV possui decodificador de hardware H.264 capaz de decodificar pelo menos 2 streams simultâneos (Hero + PiP). | confirmada | Testado em TVs com Android 9.0 ou superior (SoC Amlogic/MediaTek). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-003 | A janela flutuante PiP deve sobrepor aplicativos de streaming de terceiros quando a TV estiver fora do Sentinela? | respondida | Sim, através do serviço de background `OverlayService.kt` quando a permissão `SYSTEM_ALERT_WINDOW` for concedida. |
