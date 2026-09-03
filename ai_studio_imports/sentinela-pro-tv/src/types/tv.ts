export type CameraStatus = 'ONLINE' | 'STANDBY' | 'ALERT' | 'RECORDING';

export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage
  height: number; // percentage
  color: string;
}

export interface CameraTelemetry {
  ip: string;
  codec: string;
  resolution: string;
  fps: number;
  bitrateKbps: number;
  latencyMs: number;
  cpuPercent: number;
  temperatureC: number;
  storageUsageGb: number;
  uptime: string;
}

export interface CameraEntity {
  id: string;
  name: string;
  channel: number;
  location: string;
  zone: string;
  status: CameraStatus;
  isRecording: boolean;
  hasPtz: boolean;
  hasAudio: boolean;
  hasNightVision: boolean;
  motionCount: number;
  thumbnailUrl: string;
  streamUrl: string;
  telemetry: CameraTelemetry;
  detectedObjects: BoundingBox[];
}

export interface PipAlert {
  id: string;
  cameraId: string;
  cameraName: string;
  location: string;
  eventType: 'PERSON_DETECTED' | 'VEHICLE_INTRUSION' | 'MOTION_ALERT' | 'LINE_CROSSING' | 'TAMPER_ALERT';
  eventDescription: string;
  confidence: number;
  timestamp: string;
  snapshotUrl: string;
  countdownSeconds: number;
  isActive: boolean;
}

export interface RecordingClip {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  duration: string;
  triggerType: 'CONTINUOUS' | 'AI_MOTION' | 'MANUAL' | 'ALARM';
  sizeMb: number;
  thumbnailUrl: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'CRITICAL' | 'SECURITY';
  source: string;
  message: string;
  cameraId?: string;
}

export type TvTab = 'CAMERAS' | 'CAPTURES' | 'TOOLS' | 'LOGS' | 'SETTINGS';

export type TvFocusZone = 'SIDEBAR' | 'HERO' | 'CAROUSEL' | 'GRID' | 'PIP' | 'ACTION_BAR';

export interface TvSettingsState {
  resolution: '4K' | '1080P' | '720P';
  audioFeedback: boolean;
  h265HardwareDecoder: boolean;
  autoPipOnIntrusion: boolean;
  pipTimeoutSeconds: number;
  tailscaleStatus: 'CONNECTED' | 'DISCONNECTED' | 'SYNCHRONIZING';
  tailscaleIp: string;
  dpadSensitivity: 'HIGH' | 'NORMAL' | 'LOW';
  theme: 'TV_OBSIDIAN';
}
