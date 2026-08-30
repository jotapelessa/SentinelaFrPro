"use client";

import React, { useState, useEffect } from "react";
import { useSentinelaStore, SecurityEvent } from "@/store/useSentinelaStore";
import { Bell, Filter, Video, Clock, ShieldAlert, Calendar, RefreshCw } from "lucide-react";

export default function EventsPage() {
  const { events, cameras } = useSentinelaStore();
  const [filterCamera, setFilterCamera] = useState<string>("all");
  const [filterLabel, setFilterLabel] = useState<string>("all");

  const filteredEvents = events.filter((ev) => {
    if (filterCamera !== "all" && ev.camera !== filterCamera) return false;
    if (filterLabel !== "all" && ev.label !== filterLabel) return false;
    return true;
  });

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
              Linha do Tempo de Eventos & Gravações
            </h1>
            <p className="text-xs text-slate-400">
              Histórico de detecções espaciais e clipes consolidados no NVMe SSD.
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="all">Todas as Câmeras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.name}>{c.friendly_name || c.name}</option>
            ))}
          </select>

          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-obsidian-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option value="all">Todos os Objetos</option>
            <option value="person">Pessoas (Intrusão)</option>
            <option value="car">Carros</option>
            <option value="motorcycle">Motos</option>
            <option value="dog">Animais</option>
          </select>
        </div>
      </div>

      {/* Events Grid / Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="p-16 text-center glass-panel rounded-2xl border border-dashed border-slate-800 space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Nenhum evento registrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Assim que pessoas ou veículos entrarem nas zonas monitoradas, os eventos e snapshots serão catalogados aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/40 transition-all group"
            >
              {/* Snapshot thumbnail */}
              <div className="h-44 bg-obsidian-950 relative overflow-hidden flex items-center justify-center">
                <img
                  src={ev.snapshot_url || "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&auto=format&fit=crop&q=60"}
                  alt="Snapshot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
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
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                  <span className="text-emerald-400 font-semibold">NVMe Retido</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
