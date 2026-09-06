// Testes de spec da feature android-smartphone-app — gerados por onp-spec scaffold
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const smartphoneScreenFile = path.resolve(
  process.cwd(),
  'android/app/src/main/java/com/sentinela/pro/ui/SmartphoneYouTubeScreen.kt'
);
const repoFile = path.resolve(
  process.cwd(),
  'android/app/src/main/java/com/sentinela/pro/network/SentinelaRepository.kt'
);
const prefsFile = path.resolve(
  process.cwd(),
  'android/app/src/main/java/com/sentinela/pro/data/SentinelaPreferences.kt'
);

// US-011 — Feed Vertical de Câmeras Ao Vivo com Zoom Interativo
test('AC-016: Feed Vertical Contínuo e Modal de Zoom 5x @spec:AC-016', () => {
  // Dado: que a aba "Câmeras" (`PhoneLiveCamerasTab`) está ativa
  // Quando: o usuário rolar o feed e clicar no botão de expandir/zoom de uma câmera
  // Então: o diálogo `PhoneZoomCameraDialog` deve abrir com suporte a gestos de pinça (pinch-to-zoom) permitindo ampliação contínua de 1x até 5x com panning suave.
  assert.ok(fs.existsSync(smartphoneScreenFile), 'SmartphoneYouTubeScreen.kt deve existir');
  const content = fs.readFileSync(smartphoneScreenFile, 'utf-8');
  assert.ok(
    content.includes('PhoneZoomCameraDialog') || content.includes('zoomedCamera'),
    'Deve implementar modal de zoom da câmera'
  );
  assert.ok(
    content.includes('graphicsLayer') || content.includes('detectTransformGestures') || content.includes('zoom'),
    'Deve possuir suporte a zoom e transformação de gestos'
  );
});

// US-011 — Feed Vertical de Câmeras Ao Vivo com Zoom Interativo
test('AC-017: Botão Flutuante (FAB) de Alerta Instantâneo e Silenciamento @spec:AC-017', () => {
  // Dado: que o usuário está monitorando as câmeras no smartphone
  // Quando: clicar no Floating Action Button no canto inferior direito
  // Então: o aplicativo deve enviar a requisição `pauseAlerts(60)` para o backend, alternar a cor do botão para âmbar e emitir Toast de confirmação.
  assert.ok(fs.existsSync(smartphoneScreenFile), 'SmartphoneYouTubeScreen.kt deve existir');
  const screenContent = fs.readFileSync(smartphoneScreenFile, 'utf-8');
  assert.ok(
    screenContent.includes('FloatingActionButton'),
    'Deve possuir FloatingActionButton no layout'
  );

  assert.ok(fs.existsSync(repoFile), 'SentinelaRepository.kt deve existir');
  const repoContent = fs.readFileSync(repoFile, 'utf-8');
  assert.ok(
    repoContent.includes('pauseAlerts'),
    'SentinelaRepository deve implementar o método pauseAlerts'
  );
});

// US-012 — Galeria de Capturas com Filtros e Player de Clipes
test('AC-018: Player de Evidências em Diálogo Flutuante @spec:AC-018', () => {
  // Dado: que a aba "Capturas" (`PhoneCapturesTab`) está aberta
  // Quando: o usuário tocar sobre um cartão de evento de detecção
  // Então: o player `PhoneClipPlayerDialog` deve carregar o vídeo MP4 com controles de play/pause, seekbar e dados da zona de detecção.
  assert.ok(fs.existsSync(smartphoneScreenFile), 'SmartphoneYouTubeScreen.kt deve existir');
  const content = fs.readFileSync(smartphoneScreenFile, 'utf-8');
  assert.ok(
    content.includes('PhoneClipPlayerDialog') || content.includes('selectedClipEvent'),
    'Deve implementar diálogo para reprodução de clipe de evidência'
  );
});

// US-013 — Central Master: Gerenciamento de TVs e Dispositivos Pareados
test('AC-019: Edição de Políticas e Permissões de Dispositivos @spec:AC-019', () => {
  // Dado: que o usuário autenticado é Master Admin e acessa a aba "Master" (`PhoneMasterCentralTab`)
  // Quando: tocar em uma Smart TV na lista de dispositivos
  // Então: o diálogo `DeviceConfigEditDialog` deve abrir permitindo autorizar/bloquear câmeras individuais, habilitar/desabilitar PiP e definir tamanho padrão da janela flutuante.
  assert.ok(fs.existsSync(smartphoneScreenFile), 'SmartphoneYouTubeScreen.kt deve existir');
  const content = fs.readFileSync(smartphoneScreenFile, 'utf-8');
  assert.ok(
    content.includes('DeviceConfigEditDialog') || content.includes('editingDevice'),
    'Deve implementar DeviceConfigEditDialog para gerenciar permissões de TVs e clientes'
  );
});

// US-014 — Ferramentas de Diagnóstico e Auditoria de Rede
test('AC-020: Painel de Testes Rápidos e Ping do Ecossistema @spec:AC-020', () => {
  // Dado: que a aba "Ferramentas" (`PhoneToolsTab`) está aberta
  // Quando: o usuário acionar o teste de integridade do sistema
  // Então: o app deve consultar o status dos serviços e exibir latência de resposta, taxa de download estimada e checklist visual de saúde do sistema.
  assert.ok(fs.existsSync(smartphoneScreenFile), 'SmartphoneYouTubeScreen.kt deve existir');
  const content = fs.readFileSync(smartphoneScreenFile, 'utf-8');
  assert.ok(
    content.includes('PhoneToolsTab'),
    'Deve conter a aba PhoneToolsTab com diagnósticos e ferramentas'
  );
});

// US-015 — Visualizador de Logs e Ajustes de Notificação
test('AC-021: Ajuste de Taxa de Quadros Eco e Console de Logs @spec:AC-021', () => {
  // Dado: que a aba "Configurações" (`PhoneSettingsTab`) ou "Logs" (`PhoneLogsTab`) está selecionada
  // Quando: o usuário selecionar a taxa de polling desejada (Modo Eco a 10 FPS ou Fluido a 24 FPS)
  // Então: a configuração deve ser gravada em `SentinelaPreferences` e aplicada imediatamente no carregamento dos streams.
  assert.ok(fs.existsSync(smartphoneScreenFile), 'SmartphoneYouTubeScreen.kt deve existir');
  const screenContent = fs.readFileSync(smartphoneScreenFile, 'utf-8');
  assert.ok(
    screenContent.includes('PhoneSettingsTab') && screenContent.includes('PhoneLogsTab'),
    'Deve conter PhoneSettingsTab e PhoneLogsTab'
  );

  assert.ok(fs.existsSync(prefsFile), 'SentinelaPreferences.kt deve existir');
});
