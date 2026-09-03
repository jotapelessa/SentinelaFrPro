export interface CameraFeed {
  id: string;
  name: string;
  zone: string;
  resolution: string;
  fps: number;
  bitrate: string;
  codec: string;
  rtspUrl: string;
  isOnline: boolean;
  hasMotion: boolean;
  detectedObject?: string;
  confidence?: number;
  thumbnailUrl: string;
  videoType: 'live' | 'playback';
}

export interface TvDevice {
  id: string;
  name: string;
  room: string;
  ipAddress: string;
  model: string;
  isOnline: boolean;
  isPipActive: boolean;
  activeCameraId?: string;
  lastTestStatus?: 'idle' | 'testing' | 'success' | 'failed';
  lastPingMs: number;
}

export interface CaptureItem {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  type: 'photo' | 'video';
  duration?: string;
  thumbnailUrl: string;
  fileSize: string;
  objectDetected?: string;
}

export interface AiDetectionEvent {
  id: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  label: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

export type BottomNavTab = 'live' | 'captures' | 'settings' | 'master';
