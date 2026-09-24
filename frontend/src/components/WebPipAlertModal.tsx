"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { X, Maximize2, ShieldAlert, Radio, PictureInPicture2, ExternalLink } from "lucide-react";
import { useSentinelaStore } from "@/store/useSentinelaStore";

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
  const isWebPipEnabled = useSentinelaStore((state) => state.isWebPipEnabled);
  const [activeAlert, setActiveAlert] = useState<PipAlertData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(12);
  const [isMultiTabPipActive, setIsMultiTabPipActive] = useState<boolean>(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  // Helper para atualizar feed na janela flutuante nativa do SO (Document Picture-in-Picture)
  const updatePipWindowFeed = useCallback((camera: string, label?: string, zone?: string) => {
    if (!pipWindowRef.current || pipWindowRef.current.closed) {
      pipWindowRef.current = null;
      setIsMultiTabPipActive(false);
      return;
    }
    const doc = pipWindowRef.current.document;
    const iframe = doc.getElementById("pip-stream-frame") as HTMLIFrameElement;
    const titleEl = doc.getElementById("pip-cam-name");
    const tagEl = doc.getElementById("pip-cam-tag");
    const src = `/go2rtc/stream.html?src=${encodeURIComponent(camera)}&mode=mse&media=video`;

    if (iframe && iframe.src !== src) {
      iframe.src = src;
    }
    if (titleEl) titleEl.textContent = camera;
    if (tagEl) tagEl.textContent = `${label ? label.toUpperCase() : "MOVIMENTO"} • ${zone || "Geral"}`;
  }, []);

  // Disparador de Notificação Nativa do SO quando em outras abas
  const triggerDesktopNotification = useCallback((detail: PipAlertData) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted" && document.hidden) {
      try {
        const notif = new Notification(`🚨 Sentinela: ${detail.camera}`, {
          body: `Detectado: ${detail.label ? detail.label.toUpperCase() : "Movimento"} (${detail.score ? `${detail.score}%` : ""}) na zona ${detail.zone || "Geral"}.`,
          icon: "/icon-192.png",
          tag: `sentinela-${detail.camera}`,
          silent: false
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.debug("Notification error:", err);
      }
    }
  }, []);

  // Abertura explícita do Document PiP (Always-On-Top no SO)
  const openDocumentPipWindow = useCallback(async (initialCam: string = "garagem") => {
    if (typeof window === "undefined") return;

    // Se já estiver aberto, apenas foca
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      return;
    }

    try {
      // 1. Pedir permissão de notificações em segundo plano
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }

      // 2. Verificar suporte da Document Picture-in-Picture API
      if ("documentPictureInPicture" in window) {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 440,
          height: 275,
        });
        pipWindowRef.current = pipWindow;
        setIsMultiTabPipActive(true);

        // Copiar folhas de estilos e fontes
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
          pipWindow.document.head.appendChild(el.cloneNode(true));
        });

        // Montar container Obsidian Pro dentro da janela PiP flutuante do SO
        const pipDoc = pipWindow.document;
        pipDoc.body.style.margin = "0";
        pipDoc.body.style.backgroundColor = "#020617";
        pipDoc.body.style.fontFamily = "system-ui, -apple-system, sans-serif";
        pipDoc.body.style.color = "#f8fafc";
        pipDoc.body.style.overflow = "hidden";

        pipDoc.body.innerHTML = `
          <div style="display: flex; flex-direction: column; width: 100vw; height: 100vh; background: #020617;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #0f172a; border-bottom: 1px solid #1e293b; font-size: 11px; font-weight: 600;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #06b6d4; display: inline-block; box-shadow: 0 0 8px #06b6d4;"></span>
                <span id="pip-cam-name" style="color: #67e8f9; font-weight: 700; text-transform: uppercase;">${initialCam}</span>
              </div>
              <span id="pip-cam-tag" style="background: rgba(6, 182, 212, 0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-family: monospace;">SENTINELA LIVE</span>
            </div>
            <div style="flex: 1; position: relative; width: 100%; height: calc(100% - 28px); background: #000;">
              <iframe id="pip-stream-frame" src="/go2rtc/stream.html?src=${encodeURIComponent(initialCam)}&mode=mse&media=video" style="width: 100%; height: 100%; border: none;" allow="autoplay; fullscreen"></iframe>
            </div>
          </div>
        `;

        pipWindow.addEventListener("pagehide", () => {
          pipWindowRef.current = null;
          setIsMultiTabPipActive(false);
        });

      } else {
        // Fallback: popup flutuante desencaixado
        const popup = window.open(
          `/go2rtc/stream.html?src=${encodeURIComponent(initialCam)}&mode=mse&media=video`,
          "SentinelaPiP",
          "width=440,height=280,resizable=yes,alwaysRaised=yes,scrollbars=no,status=no"
        );
        if (popup) {
          pipWindowRef.current = popup;
          setIsMultiTabPipActive(true);
        }
      }
    } catch (err) {
      console.warn("Document PiP window launch failed:", err);
    }
  }, []);

  // Ouvir disparo de abertura de PiP Multi-Abas vindo de qualquer botão da UI (ex: Header)
  useEffect(() => {
    const handleLaunchMultiTabPip = (e: Event) => {
      const customEvent = e as CustomEvent<{ camera?: string }>;
      openDocumentPipWindow(customEvent.detail?.camera || "garagem");
    };

    window.addEventListener("launch_multitab_pip", handleLaunchMultiTabPip);
    return () => {
      window.removeEventListener("launch_multitab_pip", handleLaunchMultiTabPip);
    };
  }, [openDocumentPipWindow]);

  useEffect(() => {
    const handlePipAlert = (e: Event) => {
      if (!isWebPipEnabled) return;

      const customEvent = e as CustomEvent<PipAlertData>;
      const detail = customEvent.detail;
      if (!detail || !detail.camera) return;

      // 1. Notificação nativa do SO se o usuário estiver navegando em outra aba
      triggerDesktopNotification(detail);

      // 2. Se houver janela PiP nativa aberta em segundo plano, atualiza o stream imediatamente!
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        updatePipWindowFeed(detail.camera, detail.label, detail.zone);
      }

      // 3. Alerta in-app com idempotência: se for a mesma câmera, apenas renova o countdown
      setActiveAlert(prev => {
        if (prev && prev.camera === detail.camera) {
          return { ...prev, ...detail };
        }
        return detail;
      });

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
  }, [triggerDesktopNotification, updatePipWindowFeed, isWebPipEnabled]);

  const handleClose = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setActiveAlert(null);
  };

  const handleNativePip = async () => {
    if (activeAlert) {
      await openDocumentPipWindow(activeAlert.camera);
    }
  };

  if (!activeAlert || !isWebPipEnabled) return null;

  const baseStreamSrc = activeAlert.stream_url || `/go2rtc/stream.html?src=${encodeURIComponent(activeAlert.camera)}&mode=mse&media=video`;
  const streamSrc = baseStreamSrc.includes("muted=") ? baseStreamSrc : `${baseStreamSrc}&muted=1`;

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
            title="Abrir em Janela PiP do Sistema (Visível em outras abas)"
            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
          >
            <PictureInPicture2 className="w-3.5 h-3.5" />
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

      {/* Rodapé com Ação Rápida e Countdown Bar */}
      <div className="px-3 py-2 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400 gap-2">
        <span className="truncate">Zona: <strong className="text-slate-200">{activeAlert.zone || "Geral"}</strong></span>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/events"
            onClick={handleClose}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-cyan-100 bg-cyan-950/80 hover:bg-cyan-900/80 px-2 py-0.5 rounded border border-cyan-500/30 transition shadow-sm"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>Ver Evento</span>
          </Link>
          <span className="font-mono text-cyan-400 text-[10px] font-bold">{timeLeft}s</span>
        </div>
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

