"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Maximize2, ShieldAlert, Radio } from "lucide-react";

interface PipAlertData {
  type: string;
  camera: string;
  label?: string;
  score?: number;
  zone?: string;
  event_id?: string;
  snapshot_url?: string;
  stream_url?: string;
}

export const WebPipAlertModal: React.FC = () => {
  const [activeAlert, setActiveAlert] = useState<PipAlertData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(12);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handlePipAlert = (e: Event) => {
      const customEvent = e as CustomEvent<PipAlertData>;
      const detail = customEvent.detail;
      if (!detail || !detail.camera) return;

      // Idempotência: se já estiver ativo para a mesma câmera, apenas estende o timer de auto-dismiss
      setActiveAlert(prev => {
        if (prev && prev.camera === detail.camera) {
          return { ...prev, ...detail };
        }
        return detail;
      });

      // Reset timer
      setTimeLeft(12);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      dismissTimerRef.current = setTimeout(() => {
        setActiveAlert(null);
      }, 12000);
    };

    window.addEventListener("pip_alert", handlePipAlert);

    return () => {
      window.removeEventListener("pip_alert", handlePipAlert);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleClose = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveAlert(null);
  };

  const handleNativePip = async () => {
    try {
      if (iframeRef.current && iframeRef.current.contentDocument) {
        const video = iframeRef.current.contentDocument.querySelector("video");
        if (video && document.pictureInPictureEnabled) {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        }
      }
    } catch (err) {
      console.debug("Native PiP fallback:", err);
    }
  };

  if (!activeAlert) return null;

  const streamSrc = activeAlert.stream_url || `/go2rtc/stream.html?src=${encodeURIComponent(activeAlert.camera)}&mode=mse`;

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 z-50 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Header Superior */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            Alerta PiP Web
          </span>
          {activeAlert.label && (
            <span className="text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
              {activeAlert.label.toUpperCase()} {activeAlert.score ? `${activeAlert.score}%` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNativePip}
            title="Desacoplar PiP Nativo do Navegador"
            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            title="Fechar Prévia"
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewport 16:9 do Stream ao Vivo */}
      <div className="relative aspect-video w-full bg-black">
        <iframe
          ref={iframeRef}
          src={streamSrc}
          className="w-full h-full border-0 pointer-events-auto"
          allow="autoplay; fullscreen; picture-in-picture"
          title={`PiP ${activeAlert.camera}`}
        />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1 font-mono">
          <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
          {activeAlert.camera}
        </div>
      </div>

      {/* Rodapé com Countdown Bar */}
      <div className="px-3 py-2 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Zona: <strong className="text-slate-200">{activeAlert.zone || "Geral"}</strong></span>
        <span className="font-mono text-cyan-400 text-[10px] font-bold">Auto-fechar: {timeLeft}s</span>
      </div>
      <div className="w-full h-1 bg-slate-800 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 12) * 100}%` }}
        />
      </div>
    </div>
  );
};
