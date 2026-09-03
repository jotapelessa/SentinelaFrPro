import React, { useState } from 'react';
import { CameraEntity } from '../../types/tv';
import { Maximize2, ShieldAlert, Volume2, VolumeX, CircleDot, Navigation, Activity } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

interface TvHeroSpotlightProps {
  camera: CameraEntity;
  isFocused: boolean;
  onExpandFullscreen: () => void;
  onToggleRecord: () => void;
}

export const TvHeroSpotlight: React.FC<TvHeroSpotlightProps> = ({
  camera,
  isFocused,
  onExpandFullscreen,
  onToggleRecord,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [ptzOffset, setPtzOffset] = useState({ x: 0, y: 0 });

  const handlePtzMove = (dx: number, dy: number) => {
    tvAudio.playFocusTick();
    setPtzOffset((prev) => ({
      x: Math.max(-15, Math.min(15, prev.x + dx)),
      y: Math.max(-15, Math.min(15, prev.y + dy)),
    }));
  };

  return (
    <div
      id="tv-hero-spotlight"
      className={`relative w-full flex-1 rounded-[14px] overflow-hidden bg-[#0E1424] border transition-all duration-200 ${
        isFocused
          ? 'border-[#FFFFFF] shadow-[0_0_0_2px_#FFFFFF,0_0_30px_rgba(6,182,212,0.45)]'
          : 'border-[#1E293B]'
      }`}
    >
      {/* Background Image / Live Stream Simulation with PTZ transform */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `scale(1.08) translate(${ptzOffset.x}px, ${ptzOffset.y}px)`,
        }}
      >
        <img
          src={camera.thumbnailUrl}
          alt={camera.name}
          className="w-full h-full object-cover opacity-60 grayscale-[0.2] contrast-[1.1]"
        />
      </div>

      {/* Overlay Scanner / Vignette Effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(7,11,20,0.8) 0%, transparent 40%, transparent 60%, rgba(7,11,20,0.4) 100%)',
        }}
      />

      {/* Radial Scanner Dot Matrix Grid */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#22D3EE 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* TV Scanlines Effect */}
      <div className="absolute inset-0 tv-scanlines" />

      {/* AI Detection Bounding Boxes Overlay */}
      {camera.detectedObjects.map((det) => (
        <div
          key={det.id}
          className="absolute transition-all duration-500 border-2 rounded-[6px] pointer-events-none flex flex-col justify-start"
          style={{
            left: `${det.x}%`,
            top: `${det.y}%`,
            width: `${det.width}%`,
            height: `${det.height}%`,
            borderColor: det.color,
            backgroundColor: `${det.color}15`,
            boxShadow: `0 0 16px ${det.color}40`,
          }}
        >
          <div
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-t-[4px] text-white self-start uppercase tracking-wider flex items-center gap-1"
            style={{ backgroundColor: det.color }}
          >
            <span>{det.label}</span>
            <span className="opacity-80">({Math.round(det.confidence * 100)}%)</span>
          </div>
        </div>
      ))}

      {/* HUD Top Left: REC Badge & Camera Identification Box */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-[#E50914]/90 px-3 py-1 rounded flex items-center gap-2 animate-pulse w-fit">
          <div className="w-2 h-2 rounded-full bg-white" />
          <span className="text-[12px] font-bold tracking-tighter uppercase font-mono text-white">
            {camera.isRecording ? 'REC • 04:12:33' : 'LIVE • 04:12:33'}
          </span>
        </div>
        <div className="bg-black/50 backdrop-blur-md border border-[#1E293B] px-4 py-2 rounded-[10px]">
          <h2 className="text-[18px] font-bold text-white font-heading uppercase">
            {camera.name}
          </h2>
          <p className="text-[11px] font-mono text-[#22D3EE] opacity-80 mt-0.5">
            CAM_ID: 00{camera.channel}-A-PRIME | {camera.location} ({camera.zone})
          </p>
        </div>
      </div>

      {/* HUD Top Right: Telemetry Stats */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-4 font-mono text-[11px] text-[#94A3B8] bg-black/50 backdrop-blur-md border border-[#1E293B] px-4 py-2 rounded-[10px] shadow-lg">
        <div className="text-right">
          <p>BITRATE: <span className="text-white">{(camera.telemetry.bitrateKbps / 1000).toFixed(1)} MBPS</span></p>
          <p>CODEC: <span className="text-white">{camera.telemetry.codec}+</span></p>
        </div>
        <div className="w-px h-8 bg-[#1E293B]" />
        <div className="text-right">
          <p>FPS: <span className="text-[#10B981]">{camera.telemetry.fps.toFixed(1)}</span></p>
          <p>RESOL: <span className="text-white">{camera.telemetry.resolution}</span></p>
        </div>
      </div>

      {/* Bottom Center / Left: Quick Action Controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              tvAudio.playSelectSound();
              onExpandFullscreen();
            }}
            className="flex items-center gap-1.5 bg-[#161F36]/90 hover:bg-[#06B6D4] text-white text-[11px] font-bold px-3 py-1.5 rounded-[8px] border border-[#1E293B] hover:border-[#06B6D4] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>[OK] Tela Cheia</span>
          </button>

          <button
            onClick={() => {
              tvAudio.playSelectSound();
              onToggleRecord();
            }}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-[8px] border transition-colors ${
              camera.isRecording
                ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                : 'bg-[#161F36]/90 border-[#1E293B] text-[#94A3B8] hover:text-white'
            }`}
          >
            <CircleDot className={`w-3.5 h-3.5 ${camera.isRecording ? 'animate-ping' : ''}`} />
            <span>{camera.isRecording ? 'REC ATIVO' : 'GRAVAR'}</span>
          </button>

          {camera.hasAudio && (
            <button
              onClick={() => {
                tvAudio.playFocusTick();
                setIsMuted(!isMuted);
              }}
              className="p-1.5 bg-[#161F36]/90 hover:bg-[#1E293B] text-white rounded-[8px] border border-[#1E293B]"
              title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#94A3B8]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#10B981]" />
              )}
            </button>
          )}
        </div>

        {/* PTZ Joystick Simulation when camera has PTZ */}
        {camera.hasPtz && (
          <div className="flex items-center gap-1.5 bg-[#050E1A]/85 border border-[#1E293B] rounded-[8px] px-2.5 py-1">
            <Navigation className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="text-[10px] font-mono text-[#94A3B8]">
              PTZ: <strong className="text-white">D-Pad Manual</strong>
            </span>
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => handlePtzMove(-4, 0)}
                className="w-5 h-5 bg-[#161F36] hover:bg-[#06B6D4] text-white text-[10px] rounded flex items-center justify-center"
              >
                ◄
              </button>
              <button
                onClick={() => handlePtzMove(0, -4)}
                className="w-5 h-5 bg-[#161F36] hover:bg-[#06B6D4] text-white text-[10px] rounded flex items-center justify-center"
              >
                ▲
              </button>
              <button
                onClick={() => handlePtzMove(0, 4)}
                className="w-5 h-5 bg-[#161F36] hover:bg-[#06B6D4] text-white text-[10px] rounded flex items-center justify-center"
              >
                ▼
              </button>
              <button
                onClick={() => handlePtzMove(4, 0)}
                className="w-5 h-5 bg-[#161F36] hover:bg-[#06B6D4] text-white text-[10px] rounded flex items-center justify-center"
              >
                ►
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
