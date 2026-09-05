"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Send, HardDrive, Activity, Terminal, Moon, Volume2, VolumeX, ArrowRight, ShieldCheck, Check, Trash2, RefreshCw, AlertTriangle, Sparkles, FolderArchive, Layers } from "lucide-react";

export default function SettingsHubPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState(23);
  const [dndEnd, setDndEnd] = useState(6);
  const [dndSaved, setDndSaved] = useState(false);

  // Storage NVMe State
  const [storageData, setStorageData] = useState<any>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  const fetchStorageStatus = async () => {
    setStorageLoading(true);
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
      setStorageLoading(false);
    }
  };

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
        setCleanFeedback(`✅ ${data.message}`);
        await fetchStorageStatus();
      } else {
        setCleanFeedback(`⚠️ Falha: ${data.detail || "Erro ao processar"}`);
      }
    } catch (e: any) {
      setCleanFeedback(`❌ Erro: ${e?.message || "Falha de rede"}`);
    } finally {
      setCleaningAction(null);
      setTimeout(() => setCleanFeedback(null), 4500);
    }
  };

  useEffect(() => {
    fetchStorageStatus();
    const fetchDND = async () => {

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
        const res = await fetch(`${apiUrl}/settings/`);
        if (res.ok) {
          const data = await res.json();
          setDndEnabled(Boolean(data.dnd_enabled));
          setDndStart(Number(data.dnd_start_hour || 23));
          setDndEnd(Number(data.dnd_end_hour || 6));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDND();

    const storedSound = localStorage.getItem("sentinela_sound_alerts");
    if (storedSound !== null) {
      setSoundEnabled(storedSound === "true");
    }
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem("sentinela_sound_alerts", String(nextState));
  };

  const handleSaveDND = async (enabledVal = dndEnabled, startVal = dndStart, endVal = dndEnd) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/settings/dnd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: enabledVal, start_hour: startVal, end_hour: endVal })
      });
      setDndSaved(true);
      setTimeout(() => setDndSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const sections = [
    {
      title: "✈️ Telegram Cloud Vault",
      href: "/settings/telegram",
      desc: "Configure o Token da API, Chat ID de destino, teste de notificações e comandos interativos.",
      badge: "Notificações & Bot"
    },
    {
      title: "💾 Backup & Recuperação",
      href: "/settings/backup",
      desc: "Baixe o banco SQLite real (sentinela.db), exporte snapshots JSON ou envie backups para o Telegram.",
      badge: "Segurança de Dados"
    },
    {
      title: "🩺 Diagnósticos & Hardware",
      href: "/settings/diagnostics",
      desc: "Monitore a telemetria do Intel Jasper Lake N5105, aceleração VAAPI /dev/dri e serviços do Frigate.",
      badge: "Saúde do Sistema"
    },
    {
      title: "📋 Logs do Sistema ao Vivo",
      href: "/settings/logs",
      desc: "Terminal interativo para visualização de logs do Sentinela Core, Frigate NVR e go2rtc.",
      badge: "Depuração em Tempo Real"
    },
  ];

  return (
    <div className="space-y-6">
      {/* 💽 NOVO CARD DEDICADO: ARMAZENAMENTO & SSD NVMe DO SERVIDOR UBUNTU */}
      <div className="glass-panel rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-obsidian-950 to-slate-900/90 shadow-2xl relative overflow-hidden space-y-5">
        {/* Glow de fundo */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide">
                  Armazenamento & SSD NVMe (Ubuntu Server)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold uppercase">
                  {storageData?.mount || "/media/frigate"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold">
                  {storageData?.health === "healthy" ? "100% SAUDÁVEL" : "ATENÇÃO"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoramento de integridade e ferramentas de manutenção rápida para vídeos e fotos do Frigate NVR.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStorageStatus}
            disabled={storageLoading}
            className="self-start sm:self-auto p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 text-xs flex items-center gap-1.5 font-bold disabled:opacity-50"
            title="Atualizar métricas de disco"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${storageLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Feedback visual de limpeza */}
        {cleanFeedback && (
          <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-200 animate-fadeIn flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{cleanFeedback}</span>
          </div>
        )}

        {/* Breakdown de Espaço e Barra de Uso */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1">
            <span className="text-slate-300 flex items-center gap-2">
              <span className="font-bold text-white text-sm">{storageData?.used_gb ?? 110.0} GB</span> ocupados de
              <span className="text-slate-400">{storageData?.total_gb ?? 468.0} GB Total</span>
            </span>
            <span className="text-cyan-400 font-black text-sm">
              {storageData?.free_gb ?? 334.0} GB LIVRES ({100 - (storageData?.percent ?? 25)}%)
            </span>
          </div>

          {/* Barra de Progresso com Gradiente */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-sm shadow-cyan-500/50"
              style={{ width: `${Math.min(storageData?.percent ?? 25, 100)}%` }}
            />
          </div>

          {/* Sub-métricas: Vídeos vs Fotos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
              <FolderArchive className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Gravações (Vídeos MP4)</div>
                <div className="text-xs font-mono font-bold text-white">{storageData?.recordings_gb ?? 76.0} GB</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Capturas & Fotos HD</div>
                <div className="text-xs font-mono font-bold text-white">{storageData?.clips_mb ?? 543.0} MB</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Eventos Fixados (Estrela)</div>
                <div className="text-xs font-mono font-bold text-emerald-300">100% Preservados</div>
              </div>
            </div>
          </div>
        </div>

        {/* Ferramentas de Limpeza do SSD */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Ferramentas de Manutenção & Limpeza Imediata
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Preserva automaticamente gravações com estrela
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("snapshots", 3)}
              className="p-3 rounded-xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group flex flex-col justify-between space-y-1.5 disabled:opacity-50"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                <span>Limpar Fotos Antigas</span>
                <span className="text-[10px] font-mono text-cyan-400">&gt; 3 dias</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {cleaningAction === "snapshots" ? "Excluindo fotos..." : "Remove fotos de capturas temporárias sem estrela."}
              </p>
            </button>

            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("recordings", 3)}
              className="p-3 rounded-xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all group flex flex-col justify-between space-y-1.5 disabled:opacity-50"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors flex items-center justify-between">
                <span>Expurgar Vídeos</span>
                <span className="text-[10px] font-mono text-amber-400">&gt; 3 dias</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {cleaningAction === "recordings" ? "Expurgando vídeos..." : "Exclui clipes e sincroniza o banco SQLite com o Frigate."}
              </p>
            </button>

            <button
              type="button"
              disabled={cleaningAction !== null}
              onClick={() => handleCleanStorage("all", 7)}
              className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-left transition-all group flex flex-col justify-between space-y-1.5 disabled:opacity-50"
            >
              <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 transition-colors flex items-center justify-between">
                <span>Limpeza Profunda</span>
                <span className="text-[10px] font-mono text-rose-400">&gt; 7 dias</span>
              </div>
              <p className="text-[11px] text-rose-300/80">
                {cleaningAction === "all" ? "Processando limpeza..." : "Libera espaço em massa de gravações e fotos antigas."}
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Dedicated Setting Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="group glass-panel rounded-2xl p-5 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-cyan-500/5"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {sec.title}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {sec.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {sec.desc}
              </p>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Abrir configurações</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Sound Chimes & Browser Alerts */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            <h2 className="text-base font-bold text-white">Alertas Sonoros no Navegador</h2>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              soundEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {soundEnabled ? "Som Ativado 🔔" : "Mudo 🔇"}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Toca um sinal sonoro suave quando uma pessoa for detectada no portão ou zonas prioritárias.
        </p>
      </div>

      {/* DND (Do Not Disturb) Night Schedule */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Modo Não Perturbe (DND Noturno)</h2>
            {dndSaved && <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">✓ Salvo</span>}
          </div>
          <input
            type="checkbox"
            checked={dndEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              setDndEnabled(checked);
              handleSaveDND(checked, dndStart, dndEnd);
            }}
            className="w-5 h-5 accent-cyan-500 cursor-pointer"
          />
        </div>
        <p className="text-xs text-slate-400">
          Suspende notificações na Smart TV durante a madrugada para não interromper seu descanso.
        </p>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-300">Silenciar das:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={dndStart}
            onChange={(e) => {
              const val = Number(e.target.value);
              setDndStart(val);
              handleSaveDND(dndEnabled, val, dndEnd);
            }}
            className="w-16 px-2 py-1 rounded bg-obsidian-950 border border-slate-800 text-white font-bold"
          />
          <span className="text-slate-300">h até às</span>
          <input
            type="number"
            min={0}
            max={23}
            value={dndEnd}
            onChange={(e) => {
              const val = Number(e.target.value);
              setDndEnd(val);
              handleSaveDND(dndEnabled, dndStart, val);
            }}
            className="w-16 px-2 py-1 rounded bg-obsidian-950 border border-slate-800 text-white font-bold"
          />
          <span className="text-slate-300">h</span>
        </div>
      </div>
    </div>
  );
}
