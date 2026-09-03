import { CameraEntity, PipAlert, RecordingClip, SystemLog } from '../types/tv';

export const MOCK_CAMERAS: CameraEntity[] = [
  {
    id: 'cam-01',
    name: 'Portaria Principal 4K',
    channel: 1,
    location: 'Guarita / Acesso Veículos',
    zone: 'Zona Externa A',
    status: 'ONLINE',
    isRecording: true,
    hasPtz: true,
    hasAudio: true,
    hasNightVision: true,
    motionCount: 14,
    thumbnailUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80',
    streamUrl: '',
    telemetry: {
      ip: '192.168.10.101',
      codec: 'H.265 Main 10',
      resolution: '3840x2160 (4K UHD)',
      fps: 24.0,
      bitrateKbps: 8420,
      latencyMs: 32,
      cpuPercent: 18,
      temperatureC: 44.2,
      storageUsageGb: 340.5,
      uptime: '14d 08h 22m'
    },
    detectedObjects: [
      { id: 'det-1', label: 'Pessoa (Segurança)', confidence: 0.98, x: 22, y: 35, width: 14, height: 42, color: '#10B981' },
      { id: 'det-2', label: 'Veículo (Placa: BRA2E19)', confidence: 0.95, x: 55, y: 48, width: 32, height: 38, color: '#06B6D4' }
    ]
  },
  {
    id: 'cam-02',
    name: 'Estacionamento Norte PTZ',
    channel: 2,
    location: 'Pátio Aberto / Vagas VIP',
    zone: 'Zona Externa B',
    status: 'ONLINE',
    isRecording: true,
    hasPtz: true,
    hasAudio: false,
    hasNightVision: true,
    motionCount: 8,
    thumbnailUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    streamUrl: '',
    telemetry: {
      ip: '192.168.10.102',
      codec: 'H.265 High',
      resolution: '2560x1440 (2K QHD)',
      fps: 24.0,
      bitrateKbps: 5800,
      latencyMs: 38,
      cpuPercent: 24,
      temperatureC: 48.0,
      storageUsageGb: 210.8,
      uptime: '22d 11h 05m'
    },
    detectedObjects: [
      { id: 'det-3', label: 'Veículo (Sedan Preto)', confidence: 0.92, x: 38, y: 42, width: 28, height: 36, color: '#06B6D4' }
    ]
  },
  {
    id: 'cam-03',
    name: 'Perímetro Leste IA',
    channel: 3,
    location: 'Cerca Eletrônica / Bosque',
    zone: 'Zona Crítica 01',
    status: 'ALERT',
    isRecording: true,
    hasPtz: false,
    hasAudio: true,
    hasNightVision: true,
    motionCount: 29,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    streamUrl: '',
    telemetry: {
      ip: '192.168.10.103',
      codec: 'H.265 Smart',
      resolution: '3840x2160 (4K UHD)',
      fps: 24.0,
      bitrateKbps: 9100,
      latencyMs: 29,
      cpuPercent: 31,
      temperatureC: 51.5,
      storageUsageGb: 490.2,
      uptime: '09d 04h 50m'
    },
    detectedObjects: [
      { id: 'det-4', label: '⚠️ INTRUSO DETECTADO', confidence: 0.97, x: 62, y: 28, width: 16, height: 50, color: '#EF4444' }
    ]
  },
  {
    id: 'cam-04',
    name: 'Recepção Blindada',
    channel: 4,
    location: 'Hall de Entrada / Catracas',
    zone: 'Zona Interna A',
    status: 'ONLINE',
    isRecording: true,
    hasPtz: false,
    hasAudio: true,
    hasNightVision: false,
    motionCount: 42,
    thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    streamUrl: '',
    telemetry: {
      ip: '192.168.10.104',
      codec: 'H.264 High',
      resolution: '1920x1080 (Full HD)',
      fps: 24.0,
      bitrateKbps: 4200,
      latencyMs: 22,
      cpuPercent: 12,
      temperatureC: 39.1,
      storageUsageGb: 180.0,
      uptime: '45d 02h 19m'
    },
    detectedObjects: [
      { id: 'det-5', label: 'Pessoa (Visitante 04)', confidence: 0.94, x: 40, y: 30, width: 12, height: 48, color: '#10B981' }
    ]
  },
  {
    id: 'cam-05',
    name: 'Data Center & Servidores',
    channel: 5,
    location: 'Rack NVR / Sala Segura 02',
    zone: 'Zona Restrita Nível 4',
    status: 'ONLINE',
    isRecording: true,
    hasPtz: true,
    hasAudio: true,
    hasNightVision: true,
    motionCount: 3,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    streamUrl: '',
    telemetry: {
      ip: '192.168.10.105',
      codec: 'H.265 Lossless',
      resolution: '3840x2160 (4K UHD)',
      fps: 24.0,
      bitrateKbps: 11200,
      latencyMs: 18,
      cpuPercent: 15,
      temperatureC: 36.4,
      storageUsageGb: 820.4,
      uptime: '120d 19h 40m'
    },
    detectedObjects: []
  },
  {
    id: 'cam-06',
    name: 'Docas & Carga Pesada',
    channel: 6,
    location: 'Armazém Logístico Sul',
    zone: 'Zona Industrial',
    status: 'STANDBY',
    isRecording: false,
    hasPtz: true,
    hasAudio: false,
    hasNightVision: true,
    motionCount: 0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    streamUrl: '',
    telemetry: {
      ip: '192.168.10.106',
      codec: 'H.264 Baseline',
      resolution: '1920x1080 (Full HD)',
      fps: 0,
      bitrateKbps: 0,
      latencyMs: 0,
      cpuPercent: 4,
      temperatureC: 34.0,
      storageUsageGb: 95.2,
      uptime: '02d 01h 10m'
    },
    detectedObjects: []
  }
];

