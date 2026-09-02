"use client";

import React, { useState } from "react";
import { useSentinelaStore, Camera } from "@/store/useSentinelaStore";
import { Clock, Radio, Film, X, Play, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

interface TimelinePlaybackProps {
  camera: Camera;
  onOpenClip?: (videoUrl: string, title: string) => void;
}

export const TimelinePlayback: React.FC<TimelinePlaybackProps> = ({ camera, onOpenClip }) => {
  const { events } = useSentinelaStore();
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(new Date().getMinutes());
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [activeModalVideo, setActiveModalVideo] = useState<{ url: string; title: string } | null>(null);

  // Filter events for this specific camera
  const cameraEvents = events.filter(
    (e) => e.camera === camera.name || e.camera === camera.friendly_name
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

  const handlePlaySelectedTime = () => {
    const timeFormatted = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`;
    const title = `Gravação SSD - ${camera.friendly_name || camera.name} às ${timeFormatted}`;
    
    // Find matching event close to this time
    const matchingEvent = cameraEvents.find((ev) => {
      const d = new Date(ev.timestamp);
      return d.getHours() === selectedHour && Math.abs(d.getMinutes() - selectedMinute) <= 15;
    });

    const videoUrl = matchingEvent?.clip_url 
      || `/frigate/api/events/${matchingEvent?.id || "latest"}/clip.mp4`;

    if (onOpenClip) {
      onOpenClip(videoUrl, title);
    } else {
      setActiveModalVideo({ url: videoUrl, title });
    }
  };

  const handlePlayEvent = (ev: any) => {
    const evDate = new Date(ev.timestamp);
    const timeFormatted = evDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = `Evento: ${ev.label.toUpperCase()} em ${camera.friendly_name || camera.name} (${timeFormatted})`;
    const videoUrl = ev.clip_url || `/frigate/api/events/${ev.id}/clip.mp4`;

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
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Linha do Tempo 24h (Gravações no SSD)
          </span>
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
            className="px-3.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Assistir Gravação</span>
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

        {/* Hour Markers */}
        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5 pt-1.5 select-none">
          <span>00:00</span>
          <span>03:00</span>
          <span>06:00</span>
          <span>09:00</span>
          <span>12:00</span>
          <span>15:00</span>
          <span>18:00</span>
          <span>21:00</span>
          <span>23:59</span>
        </div>
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
