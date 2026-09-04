"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSentinelaStore } from "@/store/useSentinelaStore";
import {
  Tv, Tablet, Smartphone, Play, Plus, Trash2, Check, AlertCircle,
  RefreshCw, X, Radio, Camera, ShieldCheck, ShieldAlert, Wifi, WifiOff,
  Cast, Info, Sliders, Search, Copy, Cpu, Activity, Bell, BellOff,
  Sparkles, Monitor, CheckCircle2, Clock
} from "lucide-react";

interface PairedDevice {
  id: number;
  device_identifier: string;
  friendly_name: string;
  device_type: string;
  ip_address: string;
  tailscale_ip?: string;
  permission_status: "allowed" | "blocked" | "paused";
  allowed_cameras?: string[];
  allowed_events?: string[];
  allow_recordings?: boolean;
  allow_live_stream?: boolean;
  allow_pip_alerts?: boolean;
  allow_restart_containers?: boolean;
  allow_reboot_server?: boolean;
  pip_default_size?: string;
  pip_duration_seconds?: number;
  is_master_admin?: boolean;
  mac_address?: string;
  connection_type?: string;
  network_speed_mbps?: number;
  app_version?: string;
  device_model?: string;
  recent_logs?: string | string[];
  last_seen?: string;
}

interface DeviceHealth {
  id: number;
  name: string;
  ip: string;
  online: boolean;
  last_seen?: string;
}

