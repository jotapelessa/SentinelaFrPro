"use client";

import React, { useState, useEffect } from "react";
import { useSentinelaStore } from "@/store/useSentinelaStore";
import {
  Tv, Tablet, Smartphone, Play, Plus, Trash2, Check, AlertCircle,
  RefreshCw, X, Radio, Camera, ShieldCheck, ShieldAlert, Wifi, WifiOff, Cast, Info, Sliders
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
  recent_logs?: string;
  last_seen?: string;
}

interface DeviceHealth {
  id: number;
  name: string;
  ip: string;
  online: boolean;
}

export default function ScreensPage() {
  const { cameras, setCameras } = useSentinelaStore();
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [healthMap, setHealthMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingPiP, setTestingPiP] = useState(false);
  const [testingDeviceId, setTestingDeviceId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchCameras = async () => {
    try {
      const res = await fetch(`${apiUrl}/cameras/`);
      if (res.ok) {
        const data = await res.json();
        setCameras(data);
      }
    } catch (e) {
      console.error("Failed to fetch cameras:", e);
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/devices/`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
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
  };

  useEffect(() => {
    fetchDevices();
    fetchHealth();
    fetchCameras();

    const interval = setInterval(() => {
      fetchHealth();
      fetchDevices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleScanTVs = async () => {
    setScanningTVs(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl}/devices/discover`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredTVs(data);
        if (data.length > 0) {
          setTestResult(`🔍 Encontrada(s) ${data.length} Smart TV(s) ou Chromecast na sua rede!`);
        } else {
          setTestResult("Nenhuma Smart TV respondeu na rede local no momento.");
        }
      }
    } catch (e) {
      console.error("Failed to scan TVs:", e);
      setTestResult("Erro ao escanear a rede.");
    } finally {
      setScanningTVs(false);
      setTimeout(() => setTestResult(null), 6000);
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
        await fetchDevices();
        await fetchHealth();
        setTestResult(`🎉 ${tv.friendly_name} pareada com sucesso!`);
        setTimeout(() => setTestResult(null), 5000);
      }
    } catch (err) {
      console.error("Failed to quick pair:", err);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.friendly_name || !newDevice.ip_address) return;

    try {
      const identifier = `tv_${newDevice.friendly_name.toLowerCase().replace(/\s+/g, "_")}_${Math.floor(Math.random() * 1000)}`;
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
        await fetchDevices();
        await fetchHealth();
        setTestResult("✅ Dispositivo cadastrado com sucesso!");
        setTimeout(() => setTestResult(null), 4000);
      }
    } catch (err) {
      console.error("Failed to add device:", err);
    }
  };

  const togglePermission = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "allowed" ? "blocked" : "allowed";
    try {
      await fetch(`${apiUrl}/devices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_status: nextStatus })
      });
      setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, permission_status: nextStatus as any } : d)));
      if (managingDevice && managingDevice.id === id) {
        setManagingDevice({ ...managingDevice, permission_status: nextStatus as any });
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  // Test single specific TV
  const handleTestSingleDevice = async (device: PairedDevice) => {
    setTestingDeviceId(device.id);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl}/devices/${device.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: selectedCam })
      });
      const data = await res.json();
      if (data.status === "success") {
        setTestResult(`🎉 ${data.message}`);
      } else {
        setTestResult(`⚠️ ${data.message}`);
      }
    } catch {
      setTestResult("⚠️ Erro ao enviar comando de teste para a TV.");
    } finally {
      setTestingDeviceId(null);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  // Broadcast test to all TVs
  const handleTestPiPBroadcast = async () => {
    setTestingPiP(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: selectedCam, label: "intrusao_detectada" })
      });
      const data = await res.json();
      if (data.dispatched_count > 0) {
        setTestResult(`🎉 Alerta PiP transmitido com sucesso para ${data.dispatched_count} tela(s)!`);
      } else {
        setTestResult("⚠️ Comando enviado! Certifique-se de que a TV está ligada na mesma rede.");
      }
    } catch {
      setTestResult("⚠️ Erro ao disparar transmissão.");
    } finally {
      setTestingPiP(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleToggleMaster = async (device: PairedDevice) => {
    try {
      const res = await fetch(`${apiUrl}/devices/${device.device_identifier}/toggle-master`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(
          data.is_master_admin
            ? `⭐ Permissões MASTER concedidas para ${device.friendly_name}! Funções secretas desbloqueadas no app.`
            : `🔒 Permissões MASTER revogadas de ${device.friendly_name}.`
        );
        fetchDevices();
        setTimeout(() => setTestResult(null), 6000);
      }
    } catch (e) {
      console.error("Failed to toggle master:", e);
      setTestResult("⚠️ Erro ao alterar privilégios master do dispositivo.");
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleBatchTest = async (testType: string) => {
    setTestingPiP(true);
    setTestResult(null);
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
      setTestResult(`🚀 Teste em lote (${testType}) executado em ${data.total} dispositivo(s)!`);
    } catch (e) {
      console.error("Batch test failed:", e);
      setTestResult("⚠️ Falha ao executar teste em lote.");
    } finally {
      setTestingPiP(false);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm("Deseja realmente remover esta Smart TV/tela?")) return;
    try {
      await fetch(`${apiUrl}/devices/${id}`, { method: "DELETE" });
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Failed to delete device:", err);
    }
  };

  // Kiosk Mode State
  const [kioskMode, setKioskMode] = useState(false);

  // Manage Device State
  const [managingDevice, setManagingDevice] = useState<PairedDevice | null>(null);
  const [deviceDiagnostics, setDeviceDiagnostics] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

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
    } finally {
      setRunningDiagnostics(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
              Telas Pareadas & Notificações Picture-in-Picture (Smart TV)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Frigate PiP Gateway
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Receba pop-ups flutuantes ao vivo na sua Smart TV enquanto assiste filmes ou futebol.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto">
          {/* Camera Picker for Testing */}
          <div className="flex items-center gap-1.5 bg-obsidian-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-mono text-xs"
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
            <span>{kioskMode ? "Sair do Quiosque" : "Modo Quiosque"}</span>
          </button>

          <button
            disabled={scanningTVs}
            onClick={handleScanTVs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanningTVs ? "animate-spin" : ""}`} />
            <span>{scanningTVs ? "Escaneando..." : "Escanear Smart TVs"}</span>
          </button>

          <button
            onClick={async () => {
              if (!confirm("Deseja limpar todos os dispositivos fictícios/antigos da lista? Suas telas reais (TV e Smartphone) reaparecerão automaticamente via heartbeat.")) return;
              try {
                const res = await fetch(`${apiUrl}/devices/all/cleanup`, { method: "DELETE" });
                if (res.ok) {
                  await fetchDevices();
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
            title="Remove dispositivos antigos ou fictícios"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Telas Inativas</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Manual</span>
          </button>

          <button
            disabled={testingPiP}
            onClick={() => handleBatchTest("simulated_detection")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all disabled:opacity-50"
            title="Simula um evento de detecção de pessoa com bounding box em tempo real para todas as telas"
          >
            <span>🎯 Simular Detecção IA</span>
          </button>

          <button
            disabled={testingPiP}
            onClick={handleTestPiPBroadcast}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{testingPiP ? "Transmitindo..." : "Testar em Todas as TVs"}</span>
          </button>
        </div>
      </div>

      {/* Discovered TVs Banner */}
      {discoveredTVs.length > 0 && (
        <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-cyan-300 flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" />
              Smart TVs & Chromecasts Encontrados na Rede ({discoveredTVs.length})
            </h2>
            <button
              onClick={() => setDiscoveredTVs([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {discoveredTVs.map((tv) => (
              <div
                key={tv.ip}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between gap-3"
              >
                <div>
                  <h3 className="font-bold text-xs text-white">{tv.friendly_name}</h3>
                  <p className="text-[11px] font-mono text-cyan-300">IP: {tv.ip}</p>
                  <p className="text-[10px] text-slate-400">Serviços: {tv.services?.join(", ") || "DLNA / UPnP"}</p>
                </div>
                <button
                  onClick={() => handleQuickPair(tv)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-md shadow-cyan-500/20 whitespace-nowrap transition-all"
                >
                  Parear TV ⚡
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {testResult && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Quick Setup Guide */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 text-xs space-y-2">
        <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-cyan-400" />
          Como funciona a exibição na Smart TV:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400 pt-1">
          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-slate-200 block font-bold">📺 Android TV / Google TV / Fire TV / Mi Box:</strong>
            <p className="text-[11px] leading-relaxed">
              Instale o aplicativo gratuito <strong>PiP-Up</strong> ou <strong>Notifications for Android TV</strong> na Play Store da TV. O Sentinela exibirá a miniatura com marca d&apos;água e vídeo em overlay no canto superior direito.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-slate-200 block font-bold">📡 Google Chromecast / Nest Hub / DLNA:</strong>
            <p className="text-[11px] leading-relaxed">
              O Sentinela faz transmissão nativa via protocolo Google Cast para o IP do Chromecast ou TV automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      {devices.length === 0 && !loading ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Tv className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Nenhuma Smart TV ou tela pareada no momento</p>
          <p className="text-xs text-slate-500">
            Clique em "Escanear Smart TVs" para localizar suas TVs na rede ou adicione manualmente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const isAllowed = device.permission_status === "allowed";
            const isOnline = healthMap[device.id] ?? true;
            const isTesting = testingDeviceId === device.id;

            return (
              <div
                key={device.id}
                className={`p-5 rounded-2xl glass-panel border transition-all flex flex-col justify-between space-y-4 ${
                  isAllowed
                    ? "border-slate-800 hover:border-cyan-500/40"
                    : "border-rose-500/30 bg-rose-950/10"
                }`}
              >
                {/* Device Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
                      {device.device_type === "android_tv" ? (
                        <Tv className="w-6 h-6 text-cyan-400" />
                      ) : device.device_type === "chromecast" ? (
                        <Cast className="w-6 h-6 text-indigo-400" />
                      ) : (
                        <Tablet className="w-6 h-6 text-teal-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        {device.friendly_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {device.device_type}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                          {isOnline ? "Online" : "Sem Resposta"}
                        </span>
                        {device.is_master_admin && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold tracking-wider animate-pulse flex items-center gap-1">
                            ⭐ MASTER
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Master Unlock Button for Smartphones */}
                    {device.device_type === "smartphone" && (
                      <button
                        onClick={() => handleToggleMaster(device)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-bold ${
                          device.is_master_admin
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-amber-300"
                        }`}
                        title={device.is_master_admin ? "Revogar direitos Master deste aparelho" : "Desbloquear direitos Master com funções avançadas"}
                      >
                        {device.is_master_admin ? "⭐ Master Ativo" : "🔓 Desbloquear Master"}
                      </button>
                    )}

                    {/* Action: Gerenciar */}
                    <button
                      onClick={() => handleManageDevice(device)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-xs font-bold"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Gerenciar
                    </button>
                  </div>
                </div>

                {/* Device Info & Individual Test Action */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2 text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[10px]">IP Local:</span>
                      <span className="text-slate-200 font-bold">{device.ip_address}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Tailscale:</span>
                      <span className="text-cyan-300 font-bold">{device.tailscale_ip || "LAN Local"}</span>
                    </div>
                  </div>

                  {(device.connection_type || device.app_version || device.device_model) && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/40">
                      {device.connection_type && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                          📶 {device.connection_type} {device.network_speed_mbps ? `(${Math.round(device.network_speed_mbps)} Mbps)` : ""}
                        </span>
                      )}
                      {device.app_version && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-mono text-indigo-300 font-bold">
                          {device.app_version}
                        </span>
                      )}
                      {device.device_model && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-[10px] text-slate-400 font-medium">
                          {device.device_model}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-slate-400 pt-1 border-t border-slate-800/40">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Câmeras:</span>
                      <span className="text-emerald-400 font-bold text-[11px]">
                        {device.allowed_cameras && device.allowed_cameras.length > 0
                          ? `${device.allowed_cameras.length} selecionada(s)`
                          : "Todas (Livre)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Alertas PiP:</span>
                      <span className={`font-bold text-[11px] ${device.allow_pip_alerts !== false ? "text-cyan-300" : "text-slate-500"}`}>
                        {device.allow_pip_alerts !== false ? `Ativo (${device.pip_duration_seconds || 10}s)` : "Desativado"}
                      </span>
                    </div>
                  </div>

                  {/* Individual TV Test Button */}
                  <button
                    disabled={isTesting}
                    onClick={() => handleTestSingleDevice(device)}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 font-bold text-xs border border-slate-700 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${isTesting ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                    <span>{isTesting ? "Enviando para esta TV..." : `Testar PiP (${selectedCam})`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      
      {/* Modal Gerenciar Tela */}
      {managingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  {managingDevice.device_type === "android_tv" ? (
                    <Tv className="w-6 h-6 text-cyan-400" />
                  ) : managingDevice.device_type === "chromecast" ? (
                    <Cast className="w-6 h-6 text-indigo-400" />
                  ) : (
                    <Tablet className="w-6 h-6 text-teal-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{managingDevice.friendly_name}</h2>
                  <p className="text-xs text-slate-400 font-mono uppercase">{managingDevice.device_type} • ID: {managingDevice.device_identifier}</p>
                </div>
              </div>
              <button
                onClick={() => setManagingDevice(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Info & Control */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-obsidian-950/50 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    Identificação e Endereço
                  </h3>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Nome Amigável / Identificador da Tela:
                    </label>
                    <input
                      type="text"
                      value={managingDevice.friendly_name}
                      onChange={(e) => setManagingDevice({ ...managingDevice, friendly_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                      placeholder="Ex: Smart TV Sala, Celular Portaria..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">IP Local (LAN)</span>
                      <span className="text-slate-200">{managingDevice.ip_address}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">IP Tailscale</span>
                      <span className="text-cyan-300">{managingDevice.tailscale_ip || "Não configurado"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-obsidian-950/50 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Controle de Notificações
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-200 font-bold">Permitir PiP</p>
                      <p className="text-[10px] text-slate-500">Pausar não exclui a TV.</p>
                    </div>
                    <button
                      onClick={() => togglePermission(managingDevice.id, managingDevice.permission_status)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        managingDevice.permission_status === "allowed" ? "bg-emerald-500" : "bg-slate-700"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        managingDevice.permission_status === "allowed" ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Câmeras Permitidas nesta Tela */}
                <div className="p-4 rounded-2xl bg-obsidian-950/50 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    Câmeras Permitidas
                  </h3>
                  <div className="space-y-1.5 pt-1">
                    {cameras.map((c) => {
                      const isAllowed = !managingDevice.allowed_cameras || managingDevice.allowed_cameras.length === 0 || managingDevice.allowed_cameras.includes(c.name);
                      return (
                        <label key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer text-xs text-slate-200">
                          <span className="font-mono">{c.friendly_name || c.name}</span>
                          <input
                            type="checkbox"
                            checked={isAllowed}
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
                            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-obsidian-950"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Tipos de Eventos Permitidos */}
                <div className="p-4 rounded-2xl bg-obsidian-950/50 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Alertas & Objetos Rastreados
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { id: "person", label: "Pessoas" },
                      { id: "car", label: "Carros" },
                      { id: "motorcycle", label: "Motos" },
                      { id: "dog", label: "Cachorros" },
                      { id: "cat", label: "Gatos" },
                      { id: "bus", label: "Ônibus" }
                    ].map((obj) => {
                      const isChecked = !managingDevice.allowed_events || managingDevice.allowed_events.length === 0 || managingDevice.allowed_events.includes(obj.id);
                      return (
                        <label key={obj.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer text-xs text-slate-200">
                          <span>{obj.label}</span>
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
                            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-obsidian-950"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Permissões Gerais & PiP */}
                <div className="p-4 rounded-2xl bg-obsidian-950/50 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-teal-400" />
                    Recursos & PiP
                  </h3>
                  
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer text-slate-200">
                      <span>Transmissão ao Vivo</span>
                      <input
                        type="checkbox"
                        checked={managingDevice.allow_live_stream !== false}
                        onChange={(e) => setManagingDevice({ ...managingDevice, allow_live_stream: e.target.checked })}
                        className="rounded text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer text-slate-200">
                      <span>Acesso a Gravações do SSD</span>
                      <input
                        type="checkbox"
                        checked={managingDevice.allow_recordings !== false}
                        onChange={(e) => setManagingDevice({ ...managingDevice, allow_recordings: e.target.checked })}
                        className="rounded text-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-amber-950/30 border border-amber-800/50 cursor-pointer text-amber-200">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>🔄 Reiniciar Docker (App)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={managingDevice.allow_restart_containers === true}
                        onChange={(e) => setManagingDevice({ ...managingDevice, allow_restart_containers: e.target.checked })}
                        className="rounded text-amber-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-xl bg-rose-950/30 border border-rose-800/50 cursor-pointer text-rose-200">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>⚡ Reboot Servidor (App)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={managingDevice.allow_reboot_server === true}
                        onChange={(e) => setManagingDevice({ ...managingDevice, allow_reboot_server: e.target.checked })}
                        className="rounded text-rose-500"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] mb-1">Tamanho Padrão PiP:</span>
                        <select
                          value={managingDevice.pip_default_size || "medium"}
                          onChange={(e) => setManagingDevice({ ...managingDevice, pip_default_size: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          <option value="mini">Mini (20%)</option>
                          <option value="medium">Médio (35%)</option>
                          <option value="large">Grande (50%)</option>
                          <option value="split">Split Screen (50%)</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px] mb-1">Duração do PiP:</span>
                        <select
                          value={managingDevice.pip_duration_seconds || 10}
                          onChange={(e) => setManagingDevice({ ...managingDevice, pip_duration_seconds: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-1.5 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          <option value={5}>5 Segundos</option>
                          <option value={10}>10 Segundos</option>
                          <option value={15}>15 Segundos</option>
                          <option value={30}>30 Segundos</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Diagnostics */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-obsidian-950 border border-slate-800 space-y-3 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-indigo-400" />
                      Diagnóstico de Rede
                    </h3>
                    <button
                      onClick={() => runDiagnostics(managingDevice.id)}
                      disabled={runningDiagnostics}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${runningDiagnostics ? "animate-spin" : ""}`} />
                      {runningDiagnostics ? "Testando..." : "Rodar Teste"}
                    </button>
                  </div>

                  {deviceDiagnostics ? (
                    <div className="flex-1 bg-black/50 rounded-xl p-3 border border-slate-800 font-mono text-[10px] text-slate-300 space-y-2 overflow-x-auto">
                      <div className="flex gap-4 border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-slate-500">Latência:</span> <span className={deviceDiagnostics.latency === "N/A" ? "text-rose-400" : "text-emerald-400"}>{deviceDiagnostics.latency}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Perda:</span> <span className={deviceDiagnostics.packet_loss !== "0%" ? "text-rose-400" : "text-emerald-400"}>{deviceDiagnostics.packet_loss}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-500 block mb-1">Portas PiP Abertas:</span>
                        <div className="flex flex-wrap gap-1">
                          {deviceDiagnostics.open_ports.map((p: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-400 border border-cyan-800/50">{p}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1">Estatísticas 24h:</span>
                        <span className="text-indigo-300 font-bold">{deviceDiagnostics.stats.pips_sent_24h} alertas entregues</span>
                      </div>
                      
                      <div className="pt-2 text-slate-600">
                        {deviceDiagnostics.ping_raw.map((line: string, i: number) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                      <AlertCircle className="w-6 h-6 text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500">Clique em "Rodar Teste" para analisar ping, latência e portas ativas nesta tela.</p>
                    </div>
                  )}
                  {managingDevice.recent_logs && (
                    <div className="mt-3 p-3 bg-black/60 rounded-xl border border-slate-800 font-mono text-[10px] text-cyan-300 space-y-1">
                      <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-bold">Logs Recentes do Dispositivo:</span>
                      <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 max-h-28 overflow-y-auto">{managingDevice.recent_logs}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  handleDeleteDevice(managingDevice.id);
                  setManagingDevice(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Dispositivo
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManagingDevice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
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
                      await fetchDevices();
                      setManagingDevice(null);
                      setTestResult(`✅ Permissões e configurações de '${managingDevice.friendly_name}' salvas com sucesso!`);
                      setTimeout(() => setTestResult(null), 5000);
                    } catch (err: any) {
                      console.error("Failed to save device permissions:", err);
                      setTestResult(`❌ Falha ao salvar: ${err.message || "Erro de conexão"}`);
                      setTimeout(() => setTestResult(null), 5000);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Smart TV */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-400" />
                Cadastrar Nova Smart TV / Tela
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome da TV / Local:</label>
                <input
                  type="text"
                  placeholder="Ex: Smart TV Sala, TV Quarto Casal"
                  value={newDevice.friendly_name}
                  onChange={(e) => setNewDevice({ ...newDevice, friendly_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tipo de Dispositivo / Plataforma:</label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({ ...newDevice, device_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="android_tv">Android TV / Google TV / Fire TV / Mi Box</option>
                  <option value="chromecast">Google Chromecast / Nest Hub</option>
                  <option value="lg_webos">LG Smart TV (webOS)</option>
                  <option value="samsung_tizen">Samsung Smart TV (Tizen)</option>
                  <option value="tablet">Tablet / Painel de Parede</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Endereço IP Local da TV:</label>
                <input
                  type="text"
                  placeholder="Ex: 192.168.1.50"
                  value={newDevice.ip_address}
                  onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">IP Tailscale (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: 100.x.x.x"
                  value={newDevice.tailscale_ip}
                  onChange={(e) => setNewDevice({ ...newDevice, tailscale_ip: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold shadow-lg shadow-cyan-500/20"
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

