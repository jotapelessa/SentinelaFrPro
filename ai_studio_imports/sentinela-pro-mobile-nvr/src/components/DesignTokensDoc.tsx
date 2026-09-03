import React from 'react';
import { 
  Palette, 
  Ruler, 
  Square, 
  Type, 
  ShieldCheck, 
  Sparkles,
  Smartphone,
  Fingerprint
} from 'lucide-react';

export const DesignTokensDoc: React.FC = () => {
  const colorTokens = [
    { name: 'Background', hex: '#090D16', desc: 'Fundo escuro profundo do feed vertical', bg: '#090D16' },
    { name: 'BottomBarBackground', hex: '#0F0F13', desc: 'Barra inferior de navegação', bg: '#0F0F13' },
    { name: 'CardBackground', hex: '#111827', desc: 'Cartões de câmeras e streaming', bg: '#111827' },
    { name: 'CardBackgroundElevated', hex: '#1F2937', desc: 'Superfície elevada', bg: '#1F2937' },
    { name: 'BorderStandard', hex: '#1F2937', desc: 'Borda sutil padrão', bg: '#1F2937' },
    { name: 'BorderCyan', hex: '#06B6D4', desc: 'Borda de câmera ativa', bg: '#06B6D4' },
    { name: 'PrimaryCyan', hex: '#22D3EE', desc: 'Cor primária dos ícones e títulos', bg: '#22D3EE' },
    { name: 'SuccessGreen', hex: '#10B981', desc: 'Status conectado e taxa de quadros (24 FPS)', bg: '#10B981' },
    { name: 'DestructiveRed', hex: '#E11D48', desc: 'Botões de reset/limpeza e alertas IA', bg: '#E11D48' },
    { name: 'MasterGold', hex: '#F59E0B', desc: 'Dourado vibrante do selo Master VIP', bg: '#F59E0B' },
    { name: 'MasterGoldLight', hex: '#FDE68A', desc: 'Texto e destaques do Master', bg: '#FDE68A' },
    { name: 'TextPrimary', hex: '#FFFFFF', desc: 'Texto de alto contraste', bg: '#FFFFFF' },
    { name: 'TextSecondary', hex: '#94A3B8', desc: 'Legendas e metadados', bg: '#94A3B8' },
    { name: 'TextMuted', hex: '#64748B', desc: 'Desabilitados e placeholders', bg: '#64748B' },
  ];

  return (
    <div className="flex flex-col gap-6 p-5 overflow-y-auto max-h-full bg-[#0F0F13] rounded-2xl border border-[#1F2937] text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h2 className="text-lg font-black tracking-wider flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#22D3EE]" />
            <span>DESIGN TOKENS — MOBILE OBSIDIAN & MASTER GOLD</span>
          </h2>
          <p className="text-xs font-mono text-[#94A3B8] mt-1">
            Referência oficial de Tokens Jetpack Compose para Sentinela Pro Smartphone NVR
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B] text-[#FDE68A] text-xs font-mono font-bold">
          v2.4.0 Spec
        </div>
      </div>

      {/* 1. Paleta de Cores */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
          <span>1. Paleta de Cores (Cores HEX Exatas)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {colorTokens.map((t) => (
            <div 
              key={t.name}
              className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center gap-3"
            >
              <div 
                className="w-10 h-10 rounded-lg border border-white/20 shrink-0 shadow-inner"
                style={{ backgroundColor: t.bg }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{t.name}</span>
                  <span className="text-[10px] font-mono font-bold text-[#22D3EE]">{t.hex}</span>
                </div>
                <p className="text-[10px] font-mono text-[#94A3B8] truncate mt-0.5">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Gradiente Master */}
        <div className="p-3.5 rounded-xl border border-[#F59E0B] bg-gradient-to-r from-[#78350F] to-[#451A03] flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-[#FDE68A] tracking-wider uppercase">MasterGradient</h4>
            <p className="text-[10px] font-mono text-[#FDE68A]/80">
              Brush.horizontalGradient(listOf(Color(0xFF78350F), Color(0xFF451A03)))
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#F59E0B] text-black font-mono font-bold text-[9px]">
            VIP GOLD
          </span>
        </div>
      </div>

      {/* 2. Dimensões & Ergonomia */}
      <div className="flex flex-col gap-3 border-t border-[#1F2937] pt-4">
        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
          <Fingerprint className="w-4 h-4 text-[#22D3EE]" />
          <span>2. Espaçamentos & Dimensões (One-Hand Ergonomics)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">xs / sm / md</span>
            <p className="text-white font-bold mt-0.5">4dp / 8dp / 12dp</p>
          </div>

          <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">screenPadding / feedGap</span>
            <p className="text-white font-bold mt-0.5">16.dp / 16.dp</p>
          </div>

          <div className="p-3 rounded-xl bg-[#111827] border border-[#06B6D4]">
            <span className="text-[#22D3EE] text-[10px]">MinTouchTarget</span>
            <p className="text-white font-bold mt-0.5">48.dp (Polegar)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">BottomBarHeight</span>
            <p className="text-white font-bold mt-0.5">64.dp</p>
          </div>
        </div>
      </div>

      {/* 3. Formas & Gestos */}
      <div className="flex flex-col gap-3 border-t border-[#1F2937] pt-4">
        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
          <Square className="w-4 h-4 text-[#22D3EE]" />
          <span>3. Formas (Shapes) & Gestos Multitoque</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">Button / SmallButton</span>
            <p className="text-white font-bold mt-0.5">12.dp / 8.dp (Rounded)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">CameraCard / MasterCard</span>
            <p className="text-white font-bold mt-0.5">16.dp (Rounded)</p>
          </div>

          <div className="p-3 rounded-xl bg-[#111827] border border-[#10B981]">
            <span className="text-[#10B981] text-[10px]">Pinch-to-Zoom</span>
            <p className="text-white font-bold mt-0.5">Min 1.0f ➔ Max 5.0f</p>
          </div>
        </div>
      </div>

      {/* 4. Tipografia */}
      <div className="flex flex-col gap-3 border-t border-[#1F2937] pt-4">
        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-4 h-4 text-[#22D3EE]" />
          <span>4. Tipografia & Escalas</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">Header do App</span>
            <p className="text-white font-sans text-sm font-black mt-0.5">18.sp, FontWeight.Black</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">Título do Card</span>
            <p className="text-white font-sans text-xs font-bold mt-0.5">13.sp, FontWeight.Bold</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">Botões de Ação</span>
            <p className="text-white font-sans text-xs font-bold mt-0.5">12.sp, FontWeight.Bold</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#111827] border border-[#1F2937]">
            <span className="text-[#94A3B8] text-[10px]">Subtextos & IPs</span>
            <p className="text-white font-mono text-[11px] mt-0.5">11.sp, FontFamily.Monospace</p>
          </div>
        </div>
      </div>
    </div>
  );
};
