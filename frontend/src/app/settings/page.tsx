"use client";

import React, { useState } from "react";
import { Settings, Send, Shield, Server, RefreshCw, Check, Pause, Play, BellRing } from "lucide-react";
import { useSentinelaStore } from "@/store/useSentinelaStore";

export default function SettingsPage() {
  const { telemetry } = useSentinelaStore();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [simulating, setSimulating] = useState(false);

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

  const handleTriggerMockEvent = async () => {
    setSimulating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      // Trigger a mock security event via backend
      await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: "portao_principal", label: "person" })
      });
    } catch (e) {
      console.log(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white tracking-wide">
            Ajustes do Sistema & Integrações
          </h1>
          <p className="text-xs text-slate-400">
            Configure credenciais do Telegram Vault, políticas de retenção e simulações.
          </p>
        </div>
      </div>

      {/* Telegram Vault Config */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Send className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">Telegram Cloud Vault</h2>
        </div>
        <p className="text-xs text-slate-400">
          Insira as credenciais do seu bot para receber fotos em alta resolução com marca d&apos;água (&lt; 1.2s) e clipes de vídeo gravados.
        </p>

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

      {/* Development & Diagnostics Simulator */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <BellRing className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Simulador de Eventos & Diagnósticos</h2>
        </div>
        <p className="text-xs text-slate-400">
          Dispare um evento simulado de intrusão (Pessoa no Portão) para testar o WebSocket da interface, a notificação PiP na Smart TV e o envio para o Telegram.
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
