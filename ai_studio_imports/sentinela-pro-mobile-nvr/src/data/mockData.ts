import { CameraFeed, TvDevice, CaptureItem } from '../types';

export const INITIAL_CAMERAS: CameraFeed[] = [
  {
    id: 'cam_01',
    name: 'Portão Principal & Garagem',
    zone: 'Entrada Frontal',
    resolution: '4K HDR',
    fps: 24,
    bitrate: '4.8 Mbps',
    codec: 'H.265 / HEVC (GPU)',
    rtspUrl: 'rtsp://100.82.14.10:8554/live/portao_4k',
    isOnline: true,
    hasMotion: true,
    detectedObject: 'Pessoa Detectada (98.4%)',
    confidence: 0.984,
    thumbnailUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80',
    videoType: 'live'
  },
  {
    id: 'cam_02',
    name: 'Piscina & Área Gourmet',
    zone: 'Quintal dos Fundos',
    resolution: '2K 1440p',
    fps: 24,
    bitrate: '3.2 Mbps',
    codec: 'H.265 / HEVC (GPU)',
    rtspUrl: 'rtsp://100.82.14.11:8554/live/piscina_2k',
    isOnline: true,
    hasMotion: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    videoType: 'live'
  },
  {
    id: 'cam_03',
    name: 'Corredor Lateral Oeste',
    zone: 'Perímetro Sensível',
    resolution: '1080p 60fps',
    fps: 24,
    bitrate: '2.5 Mbps',
    codec: 'H.264 High (GPU)',
    rtspUrl: 'rtsp://100.82.14.12:8554/live/corredor_oeste',
    isOnline: true,
    hasMotion: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    videoType: 'live'
  },
  {
    id: 'cam_04',
    name: 'Hall de Entrada & Sala',
    zone: 'Interno Térreo',
    resolution: '2K 1440p',
    fps: 24,
    bitrate: '3.0 Mbps',
    codec: 'H.265 / HEVC (GPU)',
    rtspUrl: 'rtsp://100.82.14.13:8554/live/hall_sala',
    isOnline: true,
    hasMotion: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    videoType: 'live'
  }
];

export const INITIAL_TVS: TvDevice[] = [
  {
    id: 'tv_01',
    name: 'Sala de Estar (LG OLED 65")',
    room: 'Living Principal',
    ipAddress: '192.168.1.120',
    model: 'webOS 23 4K HDR',
    isOnline: true,
    isPipActive: false,
    lastPingMs: 14
  },
  {
    id: 'tv_02',
    name: 'Suíte Master (Samsung QLED 55")',
    room: 'Quarto Casal',
    ipAddress: '192.168.1.121',
    model: 'Tizen OS 7.0',
    isOnline: true,
    isPipActive: false,
    lastPingMs: 18
  },
  {
    id: 'tv_03',
    name: 'Área Gourmet (TCL Roku 50")',
    room: 'Churrasqueira',
    ipAddress: '192.168.1.122',
    model: 'Roku TV 4K',
    isOnline: true,
    isPipActive: false,
    lastPingMs: 22
  },
  {
    id: 'tv_04',
    name: 'Escritório (Android TV 43")',
    room: 'Home Office',
    ipAddress: '192.168.1.123',
    model: 'Google TV 12',
    isOnline: false,
    isPipActive: false,
    lastPingMs: 999
  }
];

export const INITIAL_CAPTURES: CaptureItem[] = [
  {
    id: 'cap_01',
    cameraId: 'cam_01',
    cameraName: 'Portão Principal & Garagem',
    timestamp: 'Hoje, 11:28:44',
    type: 'photo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80',
    fileSize: '3.4 MB (4K UHD)',
    objectDetected: 'Pessoa Detectada'
  },
  {
    id: 'cap_02',
    cameraId: 'cam_01',
    cameraName: 'Portão Principal & Garagem',
    timestamp: 'Hoje, 11:15:20',
    type: 'video',
    duration: '00:15',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80',
    fileSize: '18.2 MB (H.265)',
    objectDetected: 'Veículo Detectado'
  },
  {
    id: 'cap_03',
    cameraId: 'cam_02',
    cameraName: 'Piscina & Área Gourmet',
    timestamp: 'Hoje, 10:45:00',
    type: 'photo',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    fileSize: '2.8 MB (2K HDR)'
  }
];
