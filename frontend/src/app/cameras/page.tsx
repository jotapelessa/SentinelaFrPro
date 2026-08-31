"use client";

import React from "react";
import { CameraMosaic } from "@/components/CameraMosaic";
import { ShieldCheck, Video, Search } from "lucide-react";
import { useSentinelaStore } from "@/store/useSentinelaStore";

export default function CamerasPage() {
  const { setIsScannerOpen } = useSentinelaStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-cyan-500/20 bg-gradient-to-r from-obsidian-900 via-obsidian-900/90 to-obsidian-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
              Gerenciamento de Câmeras & Streams WebRTC
            </h1>
            <p className="text-xs text-slate-400">
              Controle de fontes RTSP, detecção com aceleração por hardware Intel Jasper Lake e zonas ROI.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Escanear Rede Local (ONVIF)</span>
        </button>
      </div>

      {/* Main Camera Mosaic */}
      <CameraMosaic />
    </div>
  );
}
