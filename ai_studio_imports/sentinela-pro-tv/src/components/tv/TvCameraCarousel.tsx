import React, { useRef, useEffect } from 'react';
import { CameraEntity } from '../../types/tv';
import { ShieldAlert, CircleDot, Wifi, Radio } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

interface TvCameraCarouselProps {
  cameras: CameraEntity[];
  focusedIndex: number;
  focusedZone: string;
  onFocusCamera: (index: number) => void;
  onSelectCamera: (camera: CameraEntity) => void;
}

export const TvCameraCarousel: React.FC<TvCameraCarouselProps> = ({
  cameras,
  focusedIndex,
  focusedZone,
  onFocusCamera,
  onSelectCamera,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when focused index changes
  useEffect(() => {
    if (containerRef.current) {
      const activeCard = containerRef.current.children[focusedIndex] as HTMLElement;
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="flex flex-col gap-3">
      {/* Section Header with count and navigation hint */}
      <div className="flex items-center justify-between px-2">
        <span className="text-[13px] font-bold uppercase tracking-widest text-[#94A3B8] font-heading">
          Multiview Express
        </span>
        <span className="text-[11px] text-[#475569] font-mono">
          {cameras.length} Câmeras Disponíveis
        </span>
      </div>

      {/* Horizontal Carousel (Leanback TvLazyRow) */}
      <div
        ref={containerRef}
        id="tv-camera-carousel"
        className="flex items-center gap-4 overflow-x-auto py-3 px-1 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {cameras.map((camera, index) => {
          const isFocused = focusedZone === 'CAROUSEL' && focusedIndex === index;
          const isSelected = focusedIndex === index;

          return (
            <div
              key={camera.id}
              id={`tv-camera-card-${camera.id}`}
              onClick={() => {
                tvAudio.playSelectSound();
                onFocusCamera(index);
                onSelectCamera(camera);
              }}
              className={`w-[220px] shrink-0 rounded-[14px] overflow-hidden cursor-pointer select-none transition-all duration-200 relative ${
                isFocused
                  ? 'border-2 border-white scale-[1.04] bg-[#161F36] shadow-2xl z-20'
                  : isSelected
                  ? 'border-2 border-[#06B6D4] bg-[#161F36]'
                  : 'bg-[#0E1424] border border-[#1E293B] opacity-70 hover:opacity-100'
              }`}
            >
              {/* Snapshot thumbnail */}
              <div className="aspect-video bg-[#0E1424] overflow-hidden relative">
                <img
                  src={camera.thumbnailUrl}
                  alt={camera.name}
                  className={`w-full h-full object-cover ${
                    isFocused || isSelected ? 'opacity-80' : 'grayscale opacity-50'
                  }`}
                />
                {camera.isRecording && (
                  <div className="absolute top-2 right-2 bg-[#EF4444] text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <CircleDot className="w-2 h-2 animate-ping" />
                    REC
                  </div>
                )}
              </div>

              {/* Card Footer Info */}
              <div className="p-3">
                <div className={`text-[11px] font-bold truncate ${isFocused || isSelected ? 'text-white' : 'text-[#94A3B8]'}`}>
                  {camera.name}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-[#22D3EE] font-mono">
                    0{camera.channel}-{camera.status === 'ONLINE' ? 'ACTIVE' : camera.status === 'STANDBY' ? 'STDBY' : camera.status}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      camera.status === 'ALERT'
                        ? 'text-[#EF4444]'
                        : camera.status === 'STANDBY'
                        ? 'text-[#F59E0B]'
                        : 'text-[#10B981]'
                    }`}
                  >
                    {camera.telemetry.fps} FPS
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
