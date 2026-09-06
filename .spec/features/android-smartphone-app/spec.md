# Spec: Aplicativo Android Smartphone (Sentinela Mobile YouTube Edition)

> feature: android-smartphone-app
> status: pronta

## Contexto

Interface de alta performance para smartphones Android com design inspirado no YouTube Shorts / Obsidian UI, com navegação fluida por toques (`PhoneBottomNavigationBar`), barra superior de status (`PhoneTopBar`), feed vertical de câmeras com zoom tátil de até 5x, galeria de capturas e clipes, central master de dispositivos com aprovação de Smart TVs, conjunto de ferramentas de rede e diagnóstico, visualizador de logs e painel completo de preferências.

## Histórias

### US-011 — Feed Vertical de Câmeras Ao Vivo com Zoom Interativo
Como usuário do smartphone
Quero navegar pelo feed vertical de câmeras com gestos de rolagem e aplicar zoom de até 5x na imagem
Para inspecionar detalhes (placas, rostos) com conforto tátil na tela do celular.

#### AC-016 — Feed Vertical Contínuo e Modal de Zoom 5x
- **Dado** que a aba "Câmeras" (`PhoneLiveCamerasTab`) está ativa
- **Quando** o usuário rolar o feed e clicar no botão de expandir/zoom de uma câmera
- **Então** o diálogo `PhoneZoomCameraDialog` deve abrir com suporte a gestos de pinça (pinch-to-zoom) permitindo ampliação contínua de 1x até 5x com panning suave.

#### AC-017 — Botão Flutuante (FAB) de Alerta Instantâneo e Silenciamento
- **Dado** que o usuário está monitorando as câmeras no smartphone
- **Quando** clicar no Floating Action Button no canto inferior direito
- **Então** o aplicativo deve enviar a requisição `pauseAlerts(60)` para o backend, alternar a cor do botão para âmbar e emitir Toast de confirmação.

### US-012 — Galeria de Capturas com Filtros e Player de Clipes
Como morador utilizando o celular
Quero filtrar as detecções por data/tipo e reproduzir clipes gravados de 10 segundos
Para rever eventos sem precisar acessar o computador.

#### AC-018 — Player de Evidências em Diálogo Flutuante
- **Dado** que a aba "Capturas" (`PhoneCapturesTab`) está aberta
- **Quando** o usuário tocar sobre um cartão de evento de detecção
- **Então** o player `PhoneClipPlayerDialog` deve carregar o vídeo MP4 com controles de play/pause, seekbar e dados da zona de detecção.

### US-013 — Central Master: Gerenciamento de TVs e Dispositivos Pareados
Como usuário administrador do sistema
Quero visualizar todas as Smart TVs e celulares conectados e editar suas permissões de acesso
Para controlar quais aparelhos da casa podem exibir as câmeras ou receber alertas PiP.

#### AC-019 — Edição de Políticas e Permissões de Dispositivos
- **Dado** que o usuário autenticado é Master Admin e acessa a aba "Master" (`PhoneMasterCentralTab`)
- **Quando** tocar em uma Smart TV na lista de dispositivos
- **Então** o diálogo `DeviceConfigEditDialog` deve abrir permitindo autorizar/bloquear câmeras individuais, habilitar/desabilitar PiP e definir tamanho padrão da janela flutuante.

### US-014 — Ferramentas de Diagnóstico e Auditoria de Rede
Como suporte técnico ou instalador
Quero realizar testes de conectividade (ping do Frigate, go2rtc, Mosquitto) e scanner de rede direto pelo app
Para verificar se as câmeras e servidores estão acessíveis via Wi-Fi local ou Tailscale.

#### AC-020 — Painel de Testes Rápidos e Ping do Ecossistema
- **Dado** que a aba "Ferramentas" (`PhoneToolsTab`) está aberta
- **Quando** o usuário acionar o teste de integridade do sistema
- **Então** o app deve consultar o status dos serviços e exibir latência de resposta, taxa de download estimada e checklist visual de saúde do sistema.

### US-015 — Visualizador de Logs e Ajustes de Notificação
Como usuário configurando o aplicativo
Quero monitorar logs do sistema e customizar intervalos de atualização de quadros (Modo Eco vs Modo Fluido)
Para economizar bateria do smartphone ou priorizar taxa máxima de atualização.

#### AC-021 — Ajuste de Taxa de Quadros Eco e Console de Logs
- **Dado** que a aba "Configurações" (`PhoneSettingsTab`) ou "Logs" (`PhoneLogsTab`) está selecionada
- **Quando** o usuário selecionar a taxa de polling desejada (Modo Eco a 10 FPS ou Fluido a 24 FPS)
- **Então** a configuração deve ser gravada em `SentinelaPreferences` e aplicada imediatamente no carregamento dos streams.

## Fora de escopo

- Exibição de janelas sobrepostas PiP em cima de outros apps no smartphone (o PiP automático é recurso exclusivo do Android TV).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-007 | O smartphone possui conectividade de rede com o servidor (IP local `192.168.1.x` ou VPN Tailscale `100.x.x.x`). | confirmada | Validado e alternado dinamicamente nas preferências do app. |
| ASM-008 | O dispositivo roda Android 8.0 (Oreo) ou superior com suporte a Jetpack Compose Material 3. | confirmada | Configurado no `build.gradle.kts` com `minSdk = 26`. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-004 | Dispositivos sem perfil Master Admin devem enxergar a aba Central Master? | respondida | Não; a aba `PhoneMasterCentralTab` só é exibida na barra inferior quando `isMaster == true`. |
