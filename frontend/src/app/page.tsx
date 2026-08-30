"use client";

import React from "react";
import { CameraMosaic } from "@/components/CameraMosaic";
import { useSentinelaStore } from "@/store/useSentinelaStore";
import { ShieldCheck, Bell, Clock, ArrowRight, ShieldAlert, Cpu } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { events, telemetry } = useSentinelaStore();

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
            <p className="text-xs text-slate-400">
              Frigate NVR ativo com aceleração Intel Jasper Lake VAAPI & detecção espacial ROI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            VIGILÂNCIA ARMADA
          </span>
        </div>
      </div>

      {/* Main Grid: Live Mosaic (70%) + Quick Events Stream (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Mosaic */}
        <div className="lg:col-span-2 space-y-4">
          <CameraMosaic />
        </div>

        {/* Real-time Events Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Últimos Eventos ROI
              </h2>
            </div>
            <Link
              href="/events"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-panel rounded-2xl p-3 border border-slate-800 space-y-2.5 max-h-[520px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-xs">Nenhum evento registrado nesta sessão.</p>
                <p className="text-[11px] text-slate-600">Eventos em zonas de interesse aparecerão aqui instantaneamente.</p>
              </div>
            ) : (
              events.slice(0, 8).map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-obsidian-950/80 border border-slate-800 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white uppercase">{ev.label}</span>
                        {ev.score && (
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                            {ev.score}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {ev.camera} {ev.zone ? `• ${ev.zone}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
