"use client";

import React, { useState, useEffect } from "react";
import { Tv, Tablet, Smartphone, Play, Plus, Trash2, Check, AlertCircle, RefreshCw, X, Radio } from "lucide-react";

interface PairedDevice {
  id: number;
  device_identifier: string;
  friendly_name: string;
  device_type: string;
  ip_address: string;
  tailscale_ip?: string;
  permission_status: "allowed" | "blocked" | "paused";
}

export default function ScreensPage() {
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingPiP, setTestingPiP] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
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

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleScanTVs = async () => {
    setScanningTVs(true);
    setTestResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/devices/discover`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredTVs(data);
        if (data.length > 0) {
          setTestResult(`🔍 Encontrada(s) ${data.length} Smart TV(s) na sua rede!`);
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
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
        setDiscoveredTVs(prev => prev.filter(t => t.ip !== tv.ip));
        await fetchDevices();
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/devices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_status: nextStatus })
      });
      setDevices(prev => prev.map(d => (d.id === id ? { ...d, permission_status: nextStatus as any } : d)));
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleTestPiP = async () => {
    setTestingPiP(true);
    setTestResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: "camera_principal", label: "pessoa_detectada" })
      });
      const data = await res.json();
      if (data.dispatched_count > 0) {
        setTestResult(`🎉 Alerta PiP enviado com sucesso para ${data.dispatched_count} TV(s)!`);
      } else {
        setTestResult("⚠️ Disparo enviado! Certifique-se de que a TV está ligada na mesma rede.");
      }
    } catch {
      setTestResult("⚠️ Erro ao enviar comando de teste.");
    } finally {
      setTestingPiP(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm("Deseja realmente remover esta Smart TV/tela?")) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/devices/${id}`, { method: "DELETE" });
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error("Failed to delete device:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide">
              Telas Pareadas & Notificações Picture-in-Picture (Smart TV)
            </h1>
            <p className="text-xs text-slate-400">
              Receba alertas e vídeo ao vivo flutuante na sua Smart TV enquanto assiste TV ou filmes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled={scanningTVs}
            onClick={handleScanTVs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanningTVs ? "animate-spin" : ""}`} />
            <span>{scanningTVs ? "Escaneando Rede..." : "Escanear Smart TVs"}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Manual</span>
          </button>

          <button
            disabled={testingPiP}
            onClick={handleTestPiP}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{testingPiP ? "Enviando..." : "Testar Alerta na TV"}</span>
          </button>
        </div>
      </div>

      {/* Discovered TVs Banner */}
      {discoveredTVs.length > 0 && (
        <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-cyan-300 flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" />
              Smart TVs Encontradas na Rede Local ({discoveredTVs.length})
            </h2>
            <button
              onClick={() => setDiscoveredTVs([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {discoveredTVs.map((tv) => (
              <div
                key={tv.ip}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between gap-3"
              >
                <div>
                  <h3 className="font-bold text-xs text-white">{tv.friendly_name}</h3>
                  <p className="text-[11px] font-mono text-cyan-300">IP: {tv.ip}</p>
                  <p className="text-[10px] text-slate-400">Serviços: {tv.services.join(", ")}</p>
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

      {testResult && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Guide Box */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
        <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-cyan-400" />
          Como funciona a notificação na Smart TV:
        </h3>
        <p className="text-slate-400">
          • <strong>Android TV / Google TV / Fire TV / Mi Box</strong>: Instale o app gratuito <strong>Notifications for Android TV</strong> ou <strong>PiP-Up</strong> na TV. O Sentinela envia a foto e vídeo automaticamente na hora que detectar alguém no portão!
        </p>
        <p className="text-slate-400">
          • <strong>LG webOS / Samsung Tizen / Chromecast</strong>: Cadastre o IP da TV abaixo para habilitar o gateway de transmissão em tempo real.
        </p>
      </div>

      {/* Devices List */}
      {devices.length === 0 && !loading ? (
        <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 space-y-3">
          <Tv className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Nenhuma Smart TV ou tela pareada no momento</p>
          <p className="text-xs text-slate-500">Clique no botão "Adicionar Smart TV" acima para cadastrar a TV da sua sala ou quarto.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const isAllowed = device.permission_status === "allowed";
            return (
              <div
                key={device.id}
                className={`p-5 rounded-2xl glass-panel border transition-all ${
                  isAllowed ? "border-slate-800 hover:border-cyan-500/40" : "border-rose-500/30 bg-rose-950/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
                      {device.device_type === "android_tv" ? (
                        <Tv className="w-6 h-6 text-cyan-400" />
                      ) : (
                        <Tablet className="w-6 h-6 text-teal-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{device.friendly_name}</h3>
                      <p className="text-[11px] font-mono text-slate-400">Tipo: {device.device_type.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePermission(device.id, device.permission_status)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                        isAllowed
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {isAllowed ? "🟢 ATIVA" : "🔴 PAUSADA"}
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                      title="Remover dispositivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[10px]">IP na Rede Local:</span>
                    <span className="text-slate-200 font-bold">{device.ip_address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tailscale VPN:</span>
                    <span className="text-cyan-300 font-bold">{device.tailscale_ip || "LAN Local"}</span>
                  </div>
                </div>
              </div>
            );
          })}
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
                  <option value="lg_webos">LG Smart TV (webOS)</option>
                  <option value="samsung_tizen">Samsung Smart TV (Tizen)</option>
                  <option value="chromecast">Google Chromecast / Nest Hub</option>
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
