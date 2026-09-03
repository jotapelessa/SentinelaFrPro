import React, { useState } from 'react';
import { DESIGN_TOKENS_KOTLIN, SCREEN_KOTLIN, VIEWMODEL_KOTLIN } from '../kotlinCode';
import { 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Layers, 
  Terminal, 
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';

export const KotlinCodeViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'screen' | 'tokens' | 'viewmodel'>('screen');
  const [copied, setCopied] = useState(false);

  const getCode = () => {
    switch (activeFile) {
      case 'screen':
        return SCREEN_KOTLIN;
      case 'tokens':
        return DESIGN_TOKENS_KOTLIN;
      case 'viewmodel':
        return VIEWMODEL_KOTLIN;
    }
  };

  const getFileName = () => {
    switch (activeFile) {
      case 'screen':
        return 'SmartphoneYouTubeScreen.kt';
      case 'tokens':
        return 'SentinelaDesignTokens.kt';
      case 'viewmodel':
        return 'SentinelaViewModel.kt';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([getCode()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName();
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F13] rounded-2xl border border-[#1F2937] overflow-hidden shadow-2xl">
      {/* Code Header & Tab Bar */}
      <div className="bg-[#111827] px-4 py-3 border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-3">
        {/* File Tabs */}
        <div className="flex items-center gap-1.5 bg-[#090D16] p-1 rounded-xl border border-[#1F2937]">
          <button
            onClick={() => setActiveFile('screen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              activeFile === 'screen'
                ? 'bg-[#22D3EE] text-black shadow'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>SmartphoneYouTubeScreen.kt</span>
          </button>

          <button
            onClick={() => setActiveFile('tokens')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              activeFile === 'tokens'
                ? 'bg-[#F59E0B] text-black shadow'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SentinelaDesignTokens.kt</span>
          </button>

          <button
            onClick={() => setActiveFile('viewmodel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              activeFile === 'viewmodel'
                ? 'bg-[#10B981] text-black shadow'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>SentinelaViewModel.kt</span>
          </button>
        </div>

        {/* Actions (Copy & Download) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="h-9 px-3.5 rounded-xl bg-[#1F2937] hover:bg-[#22D3EE]/20 hover:border-[#22D3EE] text-white font-mono text-xs flex items-center gap-1.5 transition-all border border-transparent active:scale-95 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[#10B981] font-bold">COPIADO!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>COPIAR CÓDIGO</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="h-9 px-3.5 rounded-xl bg-[#22D3EE] hover:bg-[#22D3EE]/90 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>BAIXAR .KT</span>
          </button>
        </div>
      </div>

      {/* Code Body with line numbers and syntax styling */}
      <div className="flex-1 overflow-auto p-4 bg-[#090D16] font-mono text-[12px] leading-relaxed select-text">
        <pre className="text-[#94A3B8] font-mono whitespace-pre font-normal">
          <code>{getCode()}</code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="bg-[#111827] px-4 py-2 border-t border-[#1F2937] flex items-center justify-between text-[11px] font-mono text-[#64748B]">
        <span>Jetpack Compose • 100% Compilável no Android Studio Iguana / Jellyfish / Koala</span>
        <span className="text-[#10B981] font-bold">Pronto para Produção</span>
      </div>
    </div>
  );
};
