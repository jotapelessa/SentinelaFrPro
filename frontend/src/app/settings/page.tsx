"use client";

import React, { useState, useEffect } from "react";
import { Settings, Send, Shield, Server, RefreshCw, Check, Pause, Play, BellRing, Volume2, VolumeX, Download, Upload, Moon, Sun, ShieldCheck } from "lucide-react";
import { useSentinelaStore } from "@/store/useSentinelaStore";

export default function SettingsPage() {
  const { telemetry } = useSentinelaStore();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Sound chime state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // DND State
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState(23);
  const [dndEnd, setDndEnd] = useState(6);

  const fetchSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/`);
      if (res.ok) {
        const data = await res.json();
        setDndEnabled(data.dnd_enabled || false);
        setDndStart(data.dnd_start_hour || 23);
        setDndEnd(data.dnd_end_hour || 6);
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio not supported:", e);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: botToken, chat_id: chatId })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramStatus(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/telegram/test`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setTelegramStatus("✅ Mensagem enviada com sucesso no seu Telegram!");
      } else {
        setTelegramStatus(`⚠️ ${data.message || "Erro ao conectar com Telegram"}`);
      }
    } catch {
      setTelegramStatus("⚠️ Falha ao se comunicar com o backend.");
    } finally {
      setTestingTelegram(false);
      setTimeout(() => setTelegramStatus(null), 6000);
    }
  };

  const handleSaveDND = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/settings/dnd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: dndEnabled, start_hour: dndStart, end_hour: dndEnd })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/backup`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sentinela_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
      }
    } catch (e) {
      console.error("Failed to backup:", e);
    }
  };

  const handleTriggerMockEvent = async () => {
    setSimulating(true);
    if (soundEnabled) playChimeSound();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: "camera_principal", label: "person" })
      });
    } catch (e) {
      console.log(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white tracking-wide">
            Ajustes do Sistema & Automações
          </h1>
          <p className="text-xs text-slate-400">
            Configure credenciais do Telegram, alertas sonoros, modo Não Perturbe e backups.
          </p>
        </div>
      </div>

      {/* Telegram Vault Config */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Notificações no Telegram</h2>
          </div>
          <button
            type="button"
            disabled={testingTelegram}
            onClick={handleTestTelegram}
            className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all disabled:opacity-50"
          >
            {testingTelegram ? "Enviando..." : "Testar Bot no Telegram"}
          </button>
        </div>

        {telegramStatus && (
          <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/30 text-xs text-sky-300 font-semibold">
            {telegramStatus}
          </div>
        )}

        <form onSubmit={handleSaveTelegram} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bot API Token
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Chat ID de Destino
              </label>
              <input
                type="text"
                placeholder="123456789 ou -100..."
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              {saveSuccess && <Check className="w-4 h-4" />}
              <span>{saveSuccess ? "Configurações Salvas!" : "Salvar Credenciais"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sound Chimes & Browser Alerts */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            <h2 className="text-base font-bold text-white">Alertas Sonoros no Navegador</h2>
          </div>
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChimeSound();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              soundEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {soundEnabled ? "Som Ativado 🔔" : "Mudo 🔇"}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Toca um sinal sonoro elegante no navegador toda vez que uma pessoa for detectada no portão.
        </p>
        <button
          onClick={playChimeSound}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
        >
          <span>Testar Som de Alerta</span>
        </button>
      </div>

      {/* DND (Do Not Disturb) Night Schedule */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Modo Não Perturbe (DND Noturno)</h2>
          </div>
          <input
            type="checkbox"
            checked={dndEnabled}
            onChange={(e) => {
              setDndEnabled(e.target.checked);
              handleSaveDND();
            }}
            className="w-5 h-5 accent-cyan-500 cursor-pointer"
          />
        </div>
        <p className="text-xs text-slate-400">
          Suspende notificações na Smart TV durante a madrugada para não interromper seu sono.
        </p>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-300">Silenciar das:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={dndStart}
            onChange={(e) => {
              setDndStart(Number(e.target.value));
              handleSaveDND();
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
              setDndEnd(Number(e.target.value));
              handleSaveDND();
            }}
            className="w-16 px-2 py-1 rounded bg-obsidian-950 border border-slate-800 text-white font-bold"
          />
          <span className="text-slate-300">h</span>
        </div>
      </div>

      {/* Backup & System Data */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Backup do Sistema & Configurações</h2>
        </div>
        <p className="text-xs text-slate-400">
          Exporte um snapshot de segurança com todas as câmeras, telas pareadas e credenciais.
        </p>
        <button
          onClick={handleDownloadBackup}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Backup Completo (JSON)</span>
        </button>
      </div>

      {/* Development & Diagnostics Simulator */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <BellRing className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Simulador de Eventos & Diagnósticos</h2>
        </div>
        <p className="text-xs text-slate-400">
          Dispare um evento simulado de intrusão (Pessoa no Portão) para testar o WebSocket da interface, o som de chime, a TV e o Telegram.
        </p>

        <button
          disabled={simulating}
          onClick={handleTriggerMockEvent}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4 text-amber-400 fill-current" />
          <span>{simulating ? "Disparando..." : "Disparar Evento Simulado de Teste"}</span>
        </button>
      </div>
    </div>
  );
}
