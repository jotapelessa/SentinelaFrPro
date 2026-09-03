import React, { useEffect, useState } from 'react';
import { PipAlert } from '../../types/tv';
import { ShieldAlert, X, Maximize, Clock } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

interface TvPipFloatingWindowProps {
  alert: PipAlert;
  isFocused: boolean;
  onDismiss: () => void;
  onExpand: () => void;
}

export const TvPipFloatingWindow: React.FC<TvPipFloatingWindowProps> = ({
  alert,
  isFocused,
  onDismiss,
  onExpand,
}) => {
  const [countdown, setCountdown] = useState(alert.countdownSeconds);

  useEffect(() => {
    setCountdown(alert.countdownSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Play alert sound when PiP appears
    tvAudio.playAlertSound();

    return () => clearInterval(interval);
  }, [alert.id, onDismiss]);

  return (
    <div
      id="tv-pip-window"
      className={`fixed bottom-6 right-6 z-50 w-[280px] aspect-video rounded-lg overflow-hidden bg-[#050E1A]/90 backdrop-blur-xl border-2 transition-all duration-200 shadow-2xl ${
        isFocused
          ? 'border-white ring-2 ring-[#06B6D4] scale-[1.03]'
          : 'border-[#06B6D4]'
      }`}
    >
      {/* Snapshot Preview Background */}
      <div className="absolute inset-0 bg-black">
        <img
          src={alert.snapshotUrl}
          alt={alert.cameraName}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-black/30 to-transparent" />
      </div>

      {/* Top Header Label */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] bg-[#06B6D4] text-black font-bold px-1 py-0.5 rounded font-mono">
            ALERTA
          </span>
          <span className="text-[9px] text-white font-mono truncate max-w-[140px] uppercase">
            {alert.cameraName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-[#EF4444] animate-pulse" />
        </div>
      </div>

      {/* Center Event Text */}
      <div className="absolute bottom-6 left-2 right-2 z-10">
        <p className="text-white text-[10px] font-medium leading-tight line-clamp-1 drop-shadow">
          {alert.eventDescription}
        </p>
      </div>

      {/* Countdown Timer in Bottom Right */}
      <div className="absolute bottom-1.5 right-2 z-10 text-[18px] font-mono font-bold text-[#06B6D4] leading-none">
        00:{countdown < 10 ? `0${countdown}` : countdown}s
      </div>

      {/* Action Click Controls */}
      <div className="absolute bottom-1.5 left-2 z-10 flex items-center gap-2">
        <button
          onClick={() => {
            tvAudio.playSelectSound();
            onExpand();
          }}
          className="text-[9px] font-mono font-bold text-[#22D3EE] hover:text-white flex items-center gap-1"
        >
          <Maximize className="w-2.5 h-2.5" />
          <span>[OK] Feed</span>
        </button>

        <button
          onClick={() => {
            tvAudio.playBackSound();
            onDismiss();
          }}
          className="text-[9px] font-mono text-[#94A3B8] hover:text-white flex items-center gap-0.5"
        >
          <X className="w-2.5 h-2.5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};
