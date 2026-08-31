"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, Copy, Check, Pause, Play, Download, Search, ShieldCheck } from "lucide-react";

export default function LogsSettingsPage() {
  const [service, setService] = useState("backend");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState("ALL");
  const [downloading, setDownloading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/telemetry/logs?service=${service}&lines=150`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3500);
    return () => clearInterval(interval);
  }, [service, autoRefresh]);

  useEffect(() => {
    if (autoRefresh && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoRefresh]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDiagnostic = async () => {
    setDownloading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/telemetry/logs/download`);
      if (!res.ok) throw new Error("Falha ao gerar relatório de diagnóstico");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentinela_diagnostico_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Erro no download: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const filteredLogs = logs.filter((line) => {
    const matchesSearch = !searchTerm || line.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = 
      logLevel === "ALL" || 
      (logLevel === "ERROR" && (line.includes("ERROR") || line.includes("CRITICAL") || line.includes("fail") || line.includes("Exception"))) ||
      (logLevel === "WARNING" && (line.includes("WARN") || line.includes("WARNING"))) ||
      (logLevel === "INFO" && line.includes("INFO"));
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Diagnostic Download */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Observabilidade & Logs Unificados 360°
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Auditoria Ativa
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Rastreamento em tempo real de requisições HTTP, eventos ROI de IA, MQTT e comandos do Telegram.
            </p>
          </div>
        </div>

        {/* Full Diagnostic Download Button */}
        <button
          onClick={handleDownloadDiagnostic}
          disabled={downloading}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{downloading ? "Gerando Relatório..." : "Baixar Pacote de Diagnóstico (.txt)"}</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
        {/* Service Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-obsidian-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: "backend", label: "Sentinela Core" },
            { id: "frigate", label: "Frigate NVR" },
            { id: "go2rtc", label: "go2rtc WebRTC" },
            { id: "mosquitto", label: "Mosquitto MQTT" },
            { id: "nginx", label: "Nginx Proxy" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setService(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                service === s.id
                  ? "bg-cyan-500 text-obsidian-950 font-bold shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrar logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-48"
            />
          </div>

          {/* Level Filter */}
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todos os Níveis</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>

          {/* Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoRefresh ? "Auto-Scroll" : "Pausado"}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyLogs}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
            title="Copiar Logs para Área de Transferência"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={terminalRef}
        className="w-full h-[62vh] bg-obsidian-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-y-auto shadow-2xl space-y-1 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic p-6 text-center">
            Nenhuma linha de log encontrada com os filtros atuais para <span className="text-cyan-400">[{service}]</span>.
          </div>
        ) : (
          filteredLogs.map((line, idx) => {
            let color = "text-slate-300";
            if (line.includes("ERROR") || line.includes("CRITICAL") || line.includes("fail") || line.includes("Exception") || line.includes("❌")) {
              color = "text-rose-400 font-bold bg-rose-950/30 px-1.5 py-0.5 rounded border-l-2 border-rose-500";
            } else if (line.includes("WARN") || line.includes("WARNING") || line.includes("⚠️")) {
              color = "text-amber-300 bg-amber-950/20 px-1 py-0.5 rounded";
            } else if (line.includes("✅") || line.includes("ONLINE") || line.includes("connected") || line.includes("Subscribed")) {
              color = "text-emerald-400 font-medium";
            } else if (line.includes("🌐 [HTTP]")) {
              color = "text-cyan-300";
            } else if (line.includes("🚨") || line.includes("Qualifying")) {
              color = "text-amber-400 font-bold bg-amber-950/30 px-1 py-0.5 rounded";
            } else if (line.includes("🤖") || line.includes("Telegram")) {
              color = "text-indigo-300";
            }
            return (
              <div key={idx} className={`${color} whitespace-pre-wrap break-all hover:bg-slate-900/60 px-1 rounded transition-colors`}>
                {line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

