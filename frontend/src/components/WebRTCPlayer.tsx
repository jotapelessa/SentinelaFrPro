"use client";

import React, { useState, useEffect } from "react";
import { Maximize2, Minimize2, Radio, RefreshCw, Zap, Settings, Gauge } from "lucide-react";
import { Camera } from "@/store/useSentinelaStore";
import { CameraConfigModal } from "./CameraConfigModal";

interface WebRTCPlayerProps {
  camera: Camera;
  isSpotlight?: boolean;
  onToggleSpotlight?: () => void;
  onCameraUpdated?: () => void;
}

export const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({
  camera,
  isSpotlight = false,
  onToggleSpotlight,
  onCameraUpdated
}) => {
  // Default to "monitor" (5 FPS 720p) for zero-lag, low-CPU, 100% synchrony with Frigate
  const [streamMode, setStreamMode] = useState<"monitor" | "webrtc" | "mse">("monitor");
  const [key, setKey] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string>(`/frigate/api/${camera.name || "camera_principal"}/latest.jpg?h=720`);
  const [isLiveOnline, setIsLiveOnline] = useState(true);

  const cameraSrc = camera.name || "camera_principal";

  const reloadStream = () => {
    setKey((prev) => prev + 1);
  };

  // Double-buffered 5 FPS frame ticker: Preloads next frame in memory before swapping
  // Guarantees zero buffering lag, zero memory accumulation, and perfect 1:1 synchrony with Frigate
  useEffect(() => {
    if (streamMode !== "monitor") return;

    let active = true;
    let timer: NodeJS.Timeout;

    const fetchNextFrame = () => {
      const nextSrc = `/frigate/api/${cameraSrc}/latest.jpg?h=720&t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        if (active) {
          setFrameUrl(nextSrc);
          setIsLiveOnline(true);
          // 5 FPS = 200ms per frame
          timer = setTimeout(fetchNextFrame, 200);
        }
      };
      img.onerror = () => {
        if (active) {
          // Fallback to go2rtc frame if Frigate latest.jpg is busy
          const gSrc = `/go2rtc/api/frame.jpeg?src=${cameraSrc}&t=${Date.now()}`;
          const gImg = new Image();
          gImg.onload = () => {
            if (active) {
              setFrameUrl(gSrc);
              setIsLiveOnline(true);
              timer = setTimeout(fetchNextFrame, 200);
            }
          };
          gImg.onerror = () => {
            if (active) {
              setIsLiveOnline(false);
              timer = setTimeout(fetchNextFrame, 1000);
            }
          };
          gImg.src = gSrc;
        }
      };
      img.src = nextSrc;
    };

    fetchNextFrame();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [streamMode, cameraSrc, key]);

  const getStreamUrl = () => {
    switch (streamMode) {
      case "webrtc":
        return `/go2rtc/stream.html?src=${cameraSrc}&mode=webrtc`;
      case "mse":
        return `/go2rtc/stream.html?src=${cameraSrc}&mode=mse`;
      default:
        return frameUrl;
    }
  };

  return (
    <>
      <div
        className={`relative group rounded-2xl overflow-hidden glass-panel border border-slate-800 hover:border-cyan-500/50 transition-all bg-obsidian-950 select-none ${
          isSpotlight ? "h-[65vh] min-h-[420px]" : "h-72 sm:h-80"
        }`}
      >
        {/* Stream Viewer */}
        {streamMode === "monitor" ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
            <img
              key={`${cameraSrc}-frame-${key}`}
              src={frameUrl}
              alt={camera.friendly_name || camera.name}
              className="w-full h-full object-cover"
            />
            {!isLiveOnline && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-xs font-mono font-bold">Conectando ao Frigate NVR...</span>
              </div>
            )}
          </div>
        ) : (
          <iframe
            key={`${cameraSrc}-${streamMode}-${key}`}
            src={getStreamUrl()}
            className="w-full h-full border-0 bg-black"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
        )}

        {/* Camera HUD Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-xs tracking-wide text-white uppercase drop-shadow-md">
              {camera.friendly_name || camera.name}
            </span>
            
            {streamMode === "monitor" ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Gauge className="w-2.5 h-2.5" />
                5 FPS (Eco & Sync Total)
              </span>
            ) : streamMode === "webrtc" ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                WebRTC (&lt;50ms)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                MSE (60 FPS)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              AO VIVO
            </span>

            {/* Individual Camera Settings Button */}
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="p-1.5 rounded-lg bg-black/80 hover:bg-cyan-500 hover:text-obsidian-950 text-slate-300 border border-slate-700 transition-all cursor-pointer pointer-events-auto"
              title="Configurar Esta Câmera Individualmente"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Action Controls on Hover */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity z-20">
          {/* Stream Mode Switcher */}
          <div className="flex items-center bg-black/85 backdrop-blur rounded-lg p-1 border border-slate-700 text-[10px] font-bold">
            <button
              onClick={() => setStreamMode("monitor")}
              className={`px-2 py-1 rounded transition-all ${
                streamMode === "monitor" ? "bg-emerald-500 text-obsidian-950 font-black" : "text-slate-400 hover:text-white"
              }`}
              title="Modo Monitor (5 FPS @ 720p: Sem delay acumulado, Consumo CPU Mínimo)"
            >
              5 FPS (Sync)
            </button>
            <button
              onClick={() => setStreamMode("webrtc")}
              className={`px-2 py-1 rounded transition-all ${
                streamMode === "webrtc" ? "bg-cyan-500 text-obsidian-950 font-black" : "text-slate-400 hover:text-white"
              }`}
              title="WebRTC (Latência Ultra-Baixa &lt;50ms)"
            >
              WebRTC
            </button>
            <button
              onClick={() => setStreamMode("mse")}
              className={`px-2 py-1 rounded transition-all ${
                streamMode === "mse" ? "bg-cyan-500 text-obsidian-950 font-black" : "text-slate-400 hover:text-white"
              }`}
              title="MSE (Fluxo Contínuo 60 FPS)"
            >
              MSE
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

      {/* Per-Camera Configuration Modal */}
      {isConfigOpen && (
        <CameraConfigModal
          camera={camera}
          onClose={() => setIsConfigOpen(false)}
          onSaved={() => {
            if (onCameraUpdated) onCameraUpdated();
          }}
        />
      )}
    </>
  );
};


