"use client";

import React, { useState } from "react";
import { Maximize2, Minimize2, Radio, RefreshCw, Layers, ShieldCheck } from "lucide-react";
import { Camera } from "@/store/useSentinelaStore";

interface WebRTCPlayerProps {
  camera: Camera;
  isSpotlight?: boolean;
  onToggleSpotlight?: () => void;
}

export const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({
  camera,
  isSpotlight = false,
  onToggleSpotlight
}) => {
  const [streamMode, setStreamMode] = useState<"webrtc" | "mse" | "mjpeg" | "frigate">("webrtc");
  const [key, setKey] = useState(0);

  const reloadStream = () => {
    setKey((prev) => prev + 1);
  };

  const cameraSrc = camera.name || "camera_principal";

  const getStreamUrl = () => {
    switch (streamMode) {
      case "webrtc":
        return `/go2rtc/stream.html?src=${cameraSrc}&mode=webrtc`;
      case "mse":
        return `/go2rtc/stream.html?src=${cameraSrc}&mode=mse`;
      case "mjpeg":
        return `/go2rtc/stream.html?src=${cameraSrc}&mode=mjpeg`;
      case "frigate":
        return `/frigate/api/${cameraSrc}/latest.webp?cache=${key}`;
      default:
        return `/go2rtc/stream.html?src=${cameraSrc}`;
    }
  };

  return (
    <div
      className={`relative group rounded-2xl overflow-hidden glass-panel border border-slate-800 hover:border-cyan-500/50 transition-all bg-obsidian-950 ${
        isSpotlight ? "h-[65vh] min-h-[420px]" : "h-72 sm:h-80"
      }`}
    >
      {/* Stream Viewer */}
      {streamMode === "frigate" ? (
        <img
          key={key}
          src={getStreamUrl()}
          alt={camera.friendly_name || camera.name}
          className="w-full h-full object-cover bg-black"
        />
      ) : (
        <iframe
          key={`${cameraSrc}-${streamMode}-${key}`}
          src={getStreamUrl()}
          className="w-full h-full border-0 bg-black"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        />
      )}

      {/* Camera HUD Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-xs tracking-wide text-white uppercase drop-shadow-md">
            {camera.friendly_name || camera.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
            {streamMode}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            AO VIVO
          </span>
          {camera.ip_address && (
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-black/60 border border-slate-700 text-slate-400">
              {camera.ip_address}
            </span>
          )}
        </div>
      </div>

      {/* Floating Action Controls on Hover */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity z-20">
        {/* Stream Mode Switcher */}
        <div className="flex items-center bg-black/80 backdrop-blur rounded-lg p-1 border border-slate-700 text-[10px] font-bold">
          <button
            onClick={() => setStreamMode("webrtc")}
            className={`px-2 py-1 rounded transition-all ${
              streamMode === "webrtc" ? "bg-cyan-500 text-obsidian-950 font-black" : "text-slate-400 hover:text-white"
            }`}
            title="WebRTC (Latência Zero)"
          >
            WebRTC
          </button>
          <button
            onClick={() => setStreamMode("mse")}
            className={`px-2 py-1 rounded transition-all ${
              streamMode === "mse" ? "bg-cyan-500 text-obsidian-950 font-black" : "text-slate-400 hover:text-white"
            }`}
            title="MSE (Ultra Fluido / Sem Travas)"
          >
            MSE
          </button>
          <button
            onClick={() => setStreamMode("mjpeg")}
            className={`px-2 py-1 rounded transition-all ${
              streamMode === "mjpeg" ? "bg-cyan-500 text-obsidian-950 font-black" : "text-slate-400 hover:text-white"
            }`}
            title="MJPEG (Modo Compatibilidade Universal)"
          >
            MJPEG
          </button>
        </div>

        <button
          onClick={reloadStream}
          className="p-2 rounded-lg bg-black/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all text-xs"
          title="Recarregar Transmissão"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {onToggleSpotlight && (
          <button
            onClick={onToggleSpotlight}
            className="p-2 rounded-lg bg-black/80 hover:bg-cyan-500 hover:text-obsidian-950 text-white border border-slate-700 transition-all"
            title={isSpotlight ? "Modo Mosaico" : "Focar em Tela Cheia (Spotlight)"}
          >
            {isSpotlight ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};
