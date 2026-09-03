'use client';

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSentinelaStore, SecurityEvent, AuditLogItem } from "@/store/useSentinelaStore";
import {
  Bell, Filter, Video, Clock, ShieldAlert, Calendar, RefreshCw, Play,
  Download, X, FileSpreadsheet, User, Car, Zap, Star, Trash2, Eye,
  ShieldCheck, AlertTriangle, CheckCircle, Info, Activity, Sliders, ExternalLink,
  CheckSquare, Square, ChevronLeft, ChevronRight, SkipBack, SkipForward,
  AlertOctagon, CheckCheck, Trash, Layers, CalendarDays
} from "lucide-react";

export default function EventsPage() {
  const { events, cameras, setEvents } = useSentinelaStore();
  const [activeTab, setActiveTab] = useState<"recordings" | "audit">("recordings");
  
  // Helper for consistent local YYYY-MM-DD date representation
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatEventTime = (ts?: string) => {
    if (!ts) return "--:--:--";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "--:--:--";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // Recordings state
  const [filterCamera, setFilterCamera] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [filterFavorites, setFilterFavorites] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(new Date()));
  const [selectedHourFilter, setSelectedHourFilter] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "madrugada" | "manha" | "tarde" | "noite">("all");

  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Multi-selection & Batch Deletion state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteModalCountdown, setDeleteModalCountdown] = useState<number>(3);
  const [forceDeleteRetained, setForceDeleteRetained] = useState<boolean>(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [auditModule, setAuditModule] = useState<string>("ALL");
  const [auditSeverity, setAuditSeverity] = useState<string>("ALL");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  const [syncingFrigate, setSyncingFrigate] = useState<boolean>(false);

  const handleSyncFrigateEvents = async () => {
    setSyncingFrigate(true);
    try {
      await fetch(`${apiUrl}/events/sync-frigate`, { method: "POST" });
      await fetchEvents();
    } catch (e) {
      console.error("Erro ao sincronizar eventos com o Frigate:", e);
    } finally {
      setSyncingFrigate(false);
    }
  };

  // Fetch Frigate events directly
  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      let url = `${apiUrl}/events?limit=100`;
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

  // Safety countdown timer for batch delete modal
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDeleteModal && deleteModalCountdown > 0) {
      timer = setTimeout(() => {
        setDeleteModalCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showDeleteModal, deleteModalCountdown]);

  // Filter events by selected date and hour in Local Time
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (!ev.timestamp) return true;
      const evDate = new Date(ev.timestamp);
      if (isNaN(evDate.getTime())) return true;
      const evDateStr = getLocalDateString(evDate);
      
      if (selectedDate && evDateStr !== selectedDate) {
        return false;
      }
      
      if (selectedHourFilter !== null && evDate.getHours() !== selectedHourFilter) {
        return false;
      }
      
      return true;
    });
  }, [events, selectedDate, selectedHourFilter]);

  // Compute 24-hour timeline bins (24 hourly buckets with breakdown) in Local Time
  const timelineHourlyBins = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: 0,
      persons: 0,
      vehicles: 0,
      others: 0,
      retained: 0,
      events: [] as SecurityEvent[]
    }));

    events.forEach((ev) => {
      if (!ev.timestamp) return;
      const evDate = new Date(ev.timestamp);
      if (isNaN(evDate.getTime())) return;
      const evDateStr = getLocalDateString(evDate);

      if (selectedDate && evDateStr !== selectedDate) return;

      const h = evDate.getHours();
      if (h >= 0 && h < 24) {
        hours[h].total += 1;
        hours[h].events.push(ev);
        const lbl = (ev.label || "").toLowerCase();
        if (lbl === "person") hours[h].persons += 1;
        else if (["car", "motorcycle", "bus", "truck"].includes(lbl)) hours[h].vehicles += 1;
        else hours[h].others += 1;

        if (ev.retained) hours[h].retained += 1;
      }
    });

    return hours;
  }, [events, selectedDate]);

  // Toggle single item selection
  const toggleSelectEvent = (id: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all or clear
  const handleSelectAllVisible = () => {
    const visibleIds = filteredEvents.map((e) => String(e.id)).filter((id) => id && id !== "undefined");
    if (selectedEventIds.length === visibleIds.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(visibleIds);
    }
  };

  // Toggle Retain on Frigate
  const handleToggleRetain = async (e: React.MouseEvent | null, ev: SecurityEvent) => {
    if (e) e.stopPropagation();
    if (!ev.id) return;
    try {
      const res = await fetch(`${apiUrl}/events/${ev.id}/retain`, { method: "POST" });
      if (res.ok) {
        setEvents(
          events.map((item) =>
            item.id === ev.id ? { ...item, retained: !item.retained } : item
          )
        );
        if (selectedEvent?.id === ev.id) {
          setSelectedEvent({ ...selectedEvent, retained: !selectedEvent.retained });
        }
      }
    } catch (err) {
      console.error("Failed to toggle retain:", err);
    }
  };

  // Batch Toggle Retain
  const handleBatchToggleRetain = async () => {
    if (selectedEventIds.length === 0) return;
    for (const id of selectedEventIds) {
      const ev = events.find((item) => String(item.id) === id);
      if (ev) {
        await handleToggleRetain(null, ev);
      }
    }
    setSelectedEventIds([]);
    setIsSelectionMode(false);
  };

  // Delete single event
  const handleDeleteSingleEvent = async (e: React.MouseEvent | null, ev: SecurityEvent) => {
    if (e) e.stopPropagation();
    if (!ev.id) return;
    if (!confirm(`Deseja realmente excluir a gravação de ${ev.label.toUpperCase()} em ${ev.camera}?`)) return;
    try {
      const res = await fetch(`${apiUrl}/events/${ev.id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents(events.filter((item) => String(item.id) !== String(ev.id)));
        setSelectedEventIds((prev) => prev.filter((id) => id !== String(ev.id)));
        if (String(selectedEvent?.id) === String(ev.id)) setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Open Safe Delete Modal
  const openBatchDeleteModal = () => {
    if (selectedEventIds.length === 0) return;
    setDeleteModalCountdown(3);
    setShowDeleteModal(true);
  };

  // Confirm Batch Delete
  const handleConfirmBatchDelete = async () => {
    if (selectedEventIds.length === 0) return;
    setIsDeletingBatch(true);
    try {
      const res = await fetch(`${apiUrl}/events/batch`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_ids: selectedEventIds,
          force_retained: forceDeleteRetained
        })
      });

      if (res.ok) {
        setEvents(events.filter((item) => item.id && !selectedEventIds.includes(String(item.id))));
        if (selectedEvent?.id && selectedEventIds.includes(String(selectedEvent.id))) {
          setSelectedEvent(null);
        }
        setSelectedEventIds([]);
        setIsSelectionMode(false);
        setShowDeleteModal(false);
      } else {
        alert("Ocorreu um erro ao excluir o lote de gravações.");
      }
    } catch (err) {
      console.error("Erro na exclusão em lote:", err);
      alert("Falha de comunicação ao tentar excluir gravações.");
    } finally {
      setIsDeletingBatch(false);
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

  // Sequential event jumping in modal
  const handleNavigateEvent = (direction: "prev" | "next") => {
    if (!selectedEvent || filteredEvents.length === 0) return;
    const currentIndex = filteredEvents.findIndex((e) => String(e.id) === String(selectedEvent.id));
    if (currentIndex === -1) return;

    if (direction === "prev" && currentIndex > 0) {
      setSelectedEvent(filteredEvents[currentIndex - 1]);
    } else if (direction === "next" && currentIndex < filteredEvents.length - 1) {
      setSelectedEvent(filteredEvents[currentIndex + 1]);
    }
  };

  // Quick Date Selectors
  const setDateToday = () => {
    setSelectedDate(getLocalDateString(new Date()));
    setSelectedHourFilter(null);
  };

  const setDateYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(getLocalDateString(yest));
    setSelectedHourFilter(null);
  };

  // Export Events CSV
  const exportCSV = () => {
    if (filteredEvents.length === 0) return;
    const headers = ["ID", "Camera", "Tipo_Objeto", "Confianca", "Data_Hora", "Zona", "Retido_NVMe"];
    const rows = filteredEvents.map((ev, i) => [
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
    link.setAttribute("download", `sentinela_eventos_${selectedDate || "todos"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Audit CSV
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

  // Calculations for Batch Delete Modal Breakdown
  const selectedEventsObjects = useMemo(() => {
    return events.filter((e) => e.id && selectedEventIds.includes(String(e.id)));
  }, [events, selectedEventIds]);

  const batchBreakdown = useMemo(() => {
    let persons = 0;
    let vehicles = 0;
    let others = 0;
    let retained = 0;

    selectedEventsObjects.forEach((ev) => {
      const lbl = (ev.label || "").toLowerCase();
      if (lbl === "person") persons++;
      else if (["car", "motorcycle", "bus", "truck"].includes(lbl)) vehicles++;
      else others++;

      if (ev.retained) retained++;
    });

    return { persons, vehicles, others, retained };
  }, [selectedEventsObjects]);

  return (
    <div className="space-y-6 pb-20">
      {/* ========================================================================= */}
      {/* HEADER & VIEW SWITCHER */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
              Central de Eventos & Inteligência Frigate
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                24h Timeline
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Linha do tempo contínua no NVMe, clipes de vídeo sob demanda e gestão segura de evidências.
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
            <span>Gravações & Linha do Tempo</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-obsidian-900/40 text-current">
              {filteredEvents.length}
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
      {/* TAB 1: RECORDINGS & 24H VISUAL TIMELINE */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 1: RECORDINGS & 24H VISUAL TIMELINE SIDEBAR */}
      {/* ========================================================================= */}
      {activeTab === "recordings" && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* MAIN CONTENT (LEFT): TOOLBAR & EVENTS CARDS GRID */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            {/* 1. TOOLBAR & FILTER BAR */}
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
                  Todos ({events.length})
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

              {/* Selects, Multi-Selection Mode Toggle & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Multi-Selection Mode Toggle */}
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) setSelectedEventIds([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    isSelectionMode
                      ? "bg-cyan-500 text-obsidian-950 border-cyan-400 shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isSelectionMode ? "Concluir Seleção" : "Selecionar Múltiplos"}</span>
                </button>

                <button
                  onClick={handleSyncFrigateEvents}
                  disabled={syncingFrigate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50"
                  title="Sincronizar eventos históricos diretamente do Frigate NVR"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFrigate ? "animate-spin text-cyan-400" : ""}`} />
                  <span>{syncingFrigate ? "Sincronizando..." : "Sincronizar Frigate"}</span>
                </button>

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

            {/* 2. EVENTS GRID */}
            {filteredEvents.length === 0 ? (
              <div className="p-16 text-center glass-panel rounded-2xl border border-dashed border-slate-800 space-y-4">
                <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-300">Nenhum evento no período selecionado</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {selectedHourFilter !== null
                      ? `Nenhuma gravação registrada às ${String(selectedHourFilter).padStart(2, "0")}:00h.`
                      : "Assim que pessoas ou veículos cruzarem os perímetros das câmeras, as evidências serão exibidas aqui."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  {selectedHourFilter !== null && (
                    <button
                      onClick={() => setSelectedHourFilter(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
                    >
                      Ver todas as 24 horas
                    </button>
                  )}
                  <button
                    onClick={handleSyncFrigateEvents}
                    disabled={syncingFrigate}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingFrigate ? "animate-spin" : ""}`} />
                    <span>Sincronizar Histórico</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredEvents.map((ev, idx) => {
                  const isPerson = (ev.label || "").toLowerCase() === "person";
                  const isVehicle = ["car", "motorcycle", "bus", "truck"].includes((ev.label || "").toLowerCase());
                  const isSelected = ev.id ? selectedEventIds.includes(String(ev.id)) : false;

                  return (
                    <div
                      key={ev.id || idx}
                      onClick={() => {
                        if (isSelectionMode && ev.id) {
                          toggleSelectEvent(String(ev.id));
                        }
                      }}
                      className={`glass-panel rounded-2xl overflow-hidden border transition-all flex flex-col justify-between group relative ${
                        isSelected
                          ? "border-cyan-400 ring-2 ring-cyan-400/60 bg-cyan-950/20 shadow-lg shadow-cyan-500/10"
                          : "border-slate-800 hover:border-cyan-500/40"
                      }`}
                    >
                      {/* Multi-selection Checkbox Overlay */}
                      {isSelectionMode && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ev.id) toggleSelectEvent(String(ev.id));
                          }}
                          className="absolute top-2 left-2 z-20 cursor-pointer p-1 rounded-lg bg-black/80 backdrop-blur-sm border border-slate-600 hover:border-cyan-400 transition-all"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      )}

                      {/* Media Thumbnail */}
                      <div
                        onClick={(e) => {
                          if (isSelectionMode && ev.id) {
                            e.stopPropagation();
                            toggleSelectEvent(String(ev.id));
                          } else {
                            setSelectedEvent(ev);
                          }
                        }}
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

                        {/* Camera Badge (offset if selection mode active) */}
                        <div className={`absolute top-2 ${isSelectionMode ? "left-10" : "left-2"} px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-cyan-300`}>
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
                            {formatEventTime(ev.timestamp)}
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

                            {/* Delete Single Action */}
                            <button
                              onClick={(e) => handleDeleteSingleEvent(e, ev)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                              title="Excluir gravação individual"
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

          {/* RIGHT SIDEBAR: 24-HOUR VERTICAL TIMELINE */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-20 space-y-4">
            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-4 shadow-xl">
              {/* Timeline Controls Header */}
              <div className="space-y-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Linha do Tempo (24 Horas)
                  </span>

                  {selectedHourFilter !== null && (
                    <button
                      onClick={() => setSelectedHourFilter(null)}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] flex items-center gap-1 font-semibold"
                    >
                      <span>{String(selectedHourFilter).padStart(2, "0")}:00h</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Date Selectors & Date Picker */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-obsidian-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={setDateToday}
                      className={`px-2.5 py-1 rounded font-semibold transition-all ${
                        selectedDate === getLocalDateString(new Date())
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Hoje
                    </button>
                    <button
                      onClick={setDateYesterday}
                      className="px-2.5 py-1 rounded font-semibold text-slate-400 hover:text-slate-200 transition-all"
                    >
                      Ontem
                    </button>
                  </div>

                  <div className="flex-1 min-w-[130px] flex items-center gap-1.5 bg-obsidian-950 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
                    <CalendarDays className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedHourFilter(null);
                      }}
                      className="w-full bg-transparent text-xs font-mono text-slate-200 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Timeline Legend */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Pessoa
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Veículo
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Outro
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" /> ⭐ Fixado
                  </span>
                </div>
              </div>

              {/* Period Tabs (Todos, Madrugada, Manhã, Tarde, Noite) */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: "all", label: "⚡ 24 Horas", range: "00-23h" },
                  { id: "madrugada", label: "🌙 Madrugada", range: "00-05h" },
                  { id: "manha", label: "🌅 Manhã", range: "06-11h" },
                  { id: "tarde", label: "☀️ Tarde", range: "12-17h" },
                  { id: "noite", label: "🌆 Noite", range: "18-23h" },
                ].map((p, idx) => {
                  const isSelected = selectedPeriod === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPeriod(p.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                        idx === 0 ? "col-span-2" : ""
                      } ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                          : "bg-obsidian-950 text-slate-400 border-slate-800/80 hover:text-slate-200"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] opacity-60 font-mono">{p.range}</span>
                    </button>
                  );
                })}
              </div>

              {/* Vertical Scrollable Hours Column */}
              <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {timelineHourlyBins
                  .filter((bin) => {
                    if (selectedPeriod === "madrugada") return bin.hour >= 0 && bin.hour <= 5;
                    if (selectedPeriod === "manha") return bin.hour >= 6 && bin.hour <= 11;
                    if (selectedPeriod === "tarde") return bin.hour >= 12 && bin.hour <= 17;
                    if (selectedPeriod === "noite") return bin.hour >= 18 && bin.hour <= 23;
                    return true;
                  })
                  .map((bin) => {
                    const isSelectedHour = selectedHourFilter === bin.hour;
                    const hasActivity = bin.total > 0;
                    
                    const personPct = hasActivity ? (bin.persons / bin.total) * 100 : 0;
                    const vehiclePct = hasActivity ? (bin.vehicles / bin.total) * 100 : 0;
                    const otherPct = hasActivity ? (bin.others / bin.total) * 100 : 0;

                    return (
                      <div
                        key={bin.hour}
                        onClick={() => {
                          if (bin.total > 0) {
                            setSelectedHourFilter(selectedHourFilter === bin.hour ? null : bin.hour);
                            if (bin.events.length > 0 && selectedHourFilter !== bin.hour) {
                              setSelectedEvent(bin.events[0]);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all select-none ${
                          isSelectedHour
                            ? "bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/50 shadow-md shadow-cyan-950/50 cursor-pointer"
                            : hasActivity
                            ? "bg-obsidian-950/90 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 cursor-pointer"
                            : "bg-obsidian-950/40 border-slate-900/60 opacity-40 cursor-default"
                        }`}
                      >
                        {/* Top Row: Hour & Total Count */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            {String(bin.hour).padStart(2, "0")}:00 - {String(bin.hour).padStart(2, "0")}:59
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                              isSelectedHour
                                ? "bg-cyan-500 text-obsidian-950 font-black"
                                : hasActivity
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-slate-900 text-slate-500"
                            }`}
                          >
                            {bin.total} {bin.total === 1 ? "ev." : "evs."}
                          </span>
                        </div>

                        {/* Middle: Breakdown Tags */}
                        {hasActivity ? (
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300 mb-2 flex-wrap">
                            {bin.persons > 0 && (
                              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {bin.persons} pess.
                              </span>
                            )}
                            {bin.vehicles > 0 && (
                              <span className="flex items-center gap-1 text-blue-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {bin.vehicles} veíc.
                              </span>
                            )}
                            {bin.others > 0 && (
                              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {bin.others} out.
                              </span>
                            )}
                            {bin.retained > 0 && (
                              <span className="flex items-center gap-1 text-yellow-300 font-semibold">
                                ⭐ {bin.retained}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic mb-2 font-mono">Sem detecções</p>
                        )}

                        {/* Bottom: Proportional Color Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
                          {bin.persons > 0 && (
                            <div style={{ width: `${personPct}%` }} className="h-full bg-rose-500" />
                          )}
                          {bin.vehicles > 0 && (
                            <div style={{ width: `${vehiclePct}%` }} className="h-full bg-blue-500" />
                          )}
                          {bin.others > 0 && (
                            <div style={{ width: `${otherPct}%` }} className="h-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* 4. FLOATING ACTION BAR (BOTTOM SHEET FOR BATCH ACTIONS) */}
          {(isSelectionMode || selectedEventIds.length > 0) && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-xl bg-cyan-500 text-obsidian-950 font-black text-xs">
                  {selectedEventIds.length} selecionados
                </div>
                <button
                  onClick={handleSelectAllVisible}
                  className="text-xs font-semibold text-slate-300 hover:text-cyan-400 underline transition-colors"
                >
                  {selectedEventIds.length === filteredEvents.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Batch Retain */}
                <button
                  onClick={handleBatchToggleRetain}
                  disabled={selectedEventIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all disabled:opacity-40"
                  title="Fixar / Preservar itens selecionados no NVMe"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Fixar</span>
                </button>

                {/* Batch Delete Trigger */}
                <button
                  onClick={openBatchDeleteModal}
                  disabled={selectedEventIds.length === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Selecionados</span>
                </button>

                {/* Close Selection Mode */}
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedEventIds([]);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                  title="Cancelar seleção"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
      {/* SAFE BATCH DELETION CONFIRMATION MODAL (WITH 3S SAFETY DELAY) */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão em Lote</h3>
                <p className="text-xs text-slate-400">Esta ação apagará as gravações do Frigate e do SSD.</p>
              </div>
            </div>

            {/* Breakdown Card */}
            <div className="p-3.5 rounded-xl bg-obsidian-950 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Total de Itens:</span>
                <strong className="text-white">{selectedEventIds.length} gravações</strong>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div className="p-1.5 rounded bg-rose-950/30 border border-rose-500/20 text-rose-300 text-center">
                  {batchBreakdown.persons} Pessoas
                </div>
                <div className="p-1.5 rounded bg-blue-950/30 border border-blue-500/20 text-blue-300 text-center">
                  {batchBreakdown.vehicles} Veículos
                </div>
                <div className="p-1.5 rounded bg-amber-950/30 border border-amber-500/20 text-amber-300 text-center">
                  {batchBreakdown.others} Outros
                </div>
              </div>

              {batchBreakdown.retained > 0 && (
                <div className="pt-2 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {batchBreakdown.retained} {batchBreakdown.retained === 1 ? "gravação está fixada" : "gravações estão fixadas"}.
                  </span>
                </div>
              )}
            </div>

            {/* Safety Options */}
            {batchBreakdown.retained > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={forceDeleteRetained}
                  onChange={(e) => setForceDeleteRetained(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-obsidian-950"
                />
                <span>Forçar exclusão também das gravações fixadas (com estrela)</span>
              </label>
            )}

            {/* Action Buttons with Countdown */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingBatch}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmBatchDelete}
                disabled={deleteModalCountdown > 0 || isDeletingBatch}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingBatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : deleteModalCountdown > 0 ? (
                  <span>Aguarde ({deleteModalCountdown}s)...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir {selectedEventIds.length} Gravações</span>
                  </>
                )}
              </button>
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

              {/* Sequential Controls & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateEvent("prev")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                  title="Gravação Anterior"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigateEvent("next")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                  title="Próxima Gravação"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-inner">
              <video
                ref={videoRef}
                src={selectedEvent.clip_url || `/api/events/${selectedEvent.id}/clip.mp4`}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                <source src={selectedEvent.clip_url || `/api/events/${selectedEvent.id}/clip.mp4`} type="video/mp4" />
                <source src={`/frigate/api/events/${selectedEvent.id}/clip.mp4`} type="video/mp4" />
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
                {/* Retain Button */}
                <button
                  onClick={(e) => handleToggleRetain(e, selectedEvent)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedEvent.retained
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{selectedEvent.retained ? "Desafixar" : "Fixar NVMe"}</span>
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteSingleEvent(e, selectedEvent)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>

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
                  href={selectedEvent.clip_url ? `${selectedEvent.clip_url}?download=1` : `/api/events/${selectedEvent.id}/clip.mp4?download=1`}
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
