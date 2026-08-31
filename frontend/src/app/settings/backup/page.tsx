"use client";

import React, { useState } from "react";
import { Download, Send, HardDrive, ShieldCheck, Database, RefreshCw, Check } from "lucide-react";

export default function BackupSettingsPage() {
  const [downloadingDb, setDownloadingDb] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  const handleDownloadDatabase = async () => {
    setDownloadingDb(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/backup/db`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sentinela_backup_${new Date().toISOString().slice(0, 10)}.db`;
        a.click();
      } else {
        alert("Não foi possível baixar o banco de dados. Verifique os logs do servidor.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de comunicação com o servidor.");
    } finally {
      setDownloadingDb(false);
    }
  };

  const handleDownloadJson = async () => {
    setDownloadingJson(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/backup`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sentinela_config_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleSendBackupToTelegram = async () => {
    setSendingTelegram(true);
    setTelegramStatus(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/backup/telegram`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTelegramStatus("✅ Arquivo sentinela.db enviado com sucesso para o seu Telegram!");
      } else {
        setTelegramStatus(`⚠️ ${data.detail || "Erro ao enviar backup para Telegram."}`);
      }
    } catch {
      setTelegramStatus("⚠️ Falha de comunicação com o servidor.");
    } finally {
      setSendingTelegram(false);
      setTimeout(() => setTelegramStatus(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database Backup Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Backup do Banco de Dados SQLite (sentinela.db)</h2>
        </div>
        <p className="text-xs text-slate-400">
          O banco de dados SQLite armazena o histórico completo de câmeras, zonas e máscaras cadastradas, credenciais do Telegram, registros de eventos e dispositivos pareados.
        </p>

        {telegramStatus && (
          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
            {telegramStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Direct File Download */}
          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <strong className="text-sm font-bold text-white block">Download Direto (.DB)</strong>
              <span className="text-xs text-slate-400">Baixe o arquivo binário sentinela.db para armazenamento local seguro.</span>
            </div>
            <button
              disabled={downloadingDb}
              onClick={handleDownloadDatabase}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingDb ? "Baixando..." : "Baixar sentinela.db"}</span>
            </button>
          </div>

          {/* Send to Telegram */}
          <div className="p-4 rounded-xl bg-obsidian-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <strong className="text-sm font-bold text-white block">Despacho para o Telegram</strong>
              <span className="text-xs text-slate-400">Envia o arquivo do banco diretamente no seu chat privado do Telegram.</span>
            </div>
            <button
              disabled={sendingTelegram}
              onClick={handleSendBackupToTelegram}
              className="w-full px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sendingTelegram ? "Enviando para Telegram..." : "Enviar Backup no Telegram"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* JSON Snapshot Backup */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">Snapshot de Configurações em JSON</h2>
        </div>
        <p className="text-xs text-slate-400">
          Exporte um arquivo leve em formato texto JSON com todas as configurações de câmeras e telas pareadas.
        </p>
        <button
          disabled={downloadingJson}
          onClick={handleDownloadJson}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>{downloadingJson ? "Gerando JSON..." : "Exportar Snapshot JSON"}</span>
        </button>
      </div>
    </div>
  );
}
