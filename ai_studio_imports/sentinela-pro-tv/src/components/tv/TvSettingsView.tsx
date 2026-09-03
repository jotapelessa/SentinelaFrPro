import React, { useState } from 'react';
import { TvSettingsState } from '../../types/tv';
import { Tv, Volume2, Shield, Radio, Cpu, Layers, Eye, Check } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

interface TvSettingsViewProps {
  settings: TvSettingsState;
  onUpdateSettings: (newSettings: Partial<TvSettingsState>) => void;
}

export const TvSettingsView: React.FC<TvSettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const handleToggleAudio = () => {
    const next = !settings.audioFeedback;
    tvAudio.setEnabled(next);
    if (next) tvAudio.playSelectSound();
    onUpdateSettings({ audioFeedback: next });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-bold text-white font-heading">
          Configurações da Smart TV & NVR
        </h2>
        <p className="text-[12px] text-[#94A3B8]">
          Parâmetros de exibição 10-Foot UI, decodificação H.265 e comportamento D-Pad
        </p>
      </div>

      {/* Settings Options Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
        {/* Setting 1: Resolução de Exibição */}
        <div className="bg-[#0E1424] border border-[#1E293B] rounded-[14px] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#22D3EE]">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white text-[14px] font-bold">Resolução de Exibição</h3>
              <p className="text-[11px] text-[#94A3B8]">Canvas 16:9 Otimizado para Smart TVs</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {(['4K', '1080P', '720P'] as const).map((res) => (
              <button
                key={res}
                onClick={() => {
                  tvAudio.playSelectSound();
                  onUpdateSettings({ resolution: res });
                }}
                className={`flex-1 py-2 rounded-[8px] text-[11px] font-mono font-bold transition-all ${
                  settings.resolution === res
                    ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
                    : 'bg-[#161F36] text-[#94A3B8] hover:text-white'
                }`}
              >
                {res === '4K' ? '4K UHD (2160p)' : res === '1080P' ? '1080p Full HD' : '720p HD'}
              </button>
            ))}
          </div>
        </div>

        {/* Setting 2: Áudio Feedback Leanback */}
        <div className="bg-[#0E1424] border border-[#1E293B] rounded-[14px] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#10B981]">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white text-[14px] font-bold">Feedback Sonoro D-Pad</h3>
              <p className="text-[11px] text-[#94A3B8]">Efeitos sonoros de navegação Leanback</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 bg-[#161F36] p-2.5 rounded-[8px]">
            <span className="text-[11px] font-mono text-[#94A3B8]">
              Status: <strong className="text-white">{settings.audioFeedback ? 'ATIVADO' : 'MUDO'}</strong>
            </span>
            <button
              onClick={handleToggleAudio}
              className={`px-4 py-1.5 rounded-[6px] text-[11px] font-bold font-mono transition-colors ${
                settings.audioFeedback
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#1E293B] text-[#94A3B8]'
              }`}
            >
              {settings.audioFeedback ? 'DESATIVAR' : 'ATIVAR'}
            </button>
          </div>
        </div>

        {/* Setting 3: Decodificador H.265 Hardware */}
        <div className="bg-[#0E1424] border border-[#1E293B] rounded-[14px] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#F59E0B]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white text-[14px] font-bold">Aceleração H.265 (HEVC)</h3>
              <p className="text-[11px] text-[#94A3B8]">Reduz uso de CPU na Smart TV</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 bg-[#161F36] p-2.5 rounded-[8px]">
            <span className="text-[11px] font-mono text-[#94A3B8]">
              GPU MediaCodec: <strong className="text-[#10B981]">ATIVO (24 FPS)</strong>
            </span>
            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onUpdateSettings({ h265HardwareDecoder: !settings.h265HardwareDecoder });
              }}
              className="px-4 py-1.5 rounded-[6px] text-[11px] font-bold font-mono bg-[#06B6D4] text-black"
            >
              {settings.h265HardwareDecoder ? 'HABILITADO' : 'SOFTWARE'}
            </button>
          </div>
        </div>

        {/* Setting 4: Janela PiP Automática */}
        <div className="bg-[#0E1424] border border-[#1E293B] rounded-[14px] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#EF4444]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white text-[14px] font-bold">Auto PiP em Intrusão</h3>
              <p className="text-[11px] text-[#94A3B8]">Abre pop-up flutuante ao detectar pessoas</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 bg-[#161F36] p-2.5 rounded-[8px]">
            <span className="text-[11px] font-mono text-[#94A3B8]">
              Tempo do PiP: <strong className="text-white">{settings.pipTimeoutSeconds}s</strong>
            </span>
            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onUpdateSettings({ autoPipOnIntrusion: !settings.autoPipOnIntrusion });
              }}
              className={`px-4 py-1.5 rounded-[6px] text-[11px] font-bold font-mono ${
                settings.autoPipOnIntrusion ? 'bg-[#EF4444] text-white' : 'bg-[#1E293B] text-[#94A3B8]'
              }`}
            >
              {settings.autoPipOnIntrusion ? 'LIGADO' : 'DESLIGADO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
