"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  Copy, 
  Check, 
  Pause, 
  Play, 
  Download, 
  Search, 
  ShieldCheck, 
  Layers, 
  Video, 
  Send, 
  Tv, 
  Eye, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle,
  ArrowUpDown,
  Filter
} from "lucide-react";

interface AuditLogItem {
  id: number;
  action: string;
  module: string;
  severity: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  details?: string;
  client_ip?: string;
  created_at: string;
}

export default function LogsSettingsPage() {
  const [viewMode, setViewMode] = useState<"unified" | "containers">("unified");
  
  // Unified Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  
  // Container Raw Logs State
  const [service, setService] = useState("backend");
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [rawNewestFirst, setRawNewestFirst] = useState(true);

  // Common Controls
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Fetch Unified Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const params = new URLSearchParams({
        module: selectedModule,
        severity: selectedSeverity,
        search: searchTerm.trim(),
        limit: "250"
      });
      const res = await fetch(`${apiUrl}/telemetry/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Error fetching audit logs:", e);
    }
  };

  // Fetch Raw Service Logs
  const fetchRawLogs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/telemetry/logs?service=${service}&lines=200`);
      if (res.ok) {
        const data = await res.json();
        setRawLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Error fetching raw logs:", e);
    }
  };

  useEffect(() => {
    if (viewMode === "unified") {
      fetchAuditLogs();
    } else {
      fetchRawLogs();
    }
  }, [viewMode, selectedModule, selectedSeverity, searchTerm, service]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (viewMode === "unified") {
        fetchAuditLogs();
      } else {
        fetchRawLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, viewMode, selectedModule, selectedSeverity, searchTerm, service]);

  // Copy to clipboard helper
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator?.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("Async clipboard failed:", err);
      }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      return false;
    }
  };

  const handleCopyLogs = async () => {
    let textToCopy = "";
    if (viewMode === "unified") {
      textToCopy = auditLogs.map(l => `[${l.created_at}] [${l.module}] [${l.severity}] ${l.action}: ${l.details || ""} (${l.client_ip})`).join("\n");
    } else {
      textToCopy = (rawNewestFirst ? [...rawLogs].reverse() : rawLogs).join("\n");
    }
    if (!textToCopy) return;

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
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

  const getModuleBadge = (mod: string) => {
    switch (mod?.toUpperCase()) {
      case "CAMERA":
        return { label: "Câmeras", icon: Video, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
      case "TELEGRAM":
        return { label: "Telegram", icon: Send, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" };
      case "PIP":
        return { label: "Telas & PiP", icon: Tv, color: "text-teal-400 bg-teal-500/10 border-teal-500/30" };
      case "FRIGATE":
        return { label: "Frigate IA", icon: Eye, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" };
      case "SYSTEM":
      case "SETTINGS":
        return { label: "Sistema", icon: Server, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
      default:
        return { label: mod || "Geral", icon: Layers, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case "SUCCESS":
        return { label: "SUCESSO", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
      case "WARNING":
        return { label: "ALERTA", icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
      case "ERROR":
        return { label: "ERRO", icon: XCircle, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
      default:
        return { label: "INFO", icon: Info, color: "text-slate-300 bg-slate-800 border-slate-700" };
    }
  };

  const displayedRawLogs = rawNewestFirst ? [...rawLogs].reverse() : rawLogs;
  const filteredRawLogs = displayedRawLogs.filter(line => !searchTerm || line.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Top Banner & Diagnostic Download */}
      <div className="p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Observabilidade & Logs Unificados 360°
            </h2>
            <p className="text-xs text-slate-400">
              Histórico consolidado em tempo real com eventos mais recentes no topo
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              autoRefresh 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20" 
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {autoRefresh ? <Play className="w-3.5 h-3.5 fill-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{autoRefresh ? "Ao Vivo (3s)" : "Pausado"}</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>

          <button
            onClick={handleDownloadDiagnostic}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Gerando..." : "Relatório .TXT"}</span>
          </button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setViewMode("unified")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "unified"
                ? "bg-cyan-500 text-obsidian-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🛡️ Auditoria Geral (Todas as Áreas)</span>
          </button>

          <button
            onClick={() => setViewMode("containers")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === "containers"
                ? "bg-cyan-500 text-obsidian-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>💻 Terminal de Contêineres</span>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar eventos ou logs..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* VIEW 1: UNIFIED MULTI-AREA AUDIT LOGS (NEWEST FIRST) */}
      {viewMode === "unified" && (
        <div className="space-y-3">
          
          {/* Area Filter Buttons Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "ALL", label: "Todas as Áreas", icon: Layers },
                { id: "CAMERA", label: "Câmeras", icon: Video },
                { id: "TELEGRAM", label: "Telegram", icon: Send },
                { id: "PIP", label: "Telas & PiP", icon: Tv },
                { id: "FRIGATE", label: "Frigate IA", icon: Eye },
                { id: "SYSTEM", label: "Sistema", icon: Server },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedModule === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedModule(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Severity Quick Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todos os Níveis</option>
                <option value="SUCCESS">Apenas Sucesso</option>
                <option value="INFO">Apenas Informativos</option>
                <option value="WARNING">Apenas Avisos / Falhas</option>
                <option value="ERROR">Apenas Erros Críticos</option>
              </select>
            </div>
          </div>

          {/* Unified Logs List (Desc Chronological Order) */}
          {auditLogs.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">Nenhum registro encontrado para este filtro.</p>
              <p className="text-xs text-slate-500">Eventos de câmeras, Telegram, PiP e sistema aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                <span>Registros Recentes ({auditLogs.length}) — Mais novos no topo</span>
                <span className="text-slate-500 font-mono">Ordenado por Horário DESC</span>
              </div>

              {auditLogs.map((log) => {
                const modBadge = getModuleBadge(log.module);
                const sevBadge = getSeverityBadge(log.severity);
                const ModIcon = modBadge.icon;
                const SevIcon = sevBadge.icon;

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Timestamp */}
                        <span className="font-mono text-xs font-bold text-slate-300">
                          {log.created_at}
                        </span>

                        {/* Area Module Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${modBadge.color}`}>
                          <ModIcon className="w-3 h-3" />
                          <span>{modBadge.label}</span>
                        </span>

                        {/* Severity Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${sevBadge.color}`}>
                          <SevIcon className="w-3 h-3" />
                          <span>{sevBadge.label}</span>
                        </span>

                        {/* Action Tag */}
                        <span className="text-[11px] font-mono text-slate-400 font-semibold">
                          {log.action}
                        </span>
                      </div>

                      {/* Details & IP */}
                      <p className="text-xs text-slate-300 font-sans leading-relaxed break-words">
                        {log.details}
                      </p>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 shrink-0 self-end sm:self-center px-2 py-1 rounded bg-slate-950 border border-slate-800/80">
                      IP: {log.client_ip}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CONTAINER RAW LOGS */}
      {viewMode === "containers" && (
        <div className="space-y-3">
          
          {/* Container Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "backend", label: "Backend API (FastAPI)" },
                { id: "frigate", label: "Frigate NVR & IA" },
                { id: "frontend", label: "Dashboard (Next.js)" },
                { id: "nginx", label: "Nginx Gateway :8088" },
                { id: "mosquitto", label: "Mosquitto MQTT :1883" },
                { id: "go2rtc", label: "go2rtc WebRTC" },
                { id: "tailscale", label: "Tailscale Funnel (HTTPS)" },
              ].map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setService(svc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    service === svc.id
                      ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {svc.label}
                </button>
              ))}
            </div>

            {/* Invert Order Toggle */}
            <button
              onClick={() => setRawNewestFirst(!rawNewestFirst)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono transition-all border ${
                rawNewestFirst 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold" 
                  : "bg-slate-900 border-slate-800 text-slate-400"
              }`}
              title="Alternar ordem das linhas"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{rawNewestFirst ? "Mais Recentes no Topo" : "Mais Antigos no Topo"}</span>
            </button>
          </div>

          {/* Terminal Console Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-200 uppercase">CONTAINER: {service}</span>
                <span>({filteredRawLogs.length} linhas)</span>
              </div>
              <span className="text-slate-500">{rawNewestFirst ? "Ordenação: DESC" : "Ordenação: ASC"}</span>
            </div>

            <div
              ref={terminalRef}
              className="max-h-[500px] overflow-y-auto space-y-1 pr-2 select-text font-mono leading-relaxed"
            >
              {filteredRawLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-8">Nenhum log retornado para o contêiner {service}.</div>
              ) : (
                filteredRawLogs.map((line, idx) => {
                  let colorClass = "text-slate-300";
                  if (line.includes("ERROR") || line.includes("CRITICAL") || line.includes("fail") || line.includes("Exception")) {
                    colorClass = "text-rose-400 font-bold bg-rose-950/20 px-1 rounded";
                  } else if (line.includes("WARN") || line.includes("WARNING")) {
                    colorClass = "text-amber-300 bg-amber-950/20 px-1 rounded";
                  } else if (line.includes("INFO")) {
                    colorClass = "text-cyan-200/90";
                  }

                  return (
                    <div key={idx} className={`text-[11px] leading-relaxed break-all ${colorClass}`}>
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

