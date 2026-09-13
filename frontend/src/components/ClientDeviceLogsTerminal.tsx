"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Tv,
  Smartphone,
  Tablet,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Pause,
  Play,
  Copy,
  Check,
  Search,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Code,
  Sliders,
  Filter,
  Layers,
  ArrowUpDown
} from "lucide-react";

export interface ClientLogItem {
  id: number;
  device_identifier: string;
  device_name: string;
  device_type: string;
  category: string;
  action: string;
  severity: "SUCCESS" | "ERROR" | "WARNING" | "INFO";
  message: string;
  client_timestamp?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

interface ClientDeviceLogsTerminalProps {
  deviceIdentifier?: string;
  hideDeviceFilter?: boolean;
  maxHeight?: string;
}

export const ClientDeviceLogsTerminal: React.FC<ClientDeviceLogsTerminalProps> = ({
  deviceIdentifier,
  hideDeviceFilter = false,
  maxHeight = "calc(100vh - 360px)"
}) => {
  const [logs, setLogs] = useState<ClientLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDevice, setSelectedDevice] = useState<string>(deviceIdentifier || "ALL");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [knownDevices, setKnownDevices] = useState<{ id: string; name: string; type: string }[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const terminalRef = useRef<HTMLDivElement>(null);

  // Carrega lista de dispositivos pareados para popular o seletor
  const fetchDevices = useCallback(async () => {
    if (hideDeviceFilter) return;
    try {
      const res = await fetch(`${apiUrl}/devices/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setKnownDevices(
            data.map((d: any) => ({
              id: d.device_identifier,
              name: d.friendly_name || d.device_identifier,
              type: d.device_type || "android_tv"
            }))
          );
        }
      }
    } catch {
      // Ignored
    }
  }, [apiUrl, hideDeviceFilter]);

  // Carrega os logs do endpoint de telemetria
  const fetchLogs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "250" });
        const targetDev = deviceIdentifier || selectedDevice;
        if (targetDev && targetDev !== "ALL") {
          params.append("device_identifier", targetDev);
        }
        if (selectedCategory && selectedCategory !== "ALL") {
          params.append("category", selectedCategory);
        }
        if (selectedSeverity && selectedSeverity !== "ALL") {
          params.append("severity", selectedSeverity);
        }

        const res = await fetch(`${apiUrl}/telemetry/client-logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.logs)) {
            setLogs(data.logs);
          }
        }
      } catch (e) {
        console.error("Erro ao buscar logs de clientes:", e);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiUrl, deviceIdentifier, selectedDevice, selectedCategory, selectedSeverity]
  );

  // Carga inicial
  useEffect(() => {
    fetchDevices();
    fetchLogs();
  }, [fetchDevices, fetchLogs]);

  // Escuta WebSocket despachado centralmente pelo WebSocketProvider
  useEffect(() => {
    const handleWsEvent = (e: any) => {
      if (!isLive) return;
      const detail = e.detail;
      // Se houver filtro de aparelho e o evento pertencer a outro aparelho, ignora
      const currentTarget = deviceIdentifier || selectedDevice;
      if (currentTarget && currentTarget !== "ALL" && detail?.device_identifier !== currentTarget) {
        return;
      }
      // Atualiza de forma transparente e silenciosa sem flicker
      fetchLogs(true);
    };

    window.addEventListener("client_logs_ingested", handleWsEvent);
    return () => {
      window.removeEventListener("client_logs_ingested", handleWsEvent);
    };
  }, [isLive, deviceIdentifier, selectedDevice, fetchLogs]);

