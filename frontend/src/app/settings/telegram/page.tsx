"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, 
  Check, 
  Shield, 
  BellRing, 
  Play, 
  Terminal, 
  HelpCircle, 
  ExternalLink, 
  AlertTriangle,
  Film,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Layers
} from "lucide-react";

export default function TelegramSettingsPage() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  
  // Media Customization State
  const [clipDuration, setClipDuration] = useState<number>(15);
  const [snapshotResolution, setSnapshotResolution] = useState<string>("1080p");
  const [videoQuality, setVideoQuality] = useState<string>("balanced");
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [sendMode, setSendMode] = useState<string>("both");

  // Status & Feedback State
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
        if (data.clip_duration_seconds) setClipDuration(data.clip_duration_seconds);
        if (data.snapshot_resolution) setSnapshotResolution(data.snapshot_resolution);
        if (data.video_quality) setVideoQuality(data.video_quality);
        if (typeof data.include_audio === "boolean") setIncludeAudio(data.include_audio);
        if (data.send_mode) setSendMode(data.send_mode);
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
      const payload = {
        bot_token: botToken.trim(),
        chat_id: chatId.trim(),
        clip_duration_seconds: clipDuration,
        snapshot_resolution: snapshotResolution,
        video_quality: videoQuality,
        include_audio: includeAudio,
        send_mode: sendMode
      };

      const res = await fetch(`${apiUrl}/settings/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setIsError(false);
        setTelegramStatus("✅ Configurações e parâmetros de mídia salvos com sucesso!");
        setTimeout(() => {
          setSaveSuccess(false);
          setTelegramStatus(null);
        }, 5000);
      } else {
        const errData = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        setIsError(true);
        setTelegramStatus(`⚠️ Erro ao salvar: ${errData.detail || "Falha no servidor"}`);
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
        setTelegramStatus(`⚠️ Erro de comunicação (${errData.detail || `HTTP ${res.status}`}).`);
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
      setTelegramStatus("⚠️ Falha ao se comunicar com o backend.");
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTriggerMockEvent = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${apiUrl}/devices/test-pip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camera_name: "camera_principal", label: "person" })
      });
      if (res.ok) {
        alert("Alerta de teste enviado com sucesso!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Telegram Credentials & Media Form */}
      <form onSubmit={handleSaveTelegram} className="space-y-6">
        
        {/* Credentials Box */}
        <div className="p-6 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Credenciais do Telegram Cloud Vault</h2>
                <p className="text-xs text-slate-400">Armazenamento seguro com envio imediato de alertas em alta prioridade</p>
              </div>
            </div>
            <button
              type="button"
              disabled={testingTelegram}
              onClick={handleTestTelegram}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{testingTelegram ? "Testando..." : "Testar Conexão"}</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bot API Token (gerado no @BotFather)
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Media Customization & Video Clip Settings Box */}
        <div className="p-6 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 space-y-5 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personalização de Vídeos & Fotos Gravadas</h2>
              <p className="text-xs text-slate-400">Controle o tamanho, duração, resolução e compressão dos clipes enviados ao Telegram</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Video Clip Duration */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Film className="w-4 h-4 text-cyan-400" />
                <span>Duração do Clipe de Vídeo</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Tempo total do vídeo gravado durante a detecção do evento.
              </p>
              <select
                value={clipDuration}
                onChange={(e) => setClipDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={5}>5 segundos (Ultra Rápido)</option>
                <option value={10}>10 segundos (Compacto)</option>
                <option value={15}>15 segundos (Padrão Recomendado)</option>
                <option value={20}>20 segundos (Completo)</option>
                <option value={30}>30 segundos (Detalhamento Alto)</option>
                <option value={45}>45 segundos (Estendido)</option>
                <option value={60}>60 segundos (1 Minuto)</option>
              </select>
            </div>

            {/* Snapshot Resolution */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Resolução da Foto (Snapshot)</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Qualidade da foto com marca d&apos;água HUD enviada no alerta imediato.
              </p>
              <select
                value={snapshotResolution}
                onChange={(e) => setSnapshotResolution(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="1080p">Full HD 1080p (Nítido & Balanceado)</option>
                <option value="720p">HD 720p (Envio Leve e Rápido)</option>
                <option value="original">Original da Câmera (4K / 2K Nativo)</option>
              </select>
            </div>

            {/* Video Quality & Compression */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Qualidade de Compressão de Vídeo</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Aceleração gráfica via hardware Intel QuickSync (QSV).
              </p>
              <select
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="high">Alta Nitidez (Bitrate Elevado / Maior Detalhe)</option>
                <option value="balanced">Balanceada (Recomendada / Menor Consumo)</option>
                <option value="fast">Econômica (Ultra Rápido para 4G / Dados Móveis)</option>
              </select>
            </div>

            {/* Send Mode & Audio Toggle */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Modo de Envio do Alerta
                </label>
                <select
                  value={sendMode}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="both">📸 Foto Imediata + 🎬 Vídeo Gravado (Completo)</option>
                  <option value="photo_only">📸 Apenas Foto Instantânea (Mais Rápido)</option>
                  <option value="video_only">🎬 Apenas Vídeo MP4 com Marca d&apos;água</option>
                </select>
              </div>

              {/* Audio Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {includeAudio ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  <span className="text-xs font-semibold text-slate-300">Incluir Áudio no Vídeo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeAudio(!includeAudio)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    includeAudio ? "bg-cyan-500" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      includeAudio ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              {saveSuccess && <Check className="w-4 h-4" />}
              <span>{saveSuccess ? "Configurações Gravadas!" : "Salvar Todas as Configurações"}</span>
            </button>
          </div>
        </div>

      </form>

      {/* 3. Fast Setup Guide Box */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400" />
          Guia Rápido: Obter Token e Chat ID no Telegram
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-400">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-slate-200 text-xs block">1. Criar o Robô:</strong>
            <p className="text-[11px] leading-relaxed">
              Abra o <strong>@BotFather</strong> no Telegram, digite <code>/newbot</code> e copie o <strong>HTTP API Token</strong> gerado.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-slate-200 text-xs block">2. Iniciar Conversa:</strong>
            <p className="text-[11px] leading-relaxed">
              Procure o seu robô no Telegram e clique no botão <strong>Iniciar (/start)</strong> para liberar o recebimento de mensagens.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-slate-200 text-xs block">3. Obter seu Chat ID:</strong>
            <p className="text-[11px] leading-relaxed">
              Abra o <strong>@userinfobot</strong> no Telegram e copie seu número de <strong>Id</strong> para colar no campo acima.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Interactive Commands Cheatsheet */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Comandos Interativos no Chat (24/7)</h2>
        </div>
        <p className="text-xs text-slate-400">
          Envie esses comandos no chat privado com o robô ou no grupo de segurança:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 block font-bold">📸 /snapshot</strong>
            <span className="text-slate-400 text-[11px] block">Captura e envia foto com marca d&apos;água HUD ao vivo da câmera principal.</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 block font-bold">📊 /status</strong>
            <span className="text-slate-400 text-[11px] block">Retorna uso de CPU, temperatura, memória RAM, SSD NVMe e contêineres.</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 block font-bold">⏸️ /pausar 60</strong>
            <span className="text-slate-400 text-[11px] block">Suspende alertas de movimento por 60 minutos (ou tempo customizado).</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 block font-bold">▶️ /retomar</strong>
            <span className="text-slate-400 text-[11px] block">Reativa o envio imediato de notificações de movimento.</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 block font-bold">💾 /backup</strong>
            <span className="text-slate-400 text-[11px] block">Envia o banco SQLite sentinela.db diretamente como anexo no Telegram.</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 block font-bold">❓ /ajuda</strong>
            <span className="text-slate-400 text-[11px] block">Exibe o menu de instruções e comandos no chat.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
