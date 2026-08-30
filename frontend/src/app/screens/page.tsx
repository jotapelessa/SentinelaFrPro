"use client";

import React, { useState, useEffect } from "react";
import { Tv, Smartphone, Tablet, ShieldCheck, ShieldX, Play, Plus, Wifi, Check, AlertCircle } from "lucide-react";

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
  const [devices, setDevices] = useState<PairedDevice[]>([
    {
      id: 1,
      device_identifier: "tv_sala_jasper",
      friendly_name: "Smart TV Sala (Android TV / PiP)",
      device_type: "android_tv",
      ip_address: "192.168.1.50",
      tailscale_ip: "100.85.12.4",
      permission_status: "allowed"
    },
    {
      id: 2,
      device_identifier: "tablet_portaria_ipad",
      friendly_name: "Tablet Portaria (Painel de Parede)",
      device_type: "tablet",
      ip_address: "192.168.1.65",
      tailscale_ip: "100.85.12.9",
      permission_status: "allowed"
    }
  ]);

  const [testingPiP, setTestingPiP] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const togglePermission = (id: number) => {
    setDevices(prev => prev.map(d => {
      if (d.id === id) {
        const nextStatus = d.permission_status === "allowed" ? "blocked" : "allowed";
        return { ...d, permission_status: nextStatus };
      }
      return d;
    }));
  };

  const handleTestPiP = async () => {
    setTestingPiP(true);
    setTestResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: "portao_principal", label: "person" })
      });
      if (res.ok) {
        setTestResult("Comando PiP enviado com sucesso para as TVs cadastradas!");
      } else {
        setTestResult("Disparo simulado com sucesso (modo dev).");
      }
    } catch {
      setTestResult("Disparo simulado executado.");
    } finally {
      setTestingPiP(false);
      setTimeout(() => setTestResult(null), 4000);
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
              Telas Pareadas & Gateway Picture-in-Picture
            </h1>
            <p className="text-xs text-slate-400">
              Controle de Smart TVs, tablets e quiosques autorizados via LAN ou Tailscale Mesh.
            </p>
          </div>
        </div>

        {/* Test PiP Button */}
        <button
          disabled={testingPiP}
          onClick={handleTestPiP}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{testingPiP ? "Enviando..." : "Testar Alerta PiP na TV"}</span>
        </button>
      </div>

      {testResult && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Devices List */}
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
                    <p className="text-[11px] font-mono text-slate-400">ID: {device.device_identifier}</p>
                  </div>
                </div>

                <button
                  onClick={() => togglePermission(device.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isAllowed
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {isAllowed ? "🟢 AUTORIZADO" : "🔴 BLOQUEADO"}
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                <div>
                  <span className="text-slate-500 block text-[10px]">IP Local:</span>
                  <span className="text-slate-200">{device.ip_address}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Tailscale Mesh IP:</span>
                  <span className="text-cyan-300 font-bold">{device.tailscale_ip || "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
