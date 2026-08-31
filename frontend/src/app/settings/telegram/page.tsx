"use client";

import React, { useState, useEffect } from "react";
import { Send, Check, Shield, BellRing, Play, Terminal, HelpCircle, ExternalLink, AlertTriangle } from "lucide-react";

export default function TelegramSettingsPage() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  const fetchSettings = async () => {
    try {
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
    if (!botToken.trim() || !chatId.trim()) {
      setIsError(true);
      setTelegramStatus("⚠️ Preencha o Bot Token e o Chat ID antes de salvar.");
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/settings/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: botToken.trim(), chat_id: chatId.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bot_token) setBotToken(data.bot_token);
        if (data.chat_id) setChatId(data.chat_id);
        setSaveSuccess(true);
        setIsError(false);
        setTelegramStatus("✅ Credenciais gravadas com sucesso no banco de dados SQLite!");
        setTimeout(() => {
          setSaveSuccess(false);
          setTelegramStatus(null);
        }, 5000);
      } else {
        const errData = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        setIsError(true);
        setTelegramStatus(`⚠️ Erro ao gravar credenciais: ${errData.detail || "Falha no servidor"}`);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setTelegramStatus("⚠️ Falha de comunicação com o backend Sentinela.");
    }
  };

  const handleTestTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setIsError(true);
      setTelegramStatus("⚠️ Preencha o Bot Token e o Chat ID nos campos abaixo antes de testar.");
      return;
    }

    setTestingTelegram(true);
    setTelegramStatus(null);
    setIsError(false);

    try {
      const res = await fetch(`${apiUrl}/settings/telegram/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: botToken.trim(), chat_id: chatId.trim() })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        setIsError(true);
        setTelegramStatus(`⚠️ Erro de comunicação (${errData.detail || `HTTP ${res.status}`}). Certifique-se de que o backend está ativo.`);
        return;
      }

      const data = await res.json();
      if (data.status === "success") {
        setIsError(false);
        setTelegramStatus(`✅ ${data.message}`);
      } else {
        setIsError(true);
        setTelegramStatus(`⚠️ ${data.message || "Erro ao conectar com Telegram."}`);
      }
    } catch (err: any) {
      console.error("Test error:", err);
      setIsError(true);
      setTelegramStatus("⚠️ Falha ao se comunicar com o backend. Verifique se o container backend está em execução.");
    } finally {
      setTestingTelegram(false);
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
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 border transition-all ${
              isError
                ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
            }`}
          >
            {isError ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> : <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{telegramStatus}</span>
          </div>
        )}

        {/* Telegram Fast Setup Guide */}
        <div className="p-4 rounded-xl bg-obsidian-950/80 border border-slate-800 text-xs space-y-2">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            Como obter seu Token e Chat ID no Telegram em 1 minuto:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-400 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <strong className="text-slate-200 block">1. Criar o Robô:</strong>
              <p className="text-[11px]">
                Abra o <strong>@BotFather</strong> no Telegram, envie <code>/newbot</code> e copie o <strong>HTTP API Token</strong> gerado.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <strong className="text-slate-200 block">2. Iniciar Conversa:</strong>
              <p className="text-[11px]">
                Procure o seu robô recém-criado no Telegram e clique no botão <strong>Iniciar (/start)</strong> para autorizar mensagens.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <strong className="text-slate-200 block">3. Obter seu Chat ID:</strong>
              <p className="text-[11px]">
                Abra o robô <strong>@userinfobot</strong> no Telegram e copie o seu número de <strong>Id</strong> para colar abaixo.
              </p>
            </div>
          </div>
        </div>

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
