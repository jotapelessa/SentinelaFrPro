import { create } from "zustand";

export interface TelemetryData {
  cpu: {
    usage_percent: number;
    temperature_celsius: number;
    cores: number[];
    count: number;
  };
  ram: {
    used_mb: number;
    total_mb: number;
    percent: number;
  };
  disk: {
    path: string;
    used_gb: number;
    free_gb: number;
    total_gb: number;
    percent: number;
  };
  network: {
    rx_kbs: number;
    tx_kbs: number;
  };
  telegram?: {
    configured: boolean;
    paused: boolean;
  };
}

export interface SecurityEvent {
  id?: number | string;
  event_id?: string;
  frigate_event_id?: string;
  camera: string;
  friendly_name?: string;
  label: string;
  sub_label?: string;
  score?: number;
  top_score?: number;
  zone?: string;
  zones?: string[];
  timestamp: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
  snapshot_url?: string;
  snapshot_clean_url?: string;
  clip_url?: string;
  has_clip?: boolean;
  has_snapshot?: boolean;
  retained?: boolean;
  box?: number[];
  data?: Record<string, any>;
}

export interface AuditLogItem {
  id: number;
  action: string;
  module: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  details?: string;
  client_ip?: string;
  created_at: string;
}



export interface Camera {
  id: number;
  name: string;
  friendly_name?: string;
  rtsp_main: string;
  rtsp_sub?: string;
  ip_address?: string;
  onvif_port?: number;
  enabled: boolean;
  zones?: string[] | string | any;
  objects_to_track?: string;
  min_score?: number;
  detect_fps?: number;
  motion_threshold?: number;
  record_mode?: string;
  stream_mode?: "eco" | "mse" | "webrtc" | string;
  eco_fps?: number;
  record_fps?: number;
  record_retain_days?: number;
  record_audio?: boolean;
  notify_telegram?: boolean;
  notify_tv?: boolean;
  notify_audio?: boolean;
  cooldown_seconds?: number;
  live_stats?: {
    camera_fps?: number;
    detection_fps?: number;
    process_fps?: number;
    online?: boolean;
  };
}


export interface DiscoveredDevice {
  ip: string;
  friendly_name?: string;
  protocol?: string;
  port?: number;
  open_ports?: number[];
  services?: string[];
  rtsp_url_hint?: string;
  confidence?: string;
}

export interface ActiveDetection {
  camera: string;
  label: string;
  score: number;
  zone?: string;
  box?: number[];
  timestamp: number;
}

interface SentinelaState {
  telemetry: TelemetryData | null;
  cameras: Camera[];
  events: SecurityEvent[];
  spotlightCamera: Camera | null;
  isScannerOpen: boolean;
  isScanning: boolean;
  scanResults: DiscoveredDevice[];
  recentAlert: SecurityEvent | null;
  wsConnected: boolean;
  activeDetections: Record<string, ActiveDetection>;
  motionStatus: Record<string, boolean>;
  liveObjectCounts: Record<string, Record<string, number>>;
  audioAlertEnabled: boolean;
  showZonesOverlay: boolean;
  
  setTelemetry: (data: TelemetryData) => void;
  setCameras: (cameras: Camera[]) => void;
  setEvents: (events: SecurityEvent[]) => void;
  addEvent: (event: SecurityEvent) => void;
  setSpotlightCamera: (camera: Camera | null) => void;
  setIsScannerOpen: (isOpen: boolean) => void;
  setIsScanning: (isScanning: boolean) => void;
  setScanResults: (results: DiscoveredDevice[]) => void;
  setRecentAlert: (alert: SecurityEvent | null) => void;
  setWsConnected: (connected: boolean) => void;
  setActiveDetection: (cam: string, det: ActiveDetection | null) => void;
  setMotionStatus: (cam: string, motion: boolean) => void;
  setObjectCount: (cam: string, label: string, count: number) => void;
  toggleAudioAlert: () => void;
  toggleZonesOverlay: () => void;
}

export const useSentinelaStore = create<SentinelaState>((set) => ({
  telemetry: {
    cpu: { usage_percent: 8.5, temperature_celsius: 36.8, cores: [8, 9, 7, 10], count: 4 },
    ram: { used_mb: 1840, total_mb: 15800, percent: 11.6 },
    disk: { path: "/media/frigate", used_gb: 62.4, free_gb: 412.6, total_gb: 475.0, percent: 13.1 },
    network: { rx_kbs: 450.2, tx_kbs: 128.4 },
    telegram: { configured: true, paused: false }
  },
  cameras: [],
  events: [],
  spotlightCamera: null,
  isScannerOpen: false,
  isScanning: false,
  scanResults: [],
  recentAlert: null,
  wsConnected: false,
  activeDetections: {},
  motionStatus: {},
  liveObjectCounts: {},
  audioAlertEnabled: true,
  showZonesOverlay: true,

  setTelemetry: (data) => set({ telemetry: data }),
  setCameras: (cameras) => set({ cameras }),
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ 
    events: [event, ...state.events.slice(0, 49)],
    recentAlert: event 
  })),
  setSpotlightCamera: (camera) => set({ spotlightCamera: camera }),
  setIsScannerOpen: (isOpen) => set({ isScannerOpen: isOpen }),
  setIsScanning: (isScanning) => set({ isScanning }),
  setScanResults: (results) => set({ scanResults: results }),
  setRecentAlert: (alert) => set({ recentAlert: alert }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setActiveDetection: (cam, det) => set((state) => {
    const next = { ...state.activeDetections };
    if (det) {
      next[cam] = det;
    } else {
      delete next[cam];
    }
    return { activeDetections: next };
  }),
  setMotionStatus: (cam, motion) => set((state) => ({
    motionStatus: { ...state.motionStatus, [cam]: motion }
  })),
  setObjectCount: (cam, label, count) => set((state) => {
    const currentCam = state.liveObjectCounts[cam] || {};
    return {
      liveObjectCounts: {
        ...state.liveObjectCounts,
        [cam]: { ...currentCam, [label]: count }
      }
    };
  }),
  toggleAudioAlert: () => set((state) => ({ audioAlertEnabled: !state.audioAlertEnabled })),
  toggleZonesOverlay: () => set((state) => ({ showZonesOverlay: !state.showZonesOverlay }))
}));
