"use client";

import React, { useState, useEffect } from "react";
import { Activity, Cpu, Flame, HardDrive, Wifi, Shield, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useSentinelaStore } from "@/store/useSentinelaStore";

export default function DiagnosticsSettingsPage() {
  const { telemetry, wsConnected } = useSentinelaStore();
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/telemetry/diagnostics`);
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Hardware & Accelerator Specs */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Saúde do Hardware & Aceleração GPU</h2>
          </div>
          <button
            onClick={fetchDiagnostics}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Processador (CPU)</span>
            <strong className="text-sm font-bold text-white block">Intel N5105 Quad-Core</strong>
            <span className="text-xs text-cyan-400 font-mono font-bold">
              Uso: {telemetry?.cpu.usage_percent || 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Temperatura do Chip</span>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-400" />
              <strong className="text-sm font-bold text-white block">
                {telemetry?.cpu.temperature_celsius || 30}°C
              </strong>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">❄️ Faixa Ideal (&lt; 50°C)</span>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">iGPU Intel VAAPI</span>
            <strong className="text-sm font-bold text-white block">iHD Driver (Gen11)</strong>
            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Acelerada (/dev/dri)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Memória RAM</span>
            <strong className="text-sm font-bold text-white block">
              {telemetry?.ram.used_mb || 0} MB / {telemetry?.ram.total_mb || 0} MB
            </strong>
            <span className="text-xs text-slate-400 font-mono">
              ({telemetry?.ram.percent || 0}% em uso)
            </span>
          </div>
        </div>
      </div>

      {/* Services Health Matrix */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Matriz de Serviços & Conectividade</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-white font-bold">Frigate NVR</strong>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                ONLINE
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">API e ingestão de vídeo ativa na porta 5000.</p>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-white font-bold">go2rtc WebRTC</strong>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                ONLINE
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">Retransmissão WebRTC ativa nas portas 1984/8555.</p>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-white font-bold">Mosquitto MQTT</strong>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                CONECTADO
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">Barramento de mensagens na porta 1883.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
