"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Send, HardDrive, Activity, Terminal, Moon, Volume2, VolumeX, ArrowRight, ShieldCheck, Check } from "lucide-react";

export default function SettingsHubPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState(23);
  const [dndEnd, setDndEnd] = useState(6);
  const [dndSaved, setDndSaved] = useState(false);

  useEffect(() => {
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