export const MOCK_PIP_ALERT: PipAlert = {
  id: 'pip-alert-01',
  cameraId: 'cam-03',
  cameraName: 'Perímetro Leste IA',
  location: 'Cerca Eletrônica / Bosque Leste',
  eventType: 'PERSON_DETECTED',
  eventDescription: 'Intrusão detectada em zona restrita fora do horário permitido.',
  confidence: 0.97,
  timestamp: 'Agora • 10:38:14',
  snapshotUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
  countdownSeconds: 12,
  isActive: true
};

export const MOCK_RECORDINGS: RecordingClip[] = [
  {
    id: 'rec-01',
    cameraId: 'cam-03',
    cameraName: 'Perímetro Leste IA',
    timestamp: 'Hoje • 10:32:00',
    duration: '04m 18s',
    triggerType: 'AI_MOTION',
    sizeMb: 420.5,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'rec-02',
    cameraId: 'cam-01',
    cameraName: 'Portaria Principal 4K',
    timestamp: 'Hoje • 09:45:10',
    duration: '15m 00s',
    triggerType: 'CONTINUOUS',
    sizeMb: 1240.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'rec-03',
    cameraId: 'cam-02',
    cameraName: 'Estacionamento Norte PTZ',
    timestamp: 'Hoje • 08:15:30',
    duration: '02m 45s',
    triggerType: 'AI_MOTION',
    sizeMb: 180.2,
    thumbnailUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'rec-04',
    cameraId: 'cam-04',
    cameraName: 'Recepção Blindada',
    timestamp: 'Hoje • 07:00:00',
    duration: '30m 00s',
    triggerType: 'CONTINUOUS',
    sizeMb: 2150.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
  }
];

export const MOCK_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: '10:38:14.220',
    level: 'CRITICAL',
    source: 'AI_DETECTOR_ENGINE',
    message: '[CAM 03 - Perímetro Leste] Alerta de Intrusão Humana gerado com 97% de confiança. PiP disparado.',
    cameraId: 'cam-03'
  },
  {
    id: 'log-2',
    timestamp: '10:37:55.104',
    level: 'SECURITY',
    source: 'NVR_AUTH',
    message: 'Sessão D-Pad TV autenticada via Tailscale Mesh (100.84.21.9).',
  },
  {
    id: 'log-3',
    timestamp: '10:35:12.890',
    level: 'INFO',
    source: 'RTSP_STREAMER',
    message: 'Fluxo H.265 4K 24fps sincronizado para canal 01 (Bitrate: 8.42 Mbps).',
    cameraId: 'cam-01'
  },
  {
    id: 'log-4',
    timestamp: '10:30:00.000',
    level: 'INFO',
    source: 'STORAGE_HEALTH',
    message: 'Pool de Gravação NVMe/RAID-10 operando a 34% de capacidade (14.2 TB livres).',
  },
  {
    id: 'log-5',
    timestamp: '10:22:40.550',
    level: 'WARN',
    source: 'PTZ_CONTROLLER',
    message: 'Câmera Estacionamento Norte atingiu o limite de rotação Pan 355°.',
    cameraId: 'cam-02'
  }
];
