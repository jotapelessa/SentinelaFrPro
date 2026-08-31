"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSentinelaStore, SecurityEvent, AuditLogItem } from "@/store/useSentinelaStore";
import {
  Bell, Filter, Video, Clock, ShieldAlert, Calendar, RefreshCw, Play,
  Download, X, FileSpreadsheet, User, Car, Zap, Star, Trash2, Eye,
  ShieldCheck, AlertTriangle, CheckCircle, Info, Activity, Sliders, ExternalLink
} from "lucide-react";

export default function EventsPage() {
  const { events, cameras, setEvents } = useSentinelaStore();
  const [activeTab, setActiveTab] = useState<"recordings" | "audit">("recordings");
  
  // Recordings state
  const [filterCamera, setFilterCamera] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [filterFavorites, setFilterFavorites] = useState<boolean>(false);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [auditModule, setAuditModule] = useState<string>("ALL");
  const [auditSeverity, setAuditSeverity] = useState<string>("ALL");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

  // Fetch Frigate events directly
  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      let url = `${apiUrl}/events?limit=60`;
      if (filterCamera !== "all") url += `&camera=${filterCamera}`;
      if (filterLabel !== "all") url += `&label=${filterLabel}`;
      if (filterFavorites) url += `&favorites=1`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error("Failed to load events:", e);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      let url = `${apiUrl}/events/audit/logs?limit=150`;
      if (auditModule !== "ALL") url += `&module=${auditModule}`;
      if (auditSeverity !== "ALL") url += `&severity=${auditSeverity}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error("Failed to load audit trail:", e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === "recordings") {
      fetchEvents();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab, filterCamera, filterLabel, filterFavorites, auditModule, auditSeverity]);

  // Toggle Retain on Frigate
  const handleToggleRetain = async (e: React.MouseEvent, ev: SecurityEvent) => {
    e.stopPropagation();
    if (!ev.id) return;
    try {
      const res = await fetch(`${apiUrl}/events/${ev.id}/retain`, { method: "POST" });
      if (res.ok) {
        setEvents(
          events.map((item) =>
            item.id === ev.id ? { ...item, retained: !item.retained } : item
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle retain:", err);
    }
  };

  // Delete event
  const handleDeleteEvent = async (e: React.MouseEvent, ev: SecurityEvent) => {
    e.stopPropagation();
    if (!ev.id) return;
    if (!confirm(`Deseja realmente apagar o evento ${ev.label.toUpperCase()} de ${ev.camera}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/events/${ev.id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents(events.filter((item) => item.id !== ev.id));
        if (selectedEvent?.id === ev.id) setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Clear audit trail
  const handleClearAudit = async () => {
    if (!confirm("Deseja realmente limpar toda a trilha de auditoria?")) return;
    try {
      const res = await fetch(`${apiUrl}/events/audit/logs`, { method: "DELETE" });
      if (res.ok) {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error("Failed to clear audit:", err);
    }
  };

  // Set playback speed
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const exportCSV = () => {
    if (events.length === 0) return;
    const headers = ["ID", "Camera", "Objeto", "Confianca", "Data_Hora", "Zona", "Retido_NVMe"];
    const rows = events.map((ev, i) => [
      ev.id || i + 1,
      ev.camera,
      ev.label,
      `${ev.score || 0}%`,
      new Date(ev.timestamp).toLocaleString("pt-BR"),
      ev.zone || "Geral",
      ev.retained ? "SIM" : "NAO"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `sentinela_eventos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAuditCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = ["ID", "Data_Hora", "Modulo", "Acao", "Severidade", "Detalhes", "IP_Cliente"];
    const rows = auditLogs.map((l) => [
      l.id,
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.module,
      l.action,
      l.severity,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      l.client_ip || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `sentinela_auditoria_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tab Selector */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide">
              Central de Eventos & Inteligência Frigate
            </h1>
            <p className="text-xs text-slate-400">
              Histórico consolidado no SSD NVMe, clipes MP4 sob demanda e auditoria de segurança operacional.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-obsidian-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("recordings")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "recordings"
                ? "bg-cyan-500 text-obsidian-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Gravações & Clipes IA</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-obsidian-900/40 text-current">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "audit"
                ? "bg-cyan-500 text-obsidian-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Trilha de Auditoria</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-obsidian-900/40 text-current">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RECORDINGS & FRIGATE CLIPS */}
      {/* ========================================================================= */}
      {activeTab === "recordings" && (
        <div className="space-y-4">
          {/* Action and Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl glass-panel border border-slate-800">
            {/* Quick Labels Badges */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterLabel("all")}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  filterLabel === "all"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-obsidian-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterLabel("person")}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterLabel === "person"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-obsidian-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Pessoas
              </button>
              <button
                onClick={() => setFilterLabel("car")}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterLabel === "car"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-obsidian-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                Veículos
              </button>
              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  filterFavorites
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-obsidian-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                Fixados / Retidos
              </button>
            </div>

            {/* Selects & Export Controls */}
            <div className="flex items-center gap-2">
              <select
                value={filterCamera}
                onChange={(e) => setFilterCamera(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todas as Câmeras</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.name}>{c.friendly_name || c.name}</option>
                ))}
              </select>

              <button
                onClick={fetchEvents}
                disabled={loadingEvents}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50"
                title="Recarregar eventos do Frigate"
              >
                <RefreshCw className={`w-4 h-4 ${loadingEvents ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              <button
                onClick={exportCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Events Grid */}
          {events.length === 0 ? (
            <div className="p-16 text-center glass-panel rounded-2xl border border-dashed border-slate-800 space-y-3">
              <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Nenhum evento registrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Assim que pessoas ou veículos cruzarem os perímetros das câmeras, as evidências e clipes serão exibidos aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {events.map((ev, idx) => {
                const isPerson = ev.label.toLowerCase() === "person";
                const isVehicle = ["car", "motorcycle", "bus", "truck"].includes(ev.label.toLowerCase());

                return (
                  <div
                    key={ev.id || idx}
                    className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/40 transition-all group flex flex-col justify-between"
                  >
                    {/* Media Thumbnail */}
                    <div
                      onClick={() => setSelectedEvent(ev)}
                      className="h-44 bg-obsidian-950 relative overflow-hidden flex items-center justify-center cursor-pointer"
                    >
                      <img
                        src={ev.snapshot_url || "/placeholder-camera.jpg"}
                        alt="Snapshot"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                        <div className="p-3 rounded-full bg-cyan-500/90 text-obsidian-950 shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Camera Badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-cyan-300">
                        {ev.camera}
                      </div>

                      {/* Retain / Pin Badge */}
                      {ev.retained && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500/90 text-obsidian-950 text-[10px] font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span>Fixado NVMe</span>
                        </div>
                      )}

                      {/* Zone Badge */}
                      {ev.zone && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-950/80 backdrop-blur-sm border border-emerald-500/40 text-[9px] font-mono text-emerald-300">
                          ROI: {ev.zone}
                        </div>
                      )}
                    </div>

                    {/* Content Details & Action Toolbar */}
                    <div className="p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-black text-xs uppercase px-2 py-0.5 rounded ${
                            isPerson
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : isVehicle
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {ev.label}
                        </span>

                        {ev.score !== undefined && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Precisão: <strong className="text-cyan-400">{ev.score}%</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(ev.timestamp).toLocaleTimeString("pt-BR")}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Retain Action */}
                          <button
                            onClick={(e) => handleToggleRetain(e, ev)}
                            className={`p-1.5 rounded-lg border text-xs transition-all ${
                              ev.retained
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
                            }`}
                            title={ev.retained ? "Desafixar do SSD" : "Fixar permanentemente no SSD NVMe"}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Delete Action */}
                          <button
                            onClick={(e) => handleDeleteEvent(e, ev)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                            title="Excluir gravação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Open Clip */}
                          <button
                            onClick={() => setSelectedEvent(ev)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all"
                          >
                            Ver Clipe
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT TRAIL & SYSTEM MUTATIONS */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Audit Filter & Clear Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl glass-panel border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Filtrar Auditoria:
              </span>

              {/* Module Filter */}
              <select
                value={auditModule}
                onChange={(e) => setAuditModule(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todos os Módulos</option>
                <option value="FRIGATE">Frigate NVR</option>
                <option value="TELEGRAM">Telegram Vault</option>
                <option value="CAMERA">Câmeras & Zonas</option>
                <option value="SETTINGS">Ajustes & DND</option>
                <option value="SYSTEM">Sistema Core</option>
              </select>

              {/* Severity Filter */}
              <select
                value={auditSeverity}
                onChange={(e) => setAuditSeverity(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todas as Severidades</option>
                <option value="SUCCESS">SUCCESS (Sucesso)</option>
                <option value="INFO">INFO (Informativo)</option>
                <option value="WARNING">WARNING (Alerta)</option>
                <option value="ERROR">ERROR (Falha)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAuditLogs}
                disabled={loadingAudit}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50"
                title="Recarregar trilha de auditoria"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAudit ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              <button
                onClick={exportAuditCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleClearAudit}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Trilha</span>
              </button>
            </div>
          </div>

          {/* Audit Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-obsidian-950/80 border-b border-slate-800 text-[11px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Módulo</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Severidade</th>
                    <th className="py-3 px-4">Detalhes & Contexto</th>
                    <th className="py-3 px-4">IP Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                        Nenhum registro de auditoria encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      let sevBadge = "bg-slate-800 text-slate-300 border-slate-700";
                      if (log.severity === "SUCCESS") sevBadge = "bg-emerald-950/40 text-emerald-400 border-emerald-500/30";
                      else if (log.severity === "WARNING") sevBadge = "bg-amber-950/40 text-amber-400 border-amber-500/30";
                      else if (log.severity === "ERROR") sevBadge = "bg-rose-950/40 text-rose-400 border-rose-500/30 font-bold";

                      return (
                        <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 font-bold text-cyan-400">{log.module}</td>
                          <td className="py-3 px-4 font-semibold text-slate-200">{log.action}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded border text-[10px] ${sevBadge}`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-md break-words">
                            {log.details || "-"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[10px]">{log.client_ip || "127.0.0.1"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIDEO CLIP & SNAPSHOT INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    {selectedEvent.label.toUpperCase()} em {selectedEvent.camera}
                    {selectedEvent.retained && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        ⭐ Fixado
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {new Date(selectedEvent.timestamp).toLocaleString("pt-BR")} | Precisão: {selectedEvent.score || 0}%
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-inner">
              <video
                ref={videoRef}
                src={selectedEvent.clip_url || `/frigate/api/events/${selectedEvent.id}/clip.mp4`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Seu navegador não suporta reprodução MP4.
              </video>
            </div>

            {/* Playback Controls & Direct Media Downloads */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {/* Playback Speed Switcher */}
              <div className="flex items-center gap-1.5 bg-obsidian-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <span className="text-slate-500 px-2 text-[10px]">Velocidade:</span>
                {[0.5, 1, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => changePlaybackSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      playbackSpeed === spd
                        ? "bg-cyan-500 text-obsidian-950 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Download Clean Snapshot */}
                <a
                  href={selectedEvent.snapshot_clean_url || `/frigate/api/events/${selectedEvent.id}/snapshot.jpg?clean=1`}
                  download={`snapshot_${selectedEvent.camera}_${selectedEvent.id}.jpg`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Foto Limpa</span>
                </a>

                {/* Download Video Clip */}
                <a
                  href={selectedEvent.clip_url || `/frigate/api/events/${selectedEvent.id}/clip.mp4`}
                  download={`clip_${selectedEvent.camera}_${selectedEvent.id}.mp4`}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Clipe MP4</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

