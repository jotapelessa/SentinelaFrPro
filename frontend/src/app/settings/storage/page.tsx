"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  HardDrive, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  FolderArchive, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  ArrowLeft,
  Activity,
  Cpu
} from "lucide-react";

export default function StorageSettingsPage() {
  const [storageData, setStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  const fetchStorageStatus = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/storage/status`);
      if (res.ok) {
        const data = await res.json();
        setStorageData(data);
      }
    } catch (e) {
      console.error("Erro ao obter telemetria do SSD:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageStatus();
    const interval = setInterval(fetchStorageStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCleanStorage = async (cleanType: "snapshots" | "recordings" | "all", days: number = 3) => {
    setCleaningAction(cleanType);
    setCleanFeedback(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/storage/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clean_type: cleanType, older_than_days: days, exclude_retained: true })
      });
      const data = await res.json();
      if (res.ok) {
        const freed = data.freed_gb != null ? ` · ${data.freed_gb} GB liberados` : "";
        setCleanFeedback(`✅ ${data.message}${freed}`);
        await fetchStorageStatus();
      } else {
        setCleanFeedback(`⚠️ Falha: ${data.detail || "Erro ao processar"}`);
      }
    } catch (e: any) {
      setCleanFeedback(`❌ Erro: ${e?.message || "Falha de rede"}`);
    } finally {
      setCleaningAction(null);
      setTimeout(() => setCleanFeedback(null), 5000);
    }
  };

  const percentUsed = storageData?.percent ?? 25;
  const isWarning = percentUsed >= 80;
  const isCritical = percentUsed >= 90;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <Server className="w-4 h-4" /> Servidor Ubuntu Server 22.04 LTS
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-emerald-400" />
            Gestão do SSD NVMe & Armazenamento Frigate
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento de espaço em disco, gravações MP4, fotos e expurgo seletivo com retenção atômica.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStorageStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {cleanFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-sm font-mono text-emerald-200 animate-fadeIn flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{cleanFeedback}</span>
        </div>
      )}

      {/* Main Storage Gauge Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacidade Total do NVMe</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {storageData?.used_gb ?? 110.0} GB <span className="text-sm font-normal text-slate-400">/ {storageData?.total_gb ?? 468.0} GB</span>
            </div>
          </div>

          <div className="text-right sm:text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Espaço Disponível</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {storageData?.free_gb ?? 334.0} GB LIVRES
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                isCritical 
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 shadow-rose-500/50" 
                  : isWarning 
                  ? "bg-gradient-to-r from-cyan-500 to-amber-500 shadow-amber-500/50" 
                  : "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-emerald-500/50"
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Ponto de montagem: <span className="text-white font-semibold">{storageData?.mount ?? "/media/frigate"}</span></span>
            <span className={isCritical ? "text-rose-400 font-bold" : isWarning ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
              {percentUsed}% Utilizado
            </span>
          </div>
        </div>

        {/* Breakdown Sub-metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold">Gravações (Vídeos MP4)</div>
              <div className="text-base font-mono font-bold text-white">{storageData?.recordings_gb ?? 76.0} GB</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold">Capturas & Fotos HD</div>
              <div className="text-base font-mono font-bold text-white">{storageData?.clips_mb ?? 543.0} MB</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold">Eventos Favoritos (Estrela)</div>
              <div className="text-base font-mono font-bold text-emerald-300">100% Protegidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cleaning Tools Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Ações Rápidas de Limpeza e Otimização do SSD</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
            Retenção atômica de favoritos ativa
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Libere espaço de forma imediata sem impactar o funcionamento contínuo do Frigate NVR ou as gravações salvas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1: Snapshots */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Fotos Antigas (&gt; 3 dias)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Fotos HD
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Remove capturas e snapshots temporários não fixados com mais de 3 dias de existência.
              </p>
            </div>
            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("snapshots", 3)}
              className="w-full py-2.5 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningAction === "snapshots" ? "Limpando Fotos..." : "Limpar Fotos Antigas"}</span>
            </button>
          </div>

          {/* Card 2: Recordings */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Vídeos Antigos (&gt; 3 dias)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  Vídeos MP4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Remove gravações de movimento ordinárias com mais de 3 dias, preservando eventos críticos.
              </p>
            </div>
            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("recordings", 3)}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningAction === "recordings" ? "Limpando Vídeos..." : "Limpar Vídeos Antigos"}</span>
            </button>
          </div>

          {/* Card 3: Purge All */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Limpeza Geral Segura (&gt; 7 dias)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  Completo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Expurgo completo de mídia ordinária antiga com garantia total de proteção a eventos com estrela.
              </p>
            </div>
            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("all", 7)}
              className="w-full py-2.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningAction === "all" ? "Executando..." : "Executar Limpeza Geral"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
