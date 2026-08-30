"use client";

import React, { useState, useEffect } from "react";
import { useSentinelaStore, SecurityEvent } from "@/store/useSentinelaStore";
import { Bell, Filter, Video, Clock, ShieldAlert, Calendar, RefreshCw, Play, Download, X, FileSpreadsheet, User, Car, Zap } from "lucide-react";

export default function EventsPage() {
  const { events, cameras } = useSentinelaStore();
  const [filterCamera, setFilterCamera] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");

  const filteredEvents = events.filter((ev) => {
    if (filterCamera !== "all" && ev.camera !== filterCamera) return false;
    if (filterLabel !== "all" && ev.label !== filterLabel) return false;
    return true;
  });

  const exportCSV = () => {
    if (filteredEvents.length === 0) return;
    const headers = ["ID", "Camera", "Objeto", "Confianca", "Data_Hora", "Zona"];
    const rows = filteredEvents.map((ev, i) => [
      i + 1,
      ev.camera,
      ev.label,
      `${ev.score || 0}%`,
      new Date(ev.timestamp).toLocaleString("pt-BR"),
      ev.zone || "Geral"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentinela_relatorio_eventos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenClip = (ev: SecurityEvent) => {
    // If event has clip_url, use it, else fallback to Frigate clip endpoint
    const clipUrl = ev.clip_url || `/frigate/api/events/${ev.id || "latest"}/clip.mp4`;
    setSelectedVideoUrl(clipUrl);
    setSelectedEventTitle(`${ev.label.toUpperCase()} em ${ev.camera} (${new Date(ev.timestamp).toLocaleTimeString()})`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide">
              Central de Eventos & Gravações Inteligentes
            </h1>
            <p className="text-xs text-slate-400">
              Histórico de detecções espaciais com clipes MP4 de alta definição consolidados no SSD NVMe.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all disabled:opacity-50"
            title="Exportar Relatório em Planilha CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <select
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-xs"
          >
            <option value="all">Todas as Câmeras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.name}>{c.friendly_name || c.name}</option>
            ))}
          </select>

          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium text-xs"
          >
            <option value="all">Todos os Objetos</option>
            <option value="person">Pessoas (Intrusão)</option>
            <option value="car">Carros</option>
            <option value="motorcycle">Motos</option>
            <option value="dog">Animais</option>
          </select>
        </div>
      </div>

      {/* Quick Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterLabel("all")}
          className={`px-3 py-1 rounded-full border transition-all font-semibold ${
            filterLabel === "all" ? "bg-cyan-500 text-obsidian-950 border-cyan-400" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          Todos ({events.length})
        </button>
        <button
          onClick={() => setFilterLabel("person")}
          className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-all font-semibold ${
            filterLabel === "person" ? "bg-cyan-500 text-obsidian-950 border-cyan-400" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Pessoas ({events.filter(e => e.label === "person").length})
        </button>
        <button
          onClick={() => setFilterLabel("car")}
          className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-all font-semibold ${
            filterLabel === "car" ? "bg-cyan-500 text-obsidian-950 border-cyan-400" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          Veículos ({events.filter(e => e.label === "car" || e.label === "motorcycle").length})
        </button>
      </div>

      {/* Events Grid / Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-2xl border border-dashed border-slate-800 space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Nenhum evento registrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Assim que pessoas ou veículos entrarem nas zonas monitoradas, os eventos, fotos e clipes MP4 serão catalogados aqui em tempo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/40 transition-all group"
            >
              {/* Snapshot thumbnail with Play Button Overlay */}
              <div
                onClick={() => handleOpenClip(ev)}
                className="h-44 bg-obsidian-950 relative overflow-hidden flex items-center justify-center cursor-pointer"
              >
                <img
                  src={ev.snapshot_url || "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=60"}
                  alt="Snapshot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                  <div className="p-3 rounded-full bg-cyan-500/90 text-obsidian-950 shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-cyan-300">
                  {ev.camera}
                </div>
                {ev.zone && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[9px] font-mono text-emerald-400">
                    ROI: {ev.zone}
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white uppercase tracking-wide">
                    {ev.label}
                  </span>
                  {ev.score && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      Confiança: {ev.score}%
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(ev.timestamp).toLocaleString("pt-BR")}
                  </span>
                  <button
                    onClick={() => handleOpenClip(ev)}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                  >
                    <span>Ver Clipe</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {selectedVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" />
                {selectedEventTitle || "Reprodução de Clipe MP4"}
              </h3>
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
              <video
                src={selectedVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Seu navegador não suporta a tag de vídeo.
              </video>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">Formato: H.264 MP4 / NVMe SSD</span>
              <a
                href={selectedVideoUrl}
                download="sentinela_clip.mp4"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Gravação</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
