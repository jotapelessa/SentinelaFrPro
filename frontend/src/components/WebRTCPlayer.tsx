"use client";

import React, { useState, useEffect } from "react";
import { Maximize2, Minimize2, Radio, RefreshCw, Zap, Settings, Gauge, ShieldAlert, Activity, Pause, Play, PauseCircle, Loader2 } from "lucide-react";
import { Camera, useSentinelaStore } from "@/store/useSentinelaStore";
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
  const { activeDetections, motionStatus, liveObjectCounts } = useSentinelaStore();
  
  // Default to ultra-low latency WebRTC (<80ms) with seamless fallback
  const initialMode = (camera.stream_mode === "eco" || camera.stream_mode === "monitor") ? "monitor" : "webrtc";
  const [streamMode, setStreamMode] = useState<"monitor" | "webrtc" | "mse">(initialMode);

  const [ecoFps, setEcoFps] = useState<number>(camera.eco_fps || 2);
  const [key, setKey] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string>(`/frigate/api/${camera.name || "camera_principal"}/latest.jpg?h=360`);
  const [isLiveOnline, setIsLiveOnline] = useState(true);
  const [isPaused, setIsPaused] = useState<boolean>(camera.enabled === false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  useEffect(() => {
    setIsPaused(camera.enabled === false);
  }, [camera.enabled]);

  const handleTogglePause = async () => {
    setIsTogglingPause(true);
    const targetState = !isPaused;
    setIsPaused(targetState);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camId = camera.id || camera.name || "camera_principal";
      const res = await fetch(`${apiUrl}/cameras/${camId}/toggle-pause`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setIsPaused(data.is_paused);
        if (onCameraUpdated) onCameraUpdated();
      }
    } catch (e) {
      console.error("Erro ao alternar pausa da câmera:", e);
      setIsPaused(!targetState);
    } finally {
      setIsTogglingPause(false);
    }
  };

  const cameraSrc = camera.name || "camera_principal";
  // Build a set of all known aliases for this camera to match MQTT payloads
  const cameraAliases = new Set<string>([
    cameraSrc,
    camera.name || "",
    camera.friendly_name || "",
    camera.ip_address || "",
    "camera_principal"
  ].filter(Boolean));

  const activeDet = Array.from(cameraAliases)
    .map((alias) => activeDetections[alias])
    .find(Boolean) || null;

  const isMotion = Array.from(cameraAliases)
    .some((alias) => !!motionStatus[alias]);

  const camCounts = Array.from(cameraAliases)
    .map((alias) => liveObjectCounts[alias])
    .find(Boolean) || {};

  const reloadStream = () => {
    setKey((prev) => prev + 1);
  };

  // Double-buffered Eco FPS frame ticker with AbortController for clean teardown
  useEffect(() => {
    if (streamMode !== "monitor" || isPaused) return;

    let active = true;
    let timer: NodeJS.Timeout;
    let abortCtrl = new AbortController();
    const intervalMs = Math.max(200, Math.round(1000 / (ecoFps || 2)));

    const fetchNextFrame = () => {
      abortCtrl = new AbortController();
      const nextSrc = `/frigate/api/${cameraSrc}/latest.jpg?h=360&t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        if (active) {
          setFrameUrl(nextSrc);
          setIsLiveOnline(true);
          timer = setTimeout(fetchNextFrame, intervalMs);
        }
      };
      img.onerror = () => {
        if (active) {
          const gSrc = `/go2rtc/api/frame.jpeg?src=${cameraSrc}&t=${Date.now()}`;
          const gImg = new Image();
          gImg.onload = () => {
            if (active) {
              setFrameUrl(gSrc);
              setIsLiveOnline(true);
              timer = setTimeout(fetchNextFrame, intervalMs);
            }
          };
          gImg.onerror = () => {
            if (active) {
              setIsLiveOnline(false);
              timer = setTimeout(fetchNextFrame, 2000);
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
      abortCtrl.abort();
    };
  }, [streamMode, cameraSrc, ecoFps, key]);

  const getStreamUrl = () => {
    switch (streamMode) {
      case "webrtc":
        return `/go2rtc/stream.html?src=${encodeURIComponent(cameraSrc)}&mode=webrtc&mode=mse`;
      case "mse":
        return `/go2rtc/stream.html?src=${encodeURIComponent(cameraSrc)}&mode=mse&mode=webrtc`;
      default:
        return frameUrl;
    }
  };

  // Format bounding box if available
  const renderBoundingBox = () => {
    if (!activeDet?.box || !Array.isArray(activeDet.box) || activeDet.box.length < 4) return null;
    let [ymin, xmin, ymax, xmax] = activeDet.box;
    // Normalize coordinates if needed
    if (ymin > 1 || xmin > 1 || ymax > 1 || xmax > 1) {
      ymin = ymin / 720;
      ymax = ymax / 720;
      xmin = xmin / 1280;
      xmax = xmax / 1280;
    }
    const topPct = Math.max(0, Math.min(100, ymin * 100));
    const leftPct = Math.max(0, Math.min(100, xmin * 100));
    const widthPct = Math.max(2, Math.min(100, (xmax - xmin) * 100));
    const heightPct = Math.max(2, Math.min(100, (ymax - ymin) * 100));

    return (
      <div
        className="absolute border-2 border-rose-500 bg-rose-500/15 pointer-events-none rounded transition-all duration-200 z-10 shadow-lg shadow-rose-500/40"
        style={{
          top: `${topPct}%`,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`
        }}
      >
        <span className="absolute -top-5 left-0 px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider shadow">
          {activeDet.label} {activeDet.score}%
        </span>
      </div>
    );
  };

  const handleIframeLoad = () => {
    // Native iframe loaded, go2rtc handles autoplay via query string
  };

  return (
    <>
      <div
        className={`relative group rounded-2xl overflow-hidden glass-panel transition-all bg-obsidian-950 select-none ${
          activeDet
            ? "border-2 border-rose-500 ring-4 ring-rose-500/30 shadow-2xl shadow-rose-500/25"
            : isMotion
            ? "border border-amber-500/80 ring-2 ring-amber-500/20"
            : "border border-slate-800 hover:border-cyan-500/50"
        } ${isSpotlight ? "h-[65vh] min-h-[420px]" : "h-72 sm:h-80"}`}
      >
        {/* Stream Viewer */}
        {isPaused ? (
          <div className="w-full h-full relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center select-none z-10">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-xl shadow-amber-500/10 mb-3 animate-pulse">
              <PauseCircle className="w-10 h-10" />
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs uppercase tracking-widest mb-1.5">
              Câmera em Standby (Pausada)
            </span>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Transmissão de vídeo, gravação e inferência de IA suspensas temporariamente para máxima economia de CPU e privacidade.
            </p>
            <button
              onClick={handleTogglePause}
              disabled={isTogglingPause}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-obsidian-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isTogglingPause ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-obsidian-950" />
              )}
              <span>Retomar Transmissão Ao Vivo</span>
            </button>
          </div>
        ) : streamMode === "monitor" ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
            <img
              key={`${cameraSrc}-frame-${key}`}
              src={frameUrl}
              alt={camera.friendly_name || camera.name}
              className="w-full h-full object-cover"
            />
            {renderBoundingBox()}
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
            onLoad={handleIframeLoad}
            className="w-full h-full border-0 bg-black"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
        )}

        {/* Real-time Security Intrusion / Detection Floating Banner */}
        {activeDet && !isPaused && (
          <div className="absolute top-12 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/90 border border-rose-500 shadow-xl shadow-rose-950/80 text-rose-200 text-xs font-black animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>
              {activeDet.label.toUpperCase()} DETECTADO {activeDet.zone ? `(ZONA: ${activeDet.zone})` : ""}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
              {activeDet.score}%
            </span>
          </div>
        )}

        {/* Real-time Motion Alert (when no object classified yet) */}
        {!activeDet && isMotion && !isPaused && (
          <div className="absolute top-12 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-500/60 shadow-lg text-amber-300 text-[11px] font-bold">
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>MOVIMENTO DETECTADO</span>
          </div>
        )}

        {/* Camera HUD Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? "bg-amber-400" : activeDet ? "bg-rose-500 animate-ping" : isMotion ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-ping"}`} />
            <span className="font-bold text-xs tracking-wide text-white uppercase drop-shadow-md">
              {camera.friendly_name || camera.name}
            </span>
            <span className="text-[10px] text-slate-300 font-mono drop-shadow">
              ({camera.ip_address || "127.0.0.1"})
            </span>
            
            {/* Stream Mode & FPS Badge */}
            {isPaused ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                <PauseCircle className="w-2.5 h-2.5" />
                STANDBY
              </span>
            ) : streamMode === "monitor" ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Gauge className="w-2.5 h-2.5" />
                {ecoFps} FPS (Eco & Sync Total)
              </span>
            ) : streamMode === "webrtc" ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                WebRTC (&lt;50ms)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                MSE (24 FPS)
              </span>
            )}

            {/* Live Object Badges if detected in camera */}
            {!isPaused && Object.entries(camCounts).map(([lbl, cnt]) => cnt > 0 && (
              <span key={lbl} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-extrabold flex items-center gap-1">
                {lbl.toUpperCase()}: {cnt}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
            {isPaused ? (
              <span className="px-2 py-0.5 rounded border font-bold flex items-center gap-1 bg-amber-950/80 border-amber-500/40 text-amber-400">
                <PauseCircle className="w-3 h-3" />
                PAUSADA
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${activeDet ? "bg-rose-950/80 border-rose-500 text-rose-400" : "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"}`}>
                <Radio className="w-3 h-3 animate-pulse" />
                {activeDet ? "ALERTA IA" : "AO VIVO"}
              </span>
            )}

            {/* Quick Pause / Play Button */}
            <button
              type="button"
              onClick={handleTogglePause}
              disabled={isTogglingPause}
              className={`p-1.5 px-2 rounded-lg border transition-all cursor-pointer pointer-events-auto flex items-center gap-1 font-bold ${
                isPaused
                  ? "bg-amber-500 hover:bg-amber-400 text-obsidian-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-black/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border-slate-700"
              }`}
              title={isPaused ? "Retomar Câmera (Play)" : "Pausar Câmera (Economia de CPU/Privacidade)"}
            >
              {isTogglingPause ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[10px]">Play</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Pausar</span>
                </>
              )}
            </button>

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
              title={`Modo Eco (${ecoFps} FPS @ 720p: Zero atraso, CPU Mínima)`}
            >
              Eco ({ecoFps} FPS)
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
              title="MSE (Fluxo Contínuo 24 FPS)"
            >
              MSE (24 FPS)
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