  // Polling silencioso de fallback a cada 4s
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive, fetchLogs]);

  // Filtragem local por texto
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.toLowerCase();
    return logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.device_name.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  // Métricas do painel
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const errors = filteredLogs.filter((l) => l.severity === "ERROR").length;
    const warnings = filteredLogs.filter((l) => l.severity === "WARNING").length;
    const successes = filteredLogs.filter((l) => l.severity === "SUCCESS").length;
    const uniqueDevices = new Set(filteredLogs.map((l) => l.device_identifier)).size;
    return { total, errors, warnings, successes, uniqueDevices };
  }, [filteredLogs]);

  // Copiar logs para a área de transferência
  const handleCopyLogs = () => {
    if (filteredLogs.length === 0) return;
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.created_at}] [${l.device_name || l.device_identifier}] [${l.category}] [${l.severity}] ${l.action}: ${l.message}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Limpeza de logs
  const handleClearLogs = async () => {
    if (!confirm("Deseja realmente limpar todos os logs desta visualização?")) return;
    try {
      const targetDev = deviceIdentifier || selectedDevice;
      const url =
        targetDev && targetDev !== "ALL"
          ? `${apiUrl}/telemetry/client-logs?device_identifier=${encodeURIComponent(targetDev)}`
          : `${apiUrl}/telemetry/client-logs`;
      await fetch(url, { method: "DELETE" });
      fetchLogs();
    } catch (e) {
      console.error("Falha ao limpar logs:", e);
    }
  };

  const getDeviceIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "smartphone":
        return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
      case "tablet":
        return <Tablet className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Tv className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" /> SUCESSO
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 text-rose-400 border border-rose-800/60 animate-pulse">
            <XCircle className="w-3 h-3" /> ERRO
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60">
            <AlertTriangle className="w-3 h-3" /> AVISO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/70 text-cyan-400 border border-cyan-800/60">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      PIP: "bg-indigo-950/60 text-indigo-300 border-indigo-800/60",
      TOOLS: "bg-amber-950/60 text-amber-300 border-amber-800/60",
      NAVIGATION: "bg-cyan-950/60 text-cyan-300 border-cyan-800/60",
      NETWORK: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
      SYSTEM: "bg-slate-800 text-slate-300 border-slate-700"
    };
    const style = colors[category.toUpperCase()] || "bg-slate-800 text-slate-300 border-slate-700";
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${style}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="w-full bg-[#080d1a] border border-cyan-950/60 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans">
      {/* 1. Header & Live Controller */}
      <div className="p-4 bg-[#0a1226]/80 border-b border-cyan-950/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-800/40 text-cyan-400 shadow-inner">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                TELEMETRIA & OPERAÇÃO DE CLIENTES
              </h2>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  AO VIVO (0ms)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-700/60">
                  <Pause className="w-2.5 h-2.5" /> PAUSADO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Eventos de navegação, overlays PiP, testes de vazão (Mbps/FPS) e quedas de conexão
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              isLive
                ? "bg-slate-900/80 text-amber-400 border-amber-900/50 hover:bg-amber-950/40"
                : "bg-emerald-950/70 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/50"
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isLive ? "Pausar" : "Continuar"}
          </button>

          <button
            onClick={() => fetchLogs()}
            title="Atualizar agora"
            className="p-1.5 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-800 hover:text-cyan-400 hover:border-cyan-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={handleCopyLogs}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 text-slate-200 border border-slate-800 hover:bg-slate-800/80 hover:text-white transition disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>

          <button
            onClick={handleClearLogs}
            title="Limpar logs"
            className="p-1.5 rounded-lg bg-slate-900/80 text-rose-400 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-900 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-[#060b17] border-b border-cyan-950/50 text-xs">
        <div className="bg-[#0b1429] p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
          <div className="text-base font-black text-white font-mono mt-0.5">{stats.total}</div>
        </div>
        <div className="bg-[#0b1429] p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Sucessos</span>
          <div className="text-base font-black text-emerald-400 font-mono mt-0.5">{stats.successes}</div>
        </div>
        <div className="bg-[#0b1429] p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Erros</span>
          <div className="text-base font-black text-rose-400 font-mono mt-0.5">{stats.errors}</div>
        </div>
        <div className="bg-[#0b1429] p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Avisos</span>
          <div className="text-base font-black text-amber-400 font-mono mt-0.5">{stats.warnings}</div>
        </div>
        <div className="bg-[#0b1429] p-2.5 rounded-lg border border-slate-800/60 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Dispositivos</span>
          <div className="text-base font-black text-cyan-400 font-mono mt-0.5">{stats.uniqueDevices}</div>
        </div>
      </div>

      {/* 3. Filters Toolbar */}
      <div className="p-3 bg-[#070e1e]/90 border-b border-cyan-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Device Selector (opcional se não estiver embutido no modal) */}
          {!hideDeviceFilter && (
            <div className="relative">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-[#0b1429] text-xs font-semibold text-cyan-300 border border-cyan-900/60 rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">📱 Todos os Dispositivos</option>
                {knownDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type.toUpperCase()})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-cyan-500 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          )}

          {/* Severities Filter */}
          <div className="flex items-center gap-1 bg-[#0b1429] p-0.5 rounded-lg border border-slate-800">
            {["ALL", "SUCCESS", "ERROR", "WARNING", "INFO"].map((sev) => {
              const isSelected = selectedSeverity === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                    isSelected
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {sev === "ALL" ? "TODOS" : sev}
                </button>
              );
            })}
          </div>

          {/* Categories Filter */}
          <div className="flex items-center gap-1 bg-[#0b1429] p-0.5 rounded-lg border border-slate-800">
            {["ALL", "PIP", "TOOLS", "NAVIGATION", "NETWORK"].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-[10px] font-black transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat === "ALL" ? "CATEGORIAS" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free-Text Search Input */}
        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por câmera, Mbps, rota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b1429] text-xs text-white border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* 4. Logs Feed Container */}
      <div
        ref={terminalRef}
        style={{ maxHeight }}
        className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-[#040813] font-mono text-xs"
      >
        {loading && logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-500" />
            <p className="text-xs">Carregando eventos de telemetria remota...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
            <p className="text-xs font-semibold text-slate-400">Nenhum evento registrado com os filtros atuais.</p>
            <p className="text-[11px] text-slate-600">
              Assim que qualquer Smart TV ou celular realizar ações, os eventos aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          filteredLogs.map((entry) => {
            const isExpanded = expandedLogId === entry.id;
            const hasMeta = entry.metadata && Object.keys(entry.metadata).length > 0;

            return (
              <div
                key={entry.id}
                className={`rounded-lg border transition duration-150 ${
                  isExpanded
                    ? "bg-[#0c162d] border-cyan-700/80 shadow-lg"
                    : "bg-[#070e1f]/70 border-slate-900/90 hover:border-cyan-900/50 hover:bg-[#0a1329]"
                }`}
              >
                <div
                  onClick={() => hasMeta && setExpandedLogId(isExpanded ? null : entry.id)}
                  className="p-2.5 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {entry.created_at}
                    </span>

                    {/* Device Badge */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-800 text-[10px] font-semibold whitespace-nowrap">
                      {getDeviceIcon(entry.device_type)}
                      <span className="truncate max-w-[130px]">
                        {entry.device_name || entry.device_identifier}
                      </span>
                    </span>

                    {/* Category */}
                    {getCategoryBadge(entry.category)}

                    {/* Severity */}
                    {getSeverityBadge(entry.severity)}

                    {/* Action Tag */}
                    <span className="text-[11px] font-bold text-cyan-400 whitespace-nowrap">
                      [{entry.action}]
                    </span>

                    {/* Message Preview */}
                    <span className="text-[11px] text-slate-200 truncate flex-1 min-w-[200px]">
                      {entry.message}
                    </span>
                  </div>

                  {/* Accordion Indicator */}
                  {hasMeta && (
                    <div className="flex items-center gap-1 text-[10px] text-cyan-500 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/40">
                      <Code className="w-3 h-3" />
                      <span>JSON</span>
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                  )}
                </div>

                {/* Expanded JSON Inspector */}
                {isExpanded && hasMeta && (
                  <div className="p-3 bg-[#03060f] border-t border-cyan-950/70 text-[11px] rounded-b-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                        Metadados de Telemetria e Diagnóstico:
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(JSON.stringify(entry.metadata, null, 2));
                        }}
                        className="text-[10px] text-slate-400 hover:text-white underline"
                      >
                        Copiar Objeto
                      </button>
                    </div>
                    <pre className="p-2.5 rounded bg-[#070d1d] text-cyan-300 font-mono text-[10px] overflow-x-auto border border-cyan-950/50">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
