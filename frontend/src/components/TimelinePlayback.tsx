"use client";

import React, { useState } from "react";
import { useSentinelaStore, Camera, SecurityEvent } from "@/store/useSentinelaStore";
import { Clock, Play, RotateCcw, RotateCw, Radio, ShieldAlert, Film, ChevronLeft, ChevronRight } from "lucide-react";

interface TimelinePlaybackProps {
  camera: Camera;
  onOpenClip?: (videoUrl: string, title: string) => void;
}

export const TimelinePlayback: React.FC<TimelinePlaybackProps> = ({ camera, onOpenClip }) => {
  const { events } = useSentinelaStore();
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(new Date().getMinutes());
  const [isLiveMode, setIsLiveMode] = useState(true);

  // Filter events for this specific camera
  const cameraEvents = events.filter(
    (e) => e.camera === camera.name || e.camera === camera.friendly_name
  );

  // Calculate current timestamp slider percentage (0 to 1440 minutes in a day)
  const currentMinutesInDay = selectedHour * 60 + selectedMinute;

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
    const title = `Gravação NVMe - ${camera.friendly_name || camera.name} às ${timeFormatted}`;
    
    // Find if there is a real event close to this time
    const matchingEvent = cameraEvents.find((ev) => {
      const d = new Date(ev.timestamp);
      return d.getHours() === selectedHour && Math.abs(d.getMinutes() - selectedMinute) <= 15;
    });

    const videoUrl = matchingEvent?.clip_url 
      || `/frigate/api/events/${matchingEvent?.id || "latest"}/clip.mp4`;

    if (onOpenClip) {
      onOpenClip(videoUrl, title);
    } else {
      window.open(videoUrl, "_blank");
    }
  };

  return (
    <div className="w-full bg-slate-950/80 backdrop-blur border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Linha do Tempo 24h (Gravações no SSD)
          </span>
          <span className="font-mono text-cyan-300 font-black px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-xs">
            {String(selectedHour).padStart(2, "0")}:{String(selectedMinute).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
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
            className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black shadow-md shadow-cyan-500/20 flex items-center gap-1 transition-all"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Assistir Gravação</span>
          </button>
        </div>
      </div>

      {/* 24-Hour Scrubber Bar */}
      <div className="relative pt-1">
        {/* Heatmap Event Track */}
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex relative">
          {/* Continuous recording base */}
          <div className="w-full h-full bg-cyan-950/40" />

          {/* Event Hotspots */}
          {cameraEvents.map((ev, i) => {
            const evDate = new Date(ev.timestamp);
            const minuteOfDay = evDate.getHours() * 60 + evDate.getMinutes();
            const pct = (minuteOfDay / 1440) * 100;
            const isPerson = ev.label === "person";

            return (
              <div
                key={i}
                style={{ left: `${pct}%` }}
                title={`${ev.label} às ${evDate.toLocaleTimeString()}`}
                className={`absolute top-0 bottom-0 w-2.5 rounded-full ${
                  isPerson ? "bg-rose-500 shadow-sm shadow-rose-500" : "bg-amber-400"
                }`}
              />
            );
          })}
        </div>

        {/* Range Slider for Scrubbing */}
        <input
          type="range"
          min={0}
          max={1439}
          value={currentMinutesInDay}
          onChange={handleSliderChange}
          className="w-full h-3 accent-cyan-400 cursor-pointer absolute top-1 left-0 opacity-0"
        />

        {/* Hour Markers */}
        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5 pt-1.5 select-none">
          <span>00h</span>
          <span>03h</span>
          <span>06h</span>
          <span>09h</span>
          <span>12h</span>
          <span>15h</span>
          <span>18h</span>
          <span>21h</span>
          <span>24h</span>
        </div>
      </div>
    </div>
  );
};
