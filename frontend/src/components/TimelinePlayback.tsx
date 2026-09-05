"use client";

import React, { useState } from "react";
import { useSentinelaStore, Camera } from "@/store/useSentinelaStore";
import { Clock, Radio, Film, X, Play, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

interface TimelinePlaybackProps {
  camera: Camera;
  onOpenClip?: (videoUrl: string, title: string) => void;
}

export const TimelinePlayback: React.FC<TimelinePlaybackProps> = ({ camera, onOpenClip }) => {
  const { events, cameras } = useSentinelaStore();
  const [activeCamName, setActiveCamName] = useState<string>(camera.name);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(new Date().getMinutes());
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [activeModalVideo, setActiveModalVideo] = useState<{ url: string; title: string } | null>(null);

  const [isSeeking, setIsSeeking] = useState(false);

  // Active camera object
  const currentCamera = cameras.find((c) => c.name === activeCamName) || camera;

  // Filter events for active camera
  const cameraEvents = events.filter(
    (e) => e.camera === currentCamera.name || e.camera === currentCamera.friendly_name
  );

  // Calculate current timestamp slider percentage (0 to 1440 minutes in a day)
  const currentMinutesInDay = selectedHour * 60 + selectedMinute;
  const currentPercent = (currentMinutesInDay / 1440) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalMinutes = Number(e.target.value);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    setSelectedHour(h);
    setSelectedMinute(m);
    setIsLiveMode(false);
  };

  const handleJumpToLive = () => {
    const now = new Date();
    setSelectedHour(now.getHours());
    setSelectedMinute(now.getMinutes());
    setIsLiveMode(true);
  };

  const handleJumpOffset = (minutes: number) => {
    let total = selectedHour * 60 + selectedMinute + minutes;
    if (total < 0) total = 0;
    if (total > 1439) total = 1439;
    setSelectedHour(Math.floor(total / 60));
    setSelectedMinute(total % 60);
    setIsLiveMode(false);
  };

  const handlePlaySelectedTime = async () => {
    setIsSeeking(true);
    const timeFormatted = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    const title = `Gravação SSD - ${currentCamera.friendly_name || currentCamera.name} às ${timeFormatted}`;

    try {
      // 1. Calculate target timestamp in epoch seconds for today at selectedHour:selectedMinute
      const targetDate = new Date();
      targetDate.setHours(selectedHour, selectedMinute, 0, 0);
      const targetTs = Math.floor(targetDate.getTime() / 1000);

      // 2. Look for closest AI event within 45 minutes of target time
      let matchingEvent: any = null;
      let minDiff = Infinity;
      for (const ev of cameraEvents) {
        const evTs = ev.start_time || Math.floor(new Date(ev.timestamp).getTime() / 1000);
        const diff = Math.abs(evTs - targetTs);
        if (diff < minDiff && diff <= 45 * 60) {
          minDiff = diff;
          matchingEvent = ev;
        }
      }

      let videoUrl: string;
      if (matchingEvent) {
        videoUrl = matchingEvent.clip_url || `/api/events/${matchingEvent.id}/clip.mp4`;
      } else {
        // Continuous recording slice: Frigate /api/<camera>/start/<start>/end/<end>/clip.mp4 (60s slice)
        const startSlice = Math.max(0, targetTs - 15);
        const endSlice = targetTs + 45;
        videoUrl = `/frigate/api/${currentCamera.name}/start/${startSlice}/end/${endSlice}/clip.mp4`;
      }

      if (onOpenClip) {
        onOpenClip(videoUrl, title);
      } else {
        setActiveModalVideo({ url: videoUrl, title });
      }
    } finally {
      setIsSeeking(false);
    }
  };

  const handlePlayEvent = (ev: any) => {
    const evDate = new Date(ev.timestamp);
    setSelectedHour(evDate.getHours());
    setSelectedMinute(evDate.getMinutes());
    setIsLiveMode(false);

    const timeFormatted = evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = `Evento: ${ev.label.toUpperCase()} em ${currentCamera.friendly_name || currentCamera.name} (${timeFormatted})`;
    const videoUrl = ev.clip_url || `/api/events/${ev.id}/clip.mp4`;

    if (onOpenClip) {
      onOpenClip(videoUrl, title);
    } else {
      setActiveModalVideo({ url: videoUrl, title });
    }
  };

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-lg">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Linha do Tempo 24h (Gravações SSD)
          </span>

          {/* Camera Switcher Dropdown */}
          {cameras.length > 1 && (
            <select
              value={activeCamName}
              onChange={(e) => setActiveCamName(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-500"
            >
              {cameras.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.friendly_name || c.name}
                </option>
              ))}
            </select>
          )}

          <span className="font-mono text-cyan-300 font-black px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-xs shadow-sm">
            {String(selectedHour).padStart(2, "0")}:{String(selectedMinute).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] flex-wrap">
          <button
            type="button"
            onClick={() => handleJumpOffset(-60)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Voltar 1 hora"
          >
            -1h
          </button>
          <button
            type="button"
            onClick={() => handleJumpOffset(-15)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Voltar 15 min"
          >
            -15m
          </button>
          <button
            type="button"
            onClick={() => handleJumpOffset(15)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Avançar 15 min"
          >
            +15m
          </button>
          <button
            type="button"
            onClick={() => handleJumpOffset(60)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Avançar 1 hora"
          >
            +1h
          </button>

          <button
            type="button"
            onClick={handleJumpToLive}
            className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1 ${
              isLiveMode
                ? "bg-emerald-500 text-obsidian-950 shadow-md shadow-emerald-500/20"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>AO VIVO</span>
          </button>

          <button
            type="button"
            onClick={handlePlaySelectedTime}
            disabled={isSeeking}
            className={`px-3.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all ${
              isSeeking ? "opacity-75 cursor-wait" : ""
            }`}
          >
            <Film className={`w-3.5 h-3.5 ${isSeeking ? "animate-spin" : ""}`} />
            <span>{isSeeking ? "Carregando..." : "Assistir Gravação"}</span>
          </button>
        </div>
      </div>

      {/* 24-Hour Scrubber Bar Container */}
      <div className="relative pt-1 pb-1">
        {/* Heatmap Track */}
        <div className="w-full h-4 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 flex relative cursor-pointer">
          {/* Base Recording Layer */}
          <div className="w-full h-full bg-gradient-to-r from-cyan-950/30 via-slate-900 to-cyan-950/30" />

          {/* Event Hotspots */}
          {cameraEvents.map((ev, i) => {
            const evDate = new Date(ev.timestamp);
            const minuteOfDay = evDate.getHours() * 60 + evDate.getMinutes();
            const pct = (minuteOfDay / 1440) * 100;
            const isPerson = ev.label === "person";

            return (
              <button
                key={i}
                type="button"
                onClick={() => handlePlayEvent(ev)}
                style={{ left: `${pct}%` }}
                title={`Clique para assistir evento: ${ev.label} às ${evDate.toLocaleTimeString()}`}
                className={`absolute top-0 bottom-0 w-3 -ml-1.5 rounded-full transition-transform hover:scale-125 z-10 ${
                  isPerson ? "bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" : "bg-cyan-400"
                }`}
              />
            );
          })}

          {/* Needle Indicator for selected time */}
          <div
            style={{ left: `${currentPercent}%` }}
            className="absolute top-0 bottom-0 w-1 bg-white shadow-md shadow-cyan-400 z-20 pointer-events-none transition-all duration-75"
          />
        </div>

        {/* Real Range Slider */}
        <input
          type="range"
          min={0}
          max={1439}
          value={currentMinutesInDay}
          onChange={handleSliderChange}
          className="w-full h-4 accent-cyan-400 cursor-pointer absolute top-1 left-0 opacity-0 z-30"
        />

        {/* Interactive Clickable Hour Markers */}
        <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5 pt-1.5 select-none">
          {[
            { label: "00:00", h: 0 },
            { label: "03:00", h: 3 },
            { label: "06:00", h: 6 },
            { label: "09:00", h: 9 },
            { label: "12:00", h: 12 },
            { label: "15:00", h: 15 },
            { label: "18:00", h: 18 },
            { label: "21:00", h: 21 },
            { label: "23:59", h: 23, m: 59 }
          ].map((mk, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedHour(mk.h);
                setSelectedMinute(mk.m || 0);
                setIsLiveMode(false);
              }}
              className="hover:text-cyan-400 hover:font-bold transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-slate-900"
            >
              {mk.label}
            </button>
          ))}
        </div>

        {/* Quick Events Stream for this camera */}
        {cameraEvents.length > 0 && (
          <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-thin">
            <span className="text-slate-500 shrink-0 font-bold">Eventos Recentes:</span>
            {cameraEvents.slice(0, 6).map((ev, i) => {
              const d = new Date(ev.timestamp);
              const isPerson = ev.label === "person";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePlayEvent(ev)}
                  className={`shrink-0 px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all hover:scale-105 ${
                    isPerson
                      ? "bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900"
                      : "bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900"
                  }`}
                >
                  <span>{isPerson ? "👤" : "🚗"}</span>
                  <span>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-slate-400 font-normal">({ev.score}%)</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Built-in Video Player Modal */}
      {activeModalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">{activeModalVideo.title}</h3>
              </div>
              <button
                onClick={() => setActiveModalVideo(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-slate-800">
              <video
                src={activeModalVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Seu navegador não suporta reprodução direta deste formato de vídeo MP4.
              </video>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Fonte: Gravação local SSD (Frigate Storage)</span>
              <a
                href={activeModalVideo.url}
                download
                className="text-cyan-400 hover:underline font-bold"
              >
                Download do Clip MP4
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
