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
  label: string;
  score?: number;
  top_score?: number;
  zone?: string;
  timestamp: string;
  snapshot_url?: string;
  clip_url?: string;
  has_clip?: boolean;
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
  zones?: string[];
  objects_to_track?: string;
  min_score?: number;
  record_mode?: string;
  record_retain_days?: number;
  record_audio?: boolean;
  notify_telegram?: boolean;
  notify_tv?: boolean;
  notify_audio?: boolean;
  cooldown_seconds?: number;
}


export interface DiscoveredDevice {
  ip: string;
  protocol?: string;
  port?: number;
  open_ports?: number[];
  services?: string[];
  rtsp_url_hint?: string;
  confidence?: string;
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
}

export const useSentinelaStore = create<SentinelaState>((set) => ({
  telemetry: {
    cpu: { usage_percent: 8.5, temperature_celsius: 36.8, cores: [8, 9, 7, 10], count: 4 },
    ram: { used_mb: 1840, total_mb: 15800, percent: 11.6 },
    disk: { path: "/media/frigate", used_gb: 62.4, free_gb: 412.6, total_gb: 475.0, percent: 13.1 },
    network: { rx_kbs: 450.2, tx_kbs: 128.4 },
    telegram: { configured: true, paused: false }
  },
  cameras: [
    {
      id: 1,
      name: "camera_principal",
      friendly_name: "Câmera Principal (IP 192.168.1.6)",
      rtsp_main: "rtsp://192.168.1.6:8554/stream",
      ip_address: "192.168.1.6",
      enabled: true,
      zones: ["zona_monitoramento"]
    }
  ],
  events: [],
  spotlightCamera: null,
  isScannerOpen: false,
  isScanning: false,
  scanResults: [],
  recentAlert: null,
  wsConnected: false,

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
  setWsConnected: (connected) => set({ wsConnected: connected })
}));
