import React, { useState } from 'react';
import { KOTLIN_SCREEN_CODE, KOTLIN_THEME_TOKENS_CODE, KOTLIN_MODELS_CODE } from '../../data/kotlinSourceCode';
import { X, Copy, Check, Download, FileCode, Sparkles } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

interface KotlinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KotlinCodeModal: React.FC<KotlinCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<'SCREEN' | 'THEME' | 'MODELS'>('SCREEN');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getCode = () => {
    switch (selectedFile) {
      case 'THEME':
        return { filename: 'TvThemeTokens.kt', code: KOTLIN_THEME_TOKENS_CODE };
      case 'MODELS':
        return { filename: 'CameraModels.kt', code: KOTLIN_MODELS_CODE };
      case 'SCREEN':
      default:
        return { filename: 'TvNetflixScreen.kt', code: KOTLIN_SCREEN_CODE };
    }
  };

  const current = getCode();

  const handleCopy = () => {
    tvAudio.playSelectSound();
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    tvAudio.playSelectSound();
    const blob = new Blob([current.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = current.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-[#090D18] border border-[#1E293B] rounded-[16px] w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0E1424] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[8px] bg-[#E50914] text-white">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white text-[16px] font-bold font-heading">
                  Código Jetpack Compose Nativo — Android TV
                </h3>
                <span className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">
                  100% COMPILÁVEL
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Design Tokens, Leanback D-Pad Focusable Modifiers, Material 3 e Layout Widescreen 16:9
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              tvAudio.playBackSound();
              onClose();
            }}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#161F36] rounded-[8px] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Tabs & Actions Bar */}
        <div className="px-5 py-2.5 bg-[#070B14] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                tvAudio.playFocusTick();
                setSelectedFile('SCREEN');
              }}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-mono font-bold transition-all ${
                selectedFile === 'SCREEN'
                  ? 'bg-[#161F36] text-[#22D3EE] border border-[#06B6D4]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              TvNetflixScreen.kt
            </button>

            <button
              onClick={() => {
                tvAudio.playFocusTick();
                setSelectedFile('THEME');
              }}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-mono font-bold transition-all ${
                selectedFile === 'THEME'
                  ? 'bg-[#161F36] text-[#22D3EE] border border-[#06B6D4]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              TvThemeTokens.kt
            </button>

            <button
              onClick={() => {
                tvAudio.playFocusTick();
                setSelectedFile('MODELS');
              }}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-mono font-bold transition-all ${
                selectedFile === 'MODELS'
                  ? 'bg-[#161F36] text-[#22D3EE] border border-[#06B6D4]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              CameraModels.kt
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-mono font-bold bg-[#161F36] hover:bg-[#1E293B] text-white border border-[#1E293B] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5 text-[#22D3EE]" />}
              <span>{copied ? 'Copiado!' : 'Copiar Kotlin'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-mono font-bold bg-[#E50914] hover:bg-[#B80710] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>

        {/* Code View Area */}
        <div className="flex-1 bg-[#050E1A] p-4 overflow-auto font-mono text-[12px] text-[#94A3B8] leading-relaxed select-text">
          <pre className="text-[#E2E8F0] whitespace-pre">
            <code>{current.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