export default function ScreensPage() {
  const { cameras, setCameras } = useSentinelaStore();
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [healthMap, setHealthMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingPiP, setTestingPiP] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "online" | "tv" | "mobile" | "pip">("all");

  // Selected camera for test PiP broadcast
  const [selectedCam, setSelectedCam] = useState<string>("camera_principal");

  // Scanner State
  const [scanningTVs, setScanningTVs] = useState(false);
  const [discoveredTVs, setDiscoveredTVs] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    friendly_name: "",
    device_type: "android_tv",
    ip_address: "",
    tailscale_ip: ""
  });

  // Kiosk Mode State
  const [kioskMode, setKioskMode] = useState(false);

  // Manage Device State
  const [managingDevice, setManagingDevice] = useState<PairedDevice | null>(null);
  const [deviceDiagnostics, setDeviceDiagnostics] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // Toast Helper
  const showToast = useCallback((text: string, type: "success" | "error" | "info" = "info", duration = 5000) => {
    setTestResult({ text, type });
    setTimeout(() => {
      setTestResult((current) => (current?.text === text ? null : current));
    }, duration);
  }, []);

  // Fetch functions with background-silent support (prevents loading flash & DOM thrashing)
  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/cameras/`);
      if (res.ok) {
        const data = await res.json();
        setCameras(data);
      }
    } catch (e) {
      console.error("Failed to fetch cameras:", e);
    }
  }, [apiUrl, setCameras]);

  const fetchDevices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/devices/`);
      if (res.ok) {
        const data: PairedDevice[] = await res.json();
        setDevices(data);
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiUrl]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/devices/health`);
      if (res.ok) {
        const healthList: DeviceHealth[] = await res.json();
        const map: Record<number, boolean> = {};
        healthList.forEach((h) => {
          map[h.id] = h.online;
        });
        setHealthMap(map);
      }
    } catch (e) {
      console.error("Health check error:", e);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchDevices(false);
    fetchHealth();
    fetchCameras();

    // Background silent polling (never triggers global loading state)
    const interval = setInterval(() => {
      fetchHealth();
      fetchDevices(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchDevices, fetchHealth, fetchCameras]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Humanize relative time
  const formatLastSeen = (isoStr?: string) => {
    if (!isoStr) return "Desconhecido";
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 15) return "Online agora";
      if (diffSec < 60) return `há ${diffSec}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `há ${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `há ${diffHr}h`;
      return `há ${Math.floor(diffHr / 24)}d`;
    } catch {
      return "Recente";
    }
  };

  // Quick Direct Actions in Card
  const togglePermissionQuick = async (device: PairedDevice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = device.permission_status === "allowed" ? "blocked" : "allowed";
    
    // Optimistic UI update
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, permission_status: nextStatus } : d))
    );

    try {
      const res = await fetch(`${apiUrl}/devices/${device.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_status: nextStatus })
      });
      if (!res.ok) throw new Error("Falha ao atualizar status");
      showToast(
        nextStatus === "allowed"
          ? `✅ ${device.friendly_name} foi autorizado!`
          : `🔒 ${device.friendly_name} foi bloqueado temporariamente.`,
        "success",
        3500
      );
    } catch (err) {
      console.error(err);
      // Revert on error
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, permission_status: device.permission_status } : d))
      );
      showToast(`Erro ao alterar status de ${device.friendly_name}.`, "error");
    }
  };

  const togglePipQuick = async (device: PairedDevice, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentPip = device.allow_pip_alerts !== false;
    const nextPip = !currentPip;

    // Optimistic UI update
    setDevices((prev) =>
      prev.map((d) => (d.id === device.id ? { ...d, allow_pip_alerts: nextPip } : d))
    );

    try {
      const res = await fetch(`${apiUrl}/devices/${device.id}/toggle-pip`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Erro no toggle PiP");
      showToast(
        nextPip
          ? `🔔 Notificações PiP ATIVADAS para ${device.friendly_name}`
          : `🔕 Notificações PiP DESATIVADAS para ${device.friendly_name}`,
        "success",
        3500
      );
    } catch (err) {
      console.error(err);
      // Revert on error
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, allow_pip_alerts: currentPip } : d))
      );
      showToast("Falha ao alternar alertas PiP.", "error");
    }
  };

  // Test single specific TV
  const handleTestSingleDevice = async (device: PairedDevice) => {
    setTestingDeviceId(device.id);
    try {
      const res = await fetch(`${apiUrl}/devices/${device.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: selectedCam })
      });
      const data = await res.json();
      if (data.confirmed || data.status === "success") {
        showToast(`🎉 Alerta PiP enviado com sucesso para "${device.friendly_name}"!`, "success", 5000);
      } else {
        showToast(`⚠️ ${data.message || "Aviso ao disparar PiP"}`, "info", 5000);
      }
    } catch {
      showToast(`⚠️ Erro de comunicação com ${device.friendly_name}.`, "error", 5000);
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Broadcast test to all TVs
  const handleTestPiPBroadcast = async () => {
    setTestingPiP(true);
    try {
      const res = await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: selectedCam, label: "intrusao_detectada" })
      });
      const data = await res.json();
      if (data.dispatched_count > 0) {
        showToast(`🎉 Alerta PiP transmitido com sucesso para ${data.dispatched_count} tela(s)!`, "success", 5000);
      } else {
        showToast("⚠️ Comando enviado. Verifique se as TVs estão ligadas na rede.", "info", 5000);
      }
    } catch {
      showToast("⚠️ Erro ao disparar transmissão global.", "error", 5000);
    } finally {
      setTestingPiP(false);
    }
  };

  const handleToggleMaster = async (device: PairedDevice) => {
    try {
      const res = await fetch(`${apiUrl}/devices/${device.device_identifier}/toggle-master`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          data.is_master_admin
            ? `⭐ Permissões MASTER VIP concedidas para ${device.friendly_name}!`
            : `🔒 Permissões MASTER revogadas de ${device.friendly_name}.`,
          "success",
          5000
        );
        fetchDevices(true);
      }
    } catch (e) {
      console.error("Failed to toggle master:", e);
      showToast("⚠️ Erro ao alterar privilégios master.", "error");
    }
  };

  const handleBatchTest = async (testType: string) => {
    setTestingPiP(true);
    try {
      const res = await fetch(`${apiUrl}/devices/batch-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_type: testType,
          camera_name: selectedCam,
          label: "TESTE EM LOTE SENTINELA"
        })
      });
      const data = await res.json();
      showToast(`🚀 Teste em lote (${testType}) executado em ${data.total} dispositivo(s)!`, "success", 5000);
    } catch (e) {
      console.error("Batch test failed:", e);
      showToast("⚠️ Falha ao executar teste em lote.", "error");
    } finally {
      setTestingPiP(false);
    }
  };

  const handleDeleteDevice = async (id: number, name: string) => {
    if (!confirm(`Deseja realmente remover a tela "${name}" da lista?`)) return;
    try {
      await fetch(`${apiUrl}/devices/${id}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      showToast(`Dispositivo "${name}" removido com sucesso.`, "info", 3500);
    } catch (err) {
      console.error("Failed to delete device:", err);
      showToast("Falha ao excluir dispositivo.", "error");
    }
  };

  const handleScanTVs = async () => {
    setScanningTVs(true);
    try {
      const res = await fetch(`${apiUrl}/devices/discover`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredTVs(data);
        if (data.length > 0) {
          showToast(`🔍 ${data.length} Smart TV(s) / Chromecast localizados na rede local!`, "success", 6000);
        } else {
          showToast("Nenhuma Smart TV respondeu via SSDP/mDNS no momento.", "info", 5000);
        }
      }
    } catch (e) {
      console.error("Failed to scan TVs:", e);
      showToast("Erro ao escanear a rede local.", "error");
    } finally {
      setScanningTVs(false);
    }
  };

  const handleQuickPair = async (tv: any) => {
    try {
      const identifier = `tv_${tv.friendly_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const res = await fetch(`${apiUrl}/devices/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_identifier: identifier,
          friendly_name: tv.friendly_name,
          device_type: tv.device_type,
          ip_address: tv.ip,
          tailscale_ip: null,
          permission_status: "allowed"
        })
      });

      if (res.ok) {
        setDiscoveredTVs((prev) => prev.filter((t) => t.ip !== tv.ip));
        await fetchDevices(true);
        await fetchHealth();
        showToast(`🎉 "${tv.friendly_name}" pareada com sucesso!`, "success", 4000);
      }
    } catch (err) {
      console.error("Failed to quick pair:", err);
      showToast("Erro ao parear TV.", "error");
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.friendly_name || !newDevice.ip_address) return;

    try {
      const identifier = `dev_${newDevice.friendly_name.toLowerCase().replace(/\s+/g, "_")}_${Math.floor(Math.random() * 1000)}`;
      const res = await fetch(`${apiUrl}/devices/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_identifier: identifier,
          friendly_name: newDevice.friendly_name,
          device_type: newDevice.device_type,
          ip_address: newDevice.ip_address,
          tailscale_ip: newDevice.tailscale_ip || null,
          permission_status: "allowed"
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewDevice({ friendly_name: "", device_type: "android_tv", ip_address: "", tailscale_ip: "" });
        await fetchDevices(true);
        await fetchHealth();
        showToast("✅ Novo dispositivo cadastrado com sucesso!", "success", 4000);
      }
    } catch (err) {
      console.error("Failed to add device:", err);
      showToast("Falha ao salvar dispositivo.", "error");
    }
  };

  const handleManageDevice = (device: PairedDevice) => {
    const effectiveAllowedCameras = device.allowed_cameras && device.allowed_cameras.length > 0
      ? device.allowed_cameras
      : cameras.map(c => c.name);

    const allEvents = ["person", "car", "motorcycle", "dog", "cat", "bus"];
    const effectiveAllowedEvents = device.allowed_events && device.allowed_events.length > 0
      ? device.allowed_events
      : allEvents;

    setManagingDevice({
      ...device,
      allowed_cameras: effectiveAllowedCameras,
      allowed_events: effectiveAllowedEvents
    });
    setDeviceDiagnostics(null);
  };

  const runDiagnostics = async (deviceId: number) => {
    setRunningDiagnostics(true);
    try {
      const res = await fetch(`${apiUrl}/devices/${deviceId}/diagnostics`);
      if (res.ok) {
        setDeviceDiagnostics(await res.json());
      }
    } catch (e) {
      console.error(e);
      showToast("Falha ao coletar diagnóstico de rede.", "error");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => healthMap[d.id] ?? true).length;
    const pipActive = devices.filter((d) => d.allow_pip_alerts !== false && d.permission_status === "allowed").length;
    const masters = devices.filter((d) => d.is_master_admin).length;
    return { total, online, pipActive, masters };
  }, [devices, healthMap]);

  // Filtered devices list with memoization
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Search matching
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const nameMatch = device.friendly_name?.toLowerCase().includes(query);
        const ipMatch = device.ip_address?.toLowerCase().includes(query);
        const tailscaleMatch = device.tailscale_ip?.toLowerCase().includes(query);
        const modelMatch = device.device_model?.toLowerCase().includes(query);
        const typeMatch = device.device_type?.toLowerCase().includes(query);
        if (!nameMatch && !ipMatch && !tailscaleMatch && !modelMatch && !typeMatch) {
          return false;
        }
      }

      // Filter chips
      const isOnline = healthMap[device.id] ?? true;
      if (activeFilter === "online" && !isOnline) return false;
      if (activeFilter === "tv" && !["android_tv", "chromecast", "google_tv", "tcl", "lg_webos", "samsung_tizen"].includes(device.device_type)) return false;
      if (activeFilter === "mobile" && !["smartphone", "tablet"].includes(device.device_type)) return false;
      if (activeFilter === "pip" && device.allow_pip_alerts === false) return false;

      return true;
    });
  }, [devices, searchQuery, activeFilter, healthMap]);

  // Platform style resolver
  const getDeviceBadge = (type: string) => {
    switch (type) {
      case "android_tv":
      case "tcl":
      case "google_tv":
        return {
          label: "Android TV 4K",
          icon: <Tv className="w-4 h-4 text-cyan-400" />,
          badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
          cardBorder: "hover:border-cyan-500/50 hover:shadow-cyan-500/10"
        };
      case "chromecast":
        return {
          label: "Google Cast",
          icon: <Cast className="w-4 h-4 text-indigo-400" />,
          badgeClass: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
          cardBorder: "hover:border-indigo-500/50 hover:shadow-indigo-500/10"
        };
      case "smartphone":
        return {
          label: "Smartphone Mobile",
          icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
          badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
          cardBorder: "hover:border-emerald-500/50 hover:shadow-emerald-500/10"
        };
      case "tablet":
        return {
          label: "Tablet / Painel",
          icon: <Tablet className="w-4 h-4 text-teal-400" />,
          badgeClass: "bg-teal-500/10 text-teal-300 border-teal-500/30",
          cardBorder: "hover:border-teal-500/50 hover:shadow-teal-500/10"
        };
      default:
        return {
          label: "Web Client / Kiosk",
          icon: <Monitor className="w-4 h-4 text-amber-400" />,
          badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
          cardBorder: "hover:border-amber-500/50 hover:shadow-amber-500/10"
        };
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-5 rounded-3xl glass-panel border border-slate-800/80 shadow-2xl bg-gradient-to-r from-slate-900/90 via-obsidian-950/80 to-slate-900/90">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-wide">
                Telas & Notificações Picture-in-Picture
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PiP Ultra Gateway
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                v001.000.000.052
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Controle avançado de transmissão flutuante para Smart TVs, Chromecasts e Smartphones com zero delay.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-end">
          {/* Camera Picker */}
          <div className="flex items-center gap-2 bg-obsidian-950/80 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Câmera Teste:</span>
            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              className="bg-transparent text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                  {c.friendly_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                setKioskMode(true);
              } else {
                document.exitFullscreen().catch(() => {});
                setKioskMode(false);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
            title="Modo Painel de Portaria em Tela Cheia"
          >
            <Tablet className="w-4 h-4" />
            <span className="hidden sm:inline">{kioskMode ? "Sair Quiosque" : "Modo Quiosque"}</span>
          </button>

          <button
            disabled={scanningTVs}
            onClick={handleScanTVs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${scanningTVs ? "animate-spin" : ""}`} />
            <span>{scanningTVs ? "Buscando..." : "Escanear TVs"}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Adicionar</span>
          </button>

          <button
            disabled={testingPiP}
            onClick={() => handleBatchTest("simulated_detection")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all disabled:opacity-50"
            title="Simula um evento de detecção de pessoa com IA para todas as telas"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Simular IA</span>
          </button>

          <button
            disabled={testingPiP}
            onClick={handleTestPiPBroadcast}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-obsidian-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{testingPiP ? "Transmitindo..." : "Testar em Todas as TVs"}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Telas</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{stats.total}</h3>
            <p className="text-[10px] text-slate-500">Dispositivos cadastrados</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-cyan-400">
            <Tv className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telas Online</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-0.5">{stats.online}</h3>
            <p className="text-[10px] text-emerald-500/80 font-mono">Conectadas na rede</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alertas PiP Ativos</p>
            <h3 className="text-2xl font-black text-cyan-400 mt-0.5">{stats.pipActive}</h3>
            <p className="text-[10px] text-cyan-500/80 font-mono">Prontas para pop-up</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Master VIPs</p>
            <h3 className="text-2xl font-black text-amber-400 mt-0.5">{stats.masters}</h3>
            <p className="text-[10px] text-amber-500/80 font-mono">Com direitos root/app</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Discovered TVs Banner */}
      {discoveredTVs.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-950/60 to-slate-900/90 border border-cyan-500/40 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-cyan-300 flex items-center gap-2.5">
              <Tv className="w-5 h-5 text-cyan-400 animate-pulse" />
              Smart TVs & Chromecasts Encontrados na Rede ({discoveredTVs.length})
            </h2>
            <button
              onClick={() => setDiscoveredTVs([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Dispensar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {discoveredTVs.map((tv) => (
              <div
                key={tv.ip}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg"
              >
                <div>
                  <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{tv.friendly_name}</span>
                  </h3>
                  <p className="text-[11px] font-mono text-cyan-300 mt-0.5">IP: {tv.ip}</p>
                  <p className="text-[10px] text-slate-400">Tipo: {tv.device_type} • {tv.services?.join(", ") || "DLNA / UPnP"}</p>
                </div>
                <button
                  onClick={() => handleQuickPair(tv)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black text-xs shadow-md shadow-cyan-500/20 whitespace-nowrap transition-all"
                >
                  Parear TV ⚡
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Interactive Feedback Toast */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-2xl transition-all animate-fadeIn ${
            testResult.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : testResult.type === "error"
              ? "bg-rose-950/80 border-rose-500/40 text-rose-300"
              : "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {testResult.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : testResult.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            )}
            <span>{testResult.text}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl glass-panel border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, IP, modelo..."
            className="w-full bg-obsidian-950/80 border border-slate-800 text-white rounded-xl pl-9 pr-8 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: "all", label: `Todas (${devices.length})` },
            { id: "online", label: `Online (${stats.online})` },
            { id: "tv", label: "Smart TVs" },
            { id: "mobile", label: "Mobile" },
            { id: "pip", label: "PiP Ativo" }
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === chip.id
                  ? "bg-cyan-500 text-obsidian-950 shadow-md shadow-cyan-500/20"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60"
              }`}
            >
              {chip.label}
            </button>
          ))}

          <button
            onClick={async () => {
              if (!confirm("Deseja limpar telas fictícias ou inativas? Aparelhos reais reaparecerão no próximo heartbeat.")) return;
              try {
                const res = await fetch(`${apiUrl}/devices/all/cleanup`, { method: "DELETE" });
                if (res.ok) {
                  await fetchDevices(true);
                  showToast("Telas inativas limpas com sucesso!", "info");
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all ml-auto sm:ml-2"
            title="Limpa dispositivos inativos"
          >
            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 && !loading ? (
        <div className="p-16 text-center glass-panel rounded-3xl border border-dashed border-slate-800 space-y-3">
          <Tv className="w-14 h-14 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-slate-200">
            {searchQuery || activeFilter !== "all"
              ? "Nenhuma tela corresponde ao filtro de busca atual"
              : "Nenhuma Smart TV ou tela pareada no momento"}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || activeFilter !== "all"
              ? "Experimente alterar os termos da busca ou limpar os filtros."
              : "Clique em 'Escanear TVs' para localizar aparelhos na rede ou cadastre manualmente."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDevices.map((device) => {
            const isAllowed = device.permission_status === "allowed";
            const isOnline = healthMap[device.id] ?? true;
            const isTesting = testingDeviceId === device.id;
            const pipEnabled = device.allow_pip_alerts !== false && isAllowed;
            const badge = getDeviceBadge(device.device_type);

            return (
              <div
                key={device.id}
                className={`group relative p-5 rounded-3xl glass-panel border transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl hover:-translate-y-0.5 ${badge.cardBorder} ${
                  isAllowed
                    ? "border-slate-800/90 bg-slate-900/60"
                    : "border-rose-500/30 bg-rose-950/10"
                }`}
              >
                {/* Platform Tag & Status Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Platform Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${badge.badgeClass}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      {device.is_master_admin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black tracking-wider animate-pulse">
                          ⭐ VIP MASTER
                        </span>
                      )}
                    </div>

                    {/* Quick Permission Toggle Switch (Allowed / Blocked) */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                        {isAllowed ? "Ativo" : "Bloqueado"}
                      </span>
                      <button
                        onClick={(e) => togglePermissionQuick(device, e)}
                        title={isAllowed ? "Clique para bloquear temporariamente esta tela" : "Clique para autorizar esta tela"}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          isAllowed ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            isAllowed ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Device Title & Connectivity */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-base text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                        {device.friendly_name}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-500 truncate max-w-[220px]">
                        ID: {device.device_identifier}
                      </p>
                    </div>

                    {/* Online / Offline Ping Pill */}
                    <div className="flex flex-col items-end gap-0.5">
                      <div
                        className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                        <span className="font-bold">{isOnline ? "Online" : "Sem Resposta"}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatLastSeen(device.last_seen)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Device Hardware, Network and IPs */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
                  {/* IP Addresses with 1-click Copy */}
                  <div className="grid grid-cols-2 gap-2 bg-obsidian-950/60 p-2.5 rounded-2xl border border-slate-800/60 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">IP Local (LAN)</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-slate-200 font-bold truncate">{device.ip_address}</span>
                        <button
                          onClick={() => handleCopy(device.ip_address, `ip_${device.id}`)}
                          className="text-slate-500 hover:text-cyan-400 p-0.5 rounded"
                          title="Copiar IP Local"
                        >
                          {copiedField === `ip_${device.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">IP Tailscale</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-cyan-300 font-bold truncate">{device.tailscale_ip || "LAN Local"}</span>
                        {device.tailscale_ip && (
                          <button
                            onClick={() => handleCopy(device.tailscale_ip!, `ts_${device.id}`)}
                            className="text-slate-500 hover:text-cyan-400 p-0.5 rounded"
                            title="Copiar IP Tailscale"
                          >
                            {copiedField === `ts_${device.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hardware Specs Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {device.connection_type && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-[10px] font-mono text-cyan-300 font-bold">
                        📶 {device.connection_type.toUpperCase()} {device.network_speed_mbps ? `(${Math.round(device.network_speed_mbps)} Mbps)` : ""}
                      </span>
                    )}
                    {device.app_version && (
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-mono text-indigo-300 font-bold">
                        {device.app_version}
                      </span>
                    )}
                    {device.device_model && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[10px] text-slate-300 font-medium truncate max-w-[150px]">
                        {device.device_model}
                      </span>
                    )}
                  </div>

                  {/* Direct PiP & Policy Quick Status */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/50">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">Alertas PiP</span>
                        <span className={`text-[11px] font-bold ${pipEnabled ? "text-cyan-300" : "text-slate-500"}`}>
                          {pipEnabled ? `Ativo (${device.pip_duration_seconds || 10}s)` : "Silenciado"}
                        </span>
                      </div>
                      <button
                        onClick={(e) => togglePipQuick(device, e)}
                        title={pipEnabled ? "Desativar alertas PiP nesta tela" : "Ativar alertas PiP nesta tela"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          pipEnabled
                            ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                            : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                        }`}
                      >
                        {pipEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">Câmeras</span>
                      <span className="text-[11px] font-bold text-emerald-400">
                        {device.allowed_cameras && device.allowed_cameras.length > 0
                          ? `${device.allowed_cameras.length} autorizada(s)`
                          : "Todas (Livre)"}
                      </span>
                    </div>
                  </div>

                  {/* Remote Admin Privileges Badges */}
                  {(device.allow_restart_containers || device.allow_reboot_server) && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-950/20 border border-amber-800/40 px-2 py-1 rounded-xl">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      <span>Privilégios Admin: {device.allow_restart_containers ? "Docker" : ""} {device.allow_reboot_server ? "+ Reboot" : ""}</span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 flex items-center gap-2">
                    {/* Test PiP Button */}
                    <button
                      disabled={isTesting || !isAllowed}
                      onClick={() => handleTestSingleDevice(device)}
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm ${
                        isTesting
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-gradient-to-r from-slate-800 to-slate-800 hover:from-cyan-950/60 hover:to-slate-800 text-slate-200 hover:text-cyan-300 border-slate-700 hover:border-cyan-500/40"
                      }`}
                    >
                      <Play className={`w-3.5 h-3.5 fill-current ${isTesting ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                      <span>{isTesting ? "Transmitindo..." : "Testar PiP"}</span>
                    </button>

                    {/* Master Unlock Button for Smartphones */}
                    {device.device_type === "smartphone" && (
                      <button
                        onClick={() => handleToggleMaster(device)}
                        className={`p-2.5 rounded-xl border transition-all text-xs font-bold ${
                          device.is_master_admin
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-amber-300"
                        }`}
                        title={device.is_master_admin ? "Revogar direitos VIP Master" : "Desbloquear direitos VIP Master"}
                      >
                        ⭐
                      </button>
                    )}

                    {/* Manage Modal Button */}
                    <button
                      onClick={() => handleManageDevice(device)}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all text-xs font-bold flex items-center gap-1.5"
                      title="Gerenciar configurações detalhadas"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ajustes</span>
                    </button>

                    {/* Quick Delete */}
                    <button
                      onClick={() => handleDeleteDevice(device.id, device.friendly_name)}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-all text-xs"
                      title="Remover tela"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide Card */}
      <div className="p-5 rounded-3xl glass-panel border border-slate-800/80 text-xs space-y-3">
        <h3 className="font-extrabold text-slate-200 flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          Guia de Integração e Protocolos de Entrega PiP:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-400">
          <div className="p-4 rounded-2xl bg-obsidian-950/70 border border-slate-800/80 space-y-1.5">
            <strong className="text-slate-200 block font-bold flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" />
              Android TV / Google TV / Fire TV (App Nativo APK):
            </strong>
            <p className="text-[11px] leading-relaxed">
              Instale o aplicativo oficial <strong>SentinelaPro Android TV</strong> ou apps compatíveis como <strong>PiP-Up</strong>. O gateway injeta o stream H.264 do Frigate diretamente no overlay flutuante via porta local ou WebSocket seguro.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-obsidian-950/70 border border-slate-800/80 space-y-1.5">
            <strong className="text-slate-200 block font-bold flex items-center gap-2">
              <Cast className="w-4 h-4 text-indigo-400" />
              Google Chromecast / Google Nest Hub / DLNA:
            </strong>
            <p className="text-[11px] leading-relaxed">
              O Sentinela conecta-se diretamente ao protocolo Cast do receptor, iniciando a transmissão ao vivo instantaneamente no momento da detecção de eventos e retornando à programação anterior.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Gerenciar Tela (Avançado) */}
      {managingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-cyan-400">
                  {managingDevice.device_type === "android_tv" ? (
                    <Tv className="w-6 h-6" />
                  ) : managingDevice.device_type === "chromecast" ? (
                    <Cast className="w-6 h-6" />
                  ) : (
                    <Smartphone className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">{managingDevice.friendly_name}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {managingDevice.device_type.toUpperCase()} • ID: {managingDevice.device_identifier}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingDevice(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Permissions & Identification */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    Identificação & Rede
                  </h3>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Nome Amigável da Tela:
                    </label>
                    <input
                      type="text"
                      value={managingDevice.friendly_name}
                      onChange={(e) => setManagingDevice({ ...managingDevice, friendly_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none"
                      placeholder="Ex: Smart TV Sala, Painel Portaria..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">IP Local (LAN)</span>
                      <span className="text-slate-200 font-bold">{managingDevice.ip_address}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">IP Tailscale</span>
                      <span className="text-cyan-300 font-bold">{managingDevice.tailscale_ip || "Não configurado"}</span>
                    </div>
                  </div>
                </div>

                {/* PiP & Notification Controls */}
                <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Configuração de Notificação PiP
                  </h3>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div>
                      <p className="text-xs text-slate-200 font-bold">Habilitar Alertas PiP</p>
                      <p className="text-[10px] text-slate-500">Exibe pop-up flutuante de eventos</p>
                    </div>
                    <button
                      onClick={() => setManagingDevice({ ...managingDevice, allow_pip_alerts: managingDevice.allow_pip_alerts === false })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        managingDevice.allow_pip_alerts !== false ? "bg-cyan-500" : "bg-slate-700"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        managingDevice.allow_pip_alerts !== false ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] mb-1 font-bold">Tamanho Padrão PiP:</span>
                      <select
                        value={managingDevice.pip_default_size || "medium"}
                        onChange={(e) => setManagingDevice({ ...managingDevice, pip_default_size: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="mini">Mini (20%)</option>
                        <option value="medium">Médio (35%)</option>
                        <option value="large">Grande (50%)</option>
                        <option value="split">Split Screen (50%)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] mb-1 font-bold">Duração do PiP:</span>
                      <select
                        value={managingDevice.pip_duration_seconds || 10}
                        onChange={(e) => setManagingDevice({ ...managingDevice, pip_duration_seconds: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value={5}>5 Segundos</option>
                        <option value={10}>10 Segundos</option>
                        <option value={15}>15 Segundos</option>
                        <option value={30}>30 Segundos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Granular System Privileges */}
                <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Privilégios Administrativos
                  </h3>
                  
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer">
                    <span className="text-slate-300">Acesso a Gravações do SSD</span>
                    <input
                      type="checkbox"
                      checked={managingDevice.allow_recordings !== false}
                      onChange={(e) => setManagingDevice({ ...managingDevice, allow_recordings: e.target.checked })}
                      className="rounded text-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 cursor-pointer text-amber-200 font-bold">
                    <span>🔄 Reiniciar Containers Docker</span>
                    <input
                      type="checkbox"
                      checked={managingDevice.allow_restart_containers === true}
                      onChange={(e) => setManagingDevice({ ...managingDevice, allow_restart_containers: e.target.checked })}
                      className="rounded text-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/40 cursor-pointer text-rose-200 font-bold">
                    <span>⚡ Reiniciar Servidor Ubuntu (Reboot)</span>
                    <input
                      type="checkbox"
                      checked={managingDevice.allow_reboot_server === true}
                      onChange={(e) => setManagingDevice({ ...managingDevice, allow_reboot_server: e.target.checked })}
                      className="rounded text-rose-500"
                    />
                  </label>
                </div>
              </div>

              {/* Right Column: Cameras, Events & Diagnostics */}
              <div className="space-y-4">
                {/* Permitted Cameras */}
                <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      Câmeras Permitidas ({managingDevice.allowed_cameras?.length || 0})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const allNames = cameras.map(c => c.name);
                        const isAllSelected = managingDevice.allowed_cameras?.length === allNames.length;
                        setManagingDevice({
                          ...managingDevice,
                          allowed_cameras: isAllSelected ? [] : allNames
                        });
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold"
                    >
                      {managingDevice.allowed_cameras?.length === cameras.length ? "Desmarcar Todas" : "Marcar Todas"}
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cameras.map((c) => {
                      const isChecked = !managingDevice.allowed_cameras || managingDevice.allowed_cameras.length === 0 || managingDevice.allowed_cameras.includes(c.name);
                      return (
                        <label key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer text-xs text-slate-200">
                          <span className="font-mono text-[11px]">{c.friendly_name || c.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentList = managingDevice.allowed_cameras && managingDevice.allowed_cameras.length > 0
                                ? [...managingDevice.allowed_cameras]
                                : cameras.map(cam => cam.name);
                              let nextList: string[];
                              if (e.target.checked) {
                                nextList = Array.from(new Set([...currentList, c.name]));
                              } else {
                                nextList = currentList.filter(name => name !== c.name);
                              }
                              setManagingDevice({ ...managingDevice, allowed_cameras: nextList });
                            }}
                            className="rounded text-cyan-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Permitted AI Events */}
                <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Tipos de Eventos com Alerta
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "person", label: "👤 Pessoas" },
                      { id: "car", label: "🚗 Carros" },
                      { id: "motorcycle", label: "🏍️ Motos" },
                      { id: "dog", label: "🐕 Cães" },
                      { id: "cat", label: "🐈 Gatos" },
                      { id: "bus", label: "🚌 Ônibus" }
                    ].map((obj) => {
                      const isChecked = !managingDevice.allowed_events || managingDevice.allowed_events.length === 0 || managingDevice.allowed_events.includes(obj.id);
                      return (
                        <label key={obj.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer text-xs text-slate-200">
                          <span className="text-[11px]">{obj.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const allObjs = ["person", "car", "motorcycle", "dog", "cat", "bus"];
                              const currentList = managingDevice.allowed_events && managingDevice.allowed_events.length > 0
                                ? [...managingDevice.allowed_events]
                                : allObjs;
                              let nextList: string[];
                              if (e.target.checked) {
                                nextList = Array.from(new Set([...currentList, obj.id]));
                              } else {
                                nextList = currentList.filter(name => name !== obj.id);
                              }
                              setManagingDevice({ ...managingDevice, allowed_events: nextList });
                            }}
                            className="rounded text-cyan-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Network Diagnostics */}
                <div className="p-4 rounded-2xl bg-obsidian-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-indigo-400" />
                      Diagnóstico de Conectividade
                    </h3>
                    <button
                      onClick={() => runDiagnostics(managingDevice.id)}
                      disabled={runningDiagnostics}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${runningDiagnostics ? "animate-spin" : ""}`} />
                      {runningDiagnostics ? "Testando..." : "Testar Rede"}
                    </button>
                  </div>

                  {deviceDiagnostics ? (
                    <div className="p-3 rounded-xl bg-black/60 border border-slate-800 font-mono text-[10px] space-y-1.5">
                      <div className="flex justify-between border-b border-slate-800 pb-1">
                        <span className="text-slate-400">Latência: <b className="text-emerald-400">{deviceDiagnostics.latency}</b></span>
                        <span className="text-slate-400">Perda de Pacotes: <b className="text-emerald-400">{deviceDiagnostics.packet_loss}</b></span>
                      </div>
                      <div className="text-slate-400">
                        Portas PiP Abertas: <span className="text-cyan-300 font-bold">{deviceDiagnostics.open_ports?.join(", ") || "Nenhuma"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Clique em &quot;Testar Rede&quot; para medir a latência e verificar as portas abertas deste aparelho.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  handleDeleteDevice(managingDevice.id, managingDevice.friendly_name);
                  setManagingDevice(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Dispositivo</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setManagingDevice(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const res = await fetch(`${apiUrl}/devices/${managingDevice.id}/permissions`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          friendly_name: managingDevice.friendly_name,
                          permission_status: managingDevice.permission_status,
                          allowed_cameras: managingDevice.allowed_cameras || [],
                          allowed_events: managingDevice.allowed_events || [],
                          allow_recordings: managingDevice.allow_recordings !== false,
                          allow_live_stream: managingDevice.allow_live_stream !== false,
                          allow_pip_alerts: managingDevice.allow_pip_alerts !== false,
                          allow_restart_containers: managingDevice.allow_restart_containers === true,
                          allow_reboot_server: managingDevice.allow_reboot_server === true,
                          pip_default_size: managingDevice.pip_default_size || "medium",
                          pip_duration_seconds: managingDevice.pip_duration_seconds || 10
                        })
                      });
                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.detail || `HTTP ${res.status}`);
                      }
                      await fetchDevices(true);
                      setManagingDevice(null);
                      showToast(`✅ Alterações em '${managingDevice.friendly_name}' salvas com sucesso!`, "success", 4000);
                    } catch (err: any) {
                      console.error("Failed to save permissions:", err);
                      showToast(`❌ Falha ao salvar: ${err.message || "Erro de rede"}`, "error", 5000);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "Salvando..." : "Salvar Configurações"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-400" />
                Cadastrar Nova Tela / Smart TV
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome da TV / Local:</label>
                <input
                  type="text"
                  placeholder="Ex: Smart TV Sala, Painel Cozinha"
                  value={newDevice.friendly_name}
                  onChange={(e) => setNewDevice({ ...newDevice, friendly_name: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Plataforma / Dispositivo:</label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({ ...newDevice, device_type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="android_tv">Android TV / Google TV / Fire TV</option>
                  <option value="chromecast">Google Chromecast / Nest Hub</option>
                  <option value="smartphone">Smartphone Android (Sentinela Mobile)</option>
                  <option value="tablet">Tablet / Painel Fixo</option>
                  <option value="lg_webos">LG Smart TV (webOS)</option>
                  <option value="samsung_tizen">Samsung Smart TV (Tizen)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Endereço IP Local (LAN):</label>
                <input
                  type="text"
                  placeholder="Ex: 192.168.1.50"
                  value={newDevice.ip_address}
                  onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">IP Tailscale (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: 100.x.x.x"
                  value={newDevice.tailscale_ip}
                  onChange={(e) => setNewDevice({ ...newDevice, tailscale_ip: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Salvar e Parear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
