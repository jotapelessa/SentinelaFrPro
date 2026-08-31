"use client";

import React, { useState, useEffect } from "react";
import { Send, Check, Shield, BellRing, Play, Terminal, HelpCircle } from "lucide-react";

export default function TelegramSettingsPage() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/`);
      if (res.ok) {
        const data = await res.json();
        if (data.bot_token) setBotToken(data.bot_token);
        if (data.chat_id) setChatId(data.chat_id);
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
        const data = await res.json();
        if (data.bot_token) setBotToken(data.bot_token);
        if (data.chat_id) setChatId(data.chat_id);
        setSaveSuccess(true);
        setTelegramStatus("✅ Credenciais gravadas com sucesso no banco de dados SQLite!");
        setTimeout(() => {
          setSaveSuccess(false);
          setTelegramStatus(null);
        }, 4000);
      } else {
        setTelegramStatus("⚠️ Erro ao gravar credenciais no servidor.");
      }
    } catch (err) {
      console.error(err);
      setTelegramStatus("⚠️ Falha de comunicação com o servidor.");
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
        setTelegramStatus("✅ Mensagem de teste enviada com sucesso no seu Telegram!");
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

  const handleTriggerMockEvent = async () => {
    setSimulating(true);
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
    <div className="space-y-6">
      {/* Telegram Vault Config */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Credenciais do Telegram Cloud Vault</h2>
          </div>
          <button
            type="button"
            disabled={testingTelegram}
            onClick={handleTestTelegram}
            className="px-3.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all disabled:opacity-50"
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
                Bot API Token (criado no @BotFather)
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Chat ID de Destino (usuário ou grupo)
              </label>
              <input
                type="text"
                placeholder="123456789 ou -100..."
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              {saveSuccess && <Check className="w-4 h-4" />}
              <span>{saveSuccess ? "Credenciais Gravadas com Sucesso!" : "Salvar Credenciais no Banco"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Bot Interactive Commands Cheatsheet */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Comandos Interativos do Bot (24/7 Ativo)</h2>
        </div>
        <p className="text-xs text-slate-400">
          Você pode enviar estes comandos diretamente no chat do Telegram com seu robô:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-cyan-400 block font-bold">📸 /snapshot</strong>
            <span className="text-slate-400 text-[11px] block">Captura e envia foto com marca d&apos;água HUD ao vivo da câmera principal.</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-cyan-400 block font-bold">📊 /status</strong>
            <span className="text-slate-400 text-[11px] block">Retorna uso de CPU, temperatura, memória RAM, SSD NVMe e câmeras.</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-cyan-400 block font-bold">⏸️ /pausar 60</strong>
            <span className="text-slate-400 text-[11px] block">Suspende alertas de movimento por 60 minutos (ou tempo informado).</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-cyan-400 block font-bold">▶️ /retomar</strong>
            <span className="text-slate-400 text-[11px] block">Reativa o envio imediato de notificações de movimento.</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-cyan-400 block font-bold">💾 /backup</strong>
            <span className="text-slate-400 text-[11px] block">Envia o arquivo sentinela.db diretamente como anexo no Telegram.</span>
          </div>

          <div className="p-3 rounded-xl bg-obsidian-950/70 border border-slate-800 space-y-1">
            <strong className="text-cyan-400 block font-bold">❓ /ajuda</strong>
            <span className="text-slate-400 text-[11px] block">Exibe o menu de instruções e comandos no chat.</span>
          </div>
        </div>
      </div>

      {/* Test Event Simulator */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <BellRing className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Simulador de Notificação de Alerta</h2>
        </div>
        <p className="text-xs text-slate-400">
          Dispare um evento de intrusão simulado (Pessoa no Portão) para testar o envio de foto clássica com hashtags para Telegram Drive.
        </p>
        <button
          disabled={simulating}
          onClick={handleTriggerMockEvent}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4 text-amber-400 fill-current" />
          <span>{simulating ? "Disparando..." : "Disparar Alerta Simulado no Telegram"}</span>
        </button>
      </div>
    </div>
  );
}
