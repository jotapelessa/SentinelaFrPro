"use client";

import React, { useState, useEffect } from "react";
import { CameraMosaic } from "@/components/CameraMosaic";
import { useSentinelaStore, SecurityEvent } from "@/store/useSentinelaStore";
import { ShieldCheck, Bell, Clock, ArrowRight, ShieldAlert, Film, X, Play, Eye } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { events, setEvents } = useSentinelaStore();
  const [activeEventVideo, setActiveEventVideo] = useState<SecurityEvent | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  // Auto-fetch recent historical events on mount
  useEffect(() => {
    const fetchRecentEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
        const res = await fetch(`${apiUrl}/events?limit=25`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setEvents(data);
          }
        }
      } catch (err) {
        console.error("Error fetching historical events on Dashboard:", err);
      }
    };
    fetchRecentEvents();
  }, [setEvents]);

  // Filter events based on selected category pill
  const filteredEvents = events.filter((ev) => {
    if (selectedFilter === "ALL") return true;
    const l = ev.label.toLowerCase();
    if (selectedFilter === "PERSON") return l === "person";
    if (selectedFilter === "VEHICLE") return ["car", "motorcycle", "bus", "bicycle", "truck"].includes(l);
    if (selectedFilter === "ANIMAL") return ["dog", "cat", "bird", "horse"].includes(l);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome / Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-cyan-500/20 bg-gradient-to-r from-obsidian-900 via-obsidian-900/90 to-obsidian-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
              Central de Vigilância Sentinela
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              SentinelaPro.001.000.000.014 • Protegido por IA OpenVINO & Tailscale Encrypted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-300 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 font-bold font-mono text-xs flex items-center gap-1.5 shadow-sm">
            🛡️ SentinelaPro.001.000.000.012
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            VIGILÂNCIA ARMADA
          </span>
        </div>
      </div>

      {/* Main Grid: Live Mosaic (70%) + Quick Events Stream (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Mosaic & SSD 24h Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <CameraMosaic />
        </div>

        {/* Real-time ROI Events Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Últimos Eventos ROI
              </h2>
            </div>
            <Link
              href="/events"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Filter Category Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
            {[
              { id: "ALL", label: "Todos" },
              { id: "PERSON", label: "👤 Pessoas" },
              { id: "VEHICLE", label: "🚗 Veículos" },
              { id: "ANIMAL", label: "🐾 Animais" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`flex-1 py-1 rounded-lg text-center font-bold transition-all ${
                  selectedFilter === tab.id
                    ? "bg-cyan-500 text-obsidian-950 shadow-sm shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-3 border border-slate-800 space-y-2.5 max-h-[540px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">Nenhum evento registrado nesta categoria.</p>
                <p className="text-[11px] text-slate-600">Detecções nas zonas ROI aparecerão aqui instantaneamente.</p>
              </div>
            ) : (
              filteredEvents.slice(0, 10).map((ev, idx) => {
                const isPerson = ev.label.toLowerCase() === "person";
                const snapshotUrl = ev.snapshot_url || `/frigate/api/events/${ev.id}/snapshot.jpg`;

                return (
                  <div
                    key={ev.id || idx}
                    onClick={() => setActiveEventVideo(ev)}
                    className="p-2.5 rounded-2xl bg-obsidian-950/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all cursor-pointer flex items-center gap-3 group shadow-sm"
                  >
                    {/* Thumbnail Snapshot */}
                    <div className="relative w-16 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                      <img
                        src={snapshotUrl}
                        alt={ev.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <Play className="w-4 h-4 text-white opacity-80 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isPerson 
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" 
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}>
                            {ev.label}
                          </span>
                          {ev.score && (
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {ev.score}%
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 font-mono truncate">
                        {ev.camera} {ev.zone ? `• Zona: ${ev.zone}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Video Modal Player for Clicked Event */}
      {activeEventVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Gravação do Evento: {activeEventVideo.label} ({activeEventVideo.camera})
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {new Date(activeEventVideo.timestamp).toLocaleString()} • Precisão: {activeEventVideo.score}%
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveEventVideo(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-slate-800">
              <video
                src={activeEventVideo.clip_url || `/frigate/api/events/${activeEventVideo.id}/clip.mp4`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Seu navegador não suporta reprodução direta deste formato de vídeo MP4.
              </video>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Zona ROI: {activeEventVideo.zone || "Geral"}</span>
              <a
                href={activeEventVideo.clip_url || `/frigate/api/events/${activeEventVideo.id}/clip.mp4`}
                download
                className="text-cyan-400 hover:underline font-bold"
              >
                Download do Vídeo MP4
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
