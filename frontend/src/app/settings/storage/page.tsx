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
  Cpu,
  Flame,
  AlertOctagon,
  ShieldAlert,
  X
} from "lucide-react";

export default function StorageSettingsPage() {
  const [storageData, setStorageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  // Estados para Períodos de Limpeza (0 = todas / imediato)
  const [snapshotDays, setSnapshotDays] = useState<number>(0);
  const [recordingDays, setRecordingDays] = useState<number>(0);
  const [allDays, setAllDays] = useState<number>(0);

  // Estados para Exclusão Total (100% Wipe)
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wipeConfirmation, setWipeConfirmation] = useState("");
  const [includeRetained, setIncludeRetained] = useState(false);
  const [wiping, setWiping] = useState(false);

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

  const handleWipeStorage = async () => {
    if (wipeConfirmation.trim().toUpperCase() !== "ZERAR") return;
    setWiping(true);
    setCleanFeedback(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/storage/wipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: wipeConfirmation.trim().toUpperCase(),
          include_retained: includeRetained
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCleanFeedback(`🔥 ${data.message}`);
        setWipeModalOpen(false);
        setWipeConfirmation("");
        setIncludeRetained(false);
        await fetchStorageStatus();
      } else {
        setCleanFeedback(`⚠️ Falha: ${data.detail || "Erro ao processar reset"}`);
      }
    } catch (e: any) {
      setCleanFeedback(`❌ Erro: ${e?.message || "Falha de rede"}`);
    } finally {
      setWiping(false);
      setTimeout(() => setCleanFeedback(null), 8000);
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
                <span className="text-sm font-bold text-slate-200">Limpar Fotos / Snapshots</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Fotos HD
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Remove capturas e snapshots temporários não fixados com estrela.
              </p>

              {/* Seletor de Período */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px] uppercase font-mono font-bold">Período:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { label: "Todas", days: 0 },
                    { label: "> 1d", days: 1 },
                    { label: "> 3d", days: 3 },
                    { label: "> 7d", days: 7 }
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setSnapshotDays(opt.days)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${snapshotDays === opt.days ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("snapshots", snapshotDays)}
              className="w-full py-2.5 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningAction === "snapshots" ? "Limpando Fotos..." : `Limpar Fotos (${snapshotDays === 0 ? "Todas" : "> " + snapshotDays + "d"})`}</span>
            </button>
          </div>

          {/* Card 2: Recordings */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Expurgar Vídeos</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  Vídeos MP4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Remove gravações MP4 ordinárias do SSD, preservando 100% dos eventos com estrela.
              </p>

              {/* Seletor de Período */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px] uppercase font-mono font-bold">Período:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { label: "Todos", days: 0 },
                    { label: "> 1d", days: 1 },
                    { label: "> 3d", days: 3 },
                    { label: "> 7d", days: 7 }
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setRecordingDays(opt.days)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${recordingDays === opt.days ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("recordings", recordingDays)}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningAction === "recordings" ? "Limpando Vídeos..." : `Expurgar Vídeos (${recordingDays === 0 ? "Todos" : "> " + recordingDays + "d"})`}</span>
            </button>
          </div>

          {/* Card 3: Purge All */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Limpeza de Mídia (Tudo)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  Vídeos + Fotos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Expurgo simultâneo de vídeos e fotos, mantendo sempre eventos favoritos intactos.
              </p>

              {/* Seletor de Período */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px] uppercase font-mono font-bold">Período:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { label: "Tudo", days: 0 },
                    { label: "> 1d", days: 1 },
                    { label: "> 3d", days: 3 },
                    { label: "> 7d", days: 7 }
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setAllDays(opt.days)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${allDays === opt.days ? "bg-rose-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("all", allDays)}
              className="w-full py-2.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleaningAction === "all" ? "Executando..." : `Limpar Tudo (${allDays === 0 ? "Sem Estrela" : "> " + allDays + "d"})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: 100% Storage Wipe */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-950/30 via-slate-900/90 to-slate-950/90 border border-rose-900/50 backdrop-blur-md shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Zona Crítica: Exclusão Total de Mídia (100%)</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 uppercase tracking-wider">
                  Ação Destrutiva
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Remove 100% dos vídeos MP4 (<code className="text-rose-300">recordings/</code>) e fotos HD (<code className="text-rose-300">clips/</code>) do SSD NVMe, liberando espaço de forma instantânea.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setWipeConfirmation("");
              setIncludeRetained(false);
              setWipeModalOpen(true);
            }}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-950/50 border border-rose-500/50 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Resetar Armazenamento (100%)</span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmação Segura com Trava 'ZERAR' */}
      {wipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-rose-800/80 shadow-2xl shadow-rose-950/80 overflow-hidden space-y-5 p-6 text-slate-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <ShieldAlert className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Confirmar Reset Total do SSD</h4>
                  <p className="text-xs text-rose-400 font-mono">Exclusão irreversível de gravações e fotos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWipeModalOpen(false)}
                disabled={wiping}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Details */}
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 space-y-1.5">
                <p className="font-bold text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  Atenção: Todos os arquivos de mídia física serão apagados!
                </p>
                <p className="text-[11px] text-slate-300 font-mono">
                  • Pastas afetadas: <span className="text-white">/media/frigate/recordings</span> e <span className="text-white">/media/frigate/clips</span>.
                  <br />
                  • Espaço atual em gravações: <span className="text-amber-300 font-bold">{storageData?.recordings_gb ?? 0} GB</span>.
                  <br />
                  • Espaço atual em fotos: <span className="text-cyan-300 font-bold">{storageData?.clips_mb ?? 0} MB</span>.
                </p>
              </div>

              {/* Checkbox de Favoritos com Estrela */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all select-none">
                <input
                  type="checkbox"
                  checked={includeRetained}
                  onChange={(e) => setIncludeRetained(e.target.checked)}
                  disabled={wiping}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Incluir e apagar também eventos favoritados com estrela (★)
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    {includeRetained 
                      ? "⚠️ ATENÇÃO: Nenhuma gravação será poupada. 100% de todo o histórico será destruído."
                      : "🛡️ SEGURO: Gravações e fotos que você favoritou com estrela serão 100% preservadas no SSD."}
                  </span>
                </div>
              </label>

              {/* Text Input Confirmation */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-300">
                  Para autorizar a exclusão, digite <span className="text-rose-400 font-mono font-black tracking-wider uppercase">ZERAR</span> abaixo:
                </label>
                <input
                  type="text"
                  value={wipeConfirmation}
                  onChange={(e) => setWipeConfirmation(e.target.value)}
                  disabled={wiping}
                  placeholder="Digite ZERAR"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-white font-mono font-bold text-center uppercase tracking-widest outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWipeModalOpen(false)}
                disabled={wiping}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleWipeStorage}
                disabled={wipeConfirmation.trim().toUpperCase() !== "ZERAR" || wiping}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-xs font-black uppercase tracking-wider text-white border border-rose-500/50 shadow-lg shadow-rose-950/60 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {wiping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Limpando SSD...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Confirmar e Zerar 100%</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

