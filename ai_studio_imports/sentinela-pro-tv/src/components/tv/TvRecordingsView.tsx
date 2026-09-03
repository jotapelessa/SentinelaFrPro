import React, { useState } from 'react';
import { MOCK_RECORDINGS } from '../../data/mockData';
import { RecordingClip } from '../../types/tv';
import { Play, Download, Trash2, Filter, Film, Clock, Calendar } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

export const TvRecordingsView: React.FC = () => {
  const [selectedClip, setSelectedClip] = useState<RecordingClip>(MOCK_RECORDINGS[0]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header & Filter Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-white font-heading">
            Gravações NVR & Linha do Tempo CFTV
          </h2>
          <p className="text-[12px] text-[#94A3B8]">
            {MOCK_RECORDINGS.length} arquivos salvos no pool RAID-10 • H.265 Smart
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#22D3EE] bg-[#0E1424] border border-[#1E293B] px-3 py-1.5 rounded-[8px]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtro: Todos os Canais</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] bg-[#0E1424] border border-[#1E293B] px-3 py-1.5 rounded-[8px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Hoje (24h)</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Player on left, Clip List on right */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left: Video Player preview */}
        <div className="col-span-7 bg-[#0E1424] border border-[#1E293B] rounded-[14px] overflow-hidden flex flex-col relative">
          <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
            <img
              src={selectedClip.thumbnailUrl}
              alt={selectedClip.cameraName}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 tv-scanlines" />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => tvAudio.playSelectSound()}
                className="w-16 h-16 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.6)] hover:scale-110 transition-transform"
              >
                <Play className="w-7 h-7 ml-1 fill-current" />
              </button>
            </div>

            {/* Top metadata tag */}
            <div className="absolute top-3 left-3 bg-[#050E1A]/90 backdrop-blur border border-[#1E293B] px-3 py-1.5 rounded-[8px]">
              <span className="text-[12px] font-bold text-white">{selectedClip.cameraName}</span>
              <span className="text-[10px] font-mono text-[#22D3EE] block">{selectedClip.timestamp}</span>
            </div>
          </div>

          {/* Player controls bar */}
          <div className="p-3 bg-[#090D18] border-t border-[#1E293B] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-64 bg-[#1E293B] rounded-full overflow-hidden">
                <div className="h-full bg-[#E50914] w-2/5" />
              </div>
              <span className="text-[10px] font-mono text-[#94A3B8]">01:42 / {selectedClip.duration}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => tvAudio.playSelectSound()}
                className="flex items-center gap-1 text-[11px] font-mono bg-[#161F36] hover:bg-[#1E293B] text-white px-2.5 py-1 rounded-[6px] border border-[#1E293B]"
              >
                <Download className="w-3 h-3 text-[#22D3EE]" />
                Exportar MP4
              </button>
            </div>
          </div>
        </div>

        {/* Right: Clip List (D-Pad Focusable) */}
        <div className="col-span-5 flex flex-col gap-2 overflow-y-auto pr-1">
          {MOCK_RECORDINGS.map((clip, index) => {
            const isSelected = selectedClip.id === clip.id;
            const isFocused = focusedIndex === index;

            return (
              <div
                key={clip.id}
                onClick={() => {
                  tvAudio.playSelectSound();
                  setFocusedIndex(index);
                  setSelectedClip(clip);
                }}
                className={`p-2.5 rounded-[12px] flex items-center gap-3 cursor-pointer transition-all duration-180 border ${
                  isSelected
                    ? 'bg-[#161F36] border-[#06B6D4] shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0E1424] border-[#1E293B] hover:bg-[#161F36]/60'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-28 h-16 rounded-[8px] overflow-hidden bg-black flex-shrink-0">
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.cameraName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-white">
                    {clip.duration}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[12px] font-bold text-white truncate font-heading">
                      {clip.cameraName}
                    </h4>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        clip.triggerType === 'AI_MOTION'
                          ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                          : 'bg-[#10B981]/20 text-[#10B981]'
                      }`}
                    >
                      {clip.triggerType}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-[#94A3B8] mt-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{clip.timestamp}</span>
                  </div>
                  <div className="text-[9px] font-mono text-[#475569] mt-0.5">
                    Tamanho: {clip.sizeMb} MB • H.265
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
