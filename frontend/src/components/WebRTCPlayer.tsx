"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Radio, AlertCircle, RefreshCw, Eye } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const initWebRTC = async () => {
    setHasError(false);
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setIsConnected(true);
        }
      };

      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(`/go2rtc/api/webrtc?src=${camera.name}`, {
        method: "POST",
        body: offer.sdp,
        headers: { "Content-Type": "application/sdp" }
      });

      if (res.ok) {
        const answer = await res.text();
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: answer })
        );
        setIsConnected(true);
      } else {
        // Fallback to go2rtc live view stream
        setUseIframeFallback(true);
      }
    } catch (e) {
      setUseIframeFallback(true);
    }
  };

  useEffect(() => {
    initWebRTC();
  }, [camera.name]);

  return (
    <div className={`relative group rounded-2xl overflow-hidden glass-panel border border-slate-800 hover:border-cyan-500/50 transition-all ${
      isSpotlight ? "h-[65vh] min-h-[420px]" : "h-72 sm:h-80"
    }`}>
      
      {/* Video Player or Direct Stream */}
      {useIframeFallback ? (
        <iframe
          src={`/go2rtc/webrtc.html?src=${camera.name}&media=video`}
          className="w-full h-full border-0 bg-obsidian-950"
          allow="autoplay"
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          className="w-full h-full object-cover bg-obsidian-950"
        />
      )}

      {/* Camera HUD Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-xs tracking-wide text-white uppercase drop-shadow-md">
            {camera.friendly_name || camera.name}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
            WebRTC 50ms
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-300">
          <span className="px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-emerald-400 font-bold">
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
      <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={initWebRTC}
          className="p-2 rounded-lg bg-black/70 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all text-xs"
          title="Recarregar Transmissão"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {onToggleSpotlight && (
          <button
            onClick={onToggleSpotlight}
            className="p-2 rounded-lg bg-black/70 hover:bg-cyan-500 hover:text-obsidian-950 text-white border border-slate-700 transition-all"
            title={isSpotlight ? "Modo Mosaico" : "Focar em Tela Cheia (Spotlight)"}
          >
            {isSpotlight ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};
