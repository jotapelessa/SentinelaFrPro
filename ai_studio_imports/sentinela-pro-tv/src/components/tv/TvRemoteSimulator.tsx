import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Undo, Home, Menu, Bell, FileCode, Monitor, Volume2, VolumeX, Keyboard } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

interface TvRemoteSimulatorProps {
  onDpadUp: () => void;
  onDpadDown: () => void;
  onDpadLeft: () => void;
  onDpadRight: () => void;
  onDpadCenter: () => void;
  onBack: () => void;
  onHome: () => void;
  onMenu: () => void;
  onTriggerPipAlert: () => void;
  onOpenKotlinCode: () => void;
  isTvAspectLocked: boolean;
  onToggleTvAspect: () => void;
}

export const TvRemoteSimulator: React.FC<TvRemoteSimulatorProps> = ({
  onDpadUp,
  onDpadDown,
  onDpadLeft,
  onDpadRight,
  onDpadCenter,
  onBack,
  onHome,
  onMenu,
  onTriggerPipAlert,
  onOpenKotlinCode,
  isTvAspectLocked,
  onToggleTvAspect,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showKeyHints, setShowKeyHints] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Mini toggle pill if collapsed */}
      {!isOpen && (
        <button
          onClick={() => {
            tvAudio.playSelectSound();
            setIsOpen(true);
          }}
          className="bg-[#0E1424] hover:bg-[#161F36] border border-[#06B6D4] text-white px-3 py-1.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
        >
          <span>🎮 Controle Remoto TV (D-Pad)</span>
        </button>
      )}

      {isOpen && (
        <div
          id="tv-remote-controller"
          className="w-[240px] bg-[#090D18]/95 backdrop-blur-xl border border-[#1E293B] rounded-[24px] p-3.5 flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all"
        >
          {/* Header of Remote */}
          <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#1E293B] text-[10px] font-mono">
            <span className="text-[#E50914] font-black tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
              REMOTE 10-FOOT
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeyHints(!showKeyHints)}
                className={`p-1 rounded ${showKeyHints ? 'text-[#22D3EE] bg-[#161F36]' : 'text-[#94A3B8] hover:text-white'}`}
                title="Atalhos do Teclado"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#94A3B8] hover:text-white text-[11px] px-1"
                title="Minimizar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Keyboard Helper Card if active */}
          {showKeyHints && (
            <div className="w-full bg-[#0E1424] border border-[#06B6D4]/40 rounded-[10px] p-2 mb-3 text-[10px] font-mono text-[#94A3B8]">
              <div className="text-white font-bold mb-1 text-[10px]">Teclado Físico Suportado:</div>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                <div>• <kbd className="text-[#22D3EE] bg-[#161F36] px-1 rounded">▲▼◄►</kbd> D-Pad</div>
                <div>• <kbd className="text-[#22D3EE] bg-[#161F36] px-1 rounded">Enter</kbd> OK / Foco</div>
                <div>• <kbd className="text-[#22D3EE] bg-[#161F36] px-1 rounded">Esc/Back</kbd> Voltar</div>
                <div>• <kbd className="text-[#22D3EE] bg-[#161F36] px-1 rounded">K</kbd> Ver Kotlin</div>
                <div>• <kbd className="text-[#22D3EE] bg-[#161F36] px-1 rounded">P</kbd> Disparar PiP</div>
                <div>• <kbd className="text-[#22D3EE] bg-[#161F36] px-1 rounded">F</kbd> Modo 16:9 TV</div>
              </div>
            </div>
          )}

          {/* Top Quick Actions */}
          <div className="w-full grid grid-cols-3 gap-1.5 mb-3">
            <button
              onClick={() => {
                tvAudio.playAlertSound();
                onTriggerPipAlert();
              }}
              className="py-1.5 bg-[#EF4444]/20 hover:bg-[#EF4444] text-[#EF4444] hover:text-white rounded-[8px] text-[9px] font-bold font-mono border border-[#EF4444]/40 flex flex-col items-center gap-0.5 transition-colors"
              title="Disparar Alerta PiP na TV"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Simular PiP</span>
            </button>

            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onToggleTvAspect();
              }}
              className={`py-1.5 rounded-[8px] text-[9px] font-bold font-mono border flex flex-col items-center gap-0.5 transition-colors ${
                isTvAspectLocked
                  ? 'bg-[#06B6D4] text-black border-[#06B6D4]'
                  : 'bg-[#161F36] hover:bg-[#1E293B] text-[#94A3B8] border-[#1E293B]'
              }`}
              title="Fixar Proporção 16:9 Smart TV Widescreen"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{isTvAspectLocked ? '16:9 4K' : 'Livre'}</span>
            </button>

            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onOpenKotlinCode();
              }}
              className="py-1.5 bg-[#E50914] hover:bg-[#B80710] text-white rounded-[8px] text-[9px] font-bold font-mono shadow-[0_0_10px_rgba(229,9,20,0.4)] flex flex-col items-center gap-0.5 transition-colors"
              title="Ver e Exportar Código Kotlin Jetpack Compose"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Kotlin .kt</span>
            </button>
          </div>

          {/* Circular D-Pad Nav Pad */}
          <div className="relative w-36 h-36 rounded-full bg-[#0E1424] border-2 border-[#1E293B] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] flex items-center justify-center my-1">
            {/* Up Button */}
            <button
              onClick={() => {
                tvAudio.playFocusTick();
                onDpadUp();
              }}
              className="absolute top-1.5 w-10 h-9 rounded-t-full bg-[#161F36] hover:bg-[#06B6D4] text-white flex items-center justify-center transition-colors active:scale-95"
              aria-label="D-Pad Cima"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {/* Down Button */}
            <button
              onClick={() => {
                tvAudio.playFocusTick();
                onDpadDown();
              }}
              className="absolute bottom-1.5 w-10 h-9 rounded-b-full bg-[#161F36] hover:bg-[#06B6D4] text-white flex items-center justify-center transition-colors active:scale-95"
              aria-label="D-Pad Baixo"
            >
              <ArrowDown className="w-4 h-4" />
            </button>

            {/* Left Button */}
            <button
              onClick={() => {
                tvAudio.playFocusTick();
                onDpadLeft();
              }}
              className="absolute left-1.5 w-9 h-10 rounded-l-full bg-[#161F36] hover:bg-[#06B6D4] text-white flex items-center justify-center transition-colors active:scale-95"
              aria-label="D-Pad Esquerda"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Right Button */}
            <button
              onClick={() => {
                tvAudio.playFocusTick();
                onDpadRight();
              }}
              className="absolute right-1.5 w-9 h-10 rounded-r-full bg-[#161F36] hover:bg-[#06B6D4] text-white flex items-center justify-center transition-colors active:scale-95"
              aria-label="D-Pad Direita"
            >
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Center / OK Button */}
            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onDpadCenter();
              }}
              className="w-14 h-14 rounded-full bg-[#E50914] hover:bg-[#B80710] text-white text-[11px] font-black flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.5)] active:scale-90 transition-transform"
              aria-label="D-Pad Center OK"
            >
              OK
            </button>
          </div>

          {/* Bottom Remote Control Keys (Back, Home, Menu) */}
          <div className="w-full flex items-center justify-between px-2 mt-3 pt-2 border-t border-[#1E293B]">
            <button
              onClick={() => {
                tvAudio.playBackSound();
                onBack();
              }}
              className="p-2 rounded-full bg-[#161F36] hover:bg-[#1E293B] text-white text-[10px] flex items-center justify-center transition-colors"
              title="Voltar (Escape / Backspace)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onHome();
              }}
              className="p-2 rounded-full bg-[#161F36] hover:bg-[#1E293B] text-white text-[10px] flex items-center justify-center transition-colors"
              title="Home (Aba Câmeras)"
            >
              <Home className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                tvAudio.playSelectSound();
                onMenu();
              }}
              className="p-2 rounded-full bg-[#161F36] hover:bg-[#1E293B] text-white text-[10px] flex items-center justify-center transition-colors"
              title="Menu Sidebar"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
