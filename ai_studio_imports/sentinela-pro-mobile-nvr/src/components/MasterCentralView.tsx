import React, { useState } from 'react';
import { TvDevice } from '../types';
import { 
  Star, 
  Tv, 
  Zap, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Sparkles,
  Cast,
  Layers,
  Activity
} from 'lucide-react';

interface MasterCentralViewProps {
  tvDevices: TvDevice[];
  onTestAllTvs: () => void;
  onSimulateAiDetection: () => void;
  onRefreshNetwork: () => void;
  onTestTvPip: (tv: TvDevice) => void;
}

export const MasterCentralView: React.FC<MasterCentralViewProps> = ({
  tvDevices,
  onTestAllTvs,
  onSimulateAiDetection,
  onRefreshNetwork,
  onTestTvPip
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activePipTv, setActivePipTv] = useState<string | null>(null);

  const onlineCount = tvDevices.filter((t) => t.isOnline).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshNetwork();
    setTimeout(() => setIsRefreshing(false), 900);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-h-full">
      {/* 1. VIP BANNER DOURADO (Gradiente Exato #78350F -> #451A03) */}
      <div className="rounded-2xl border border-[#F59E0B] shadow-xl overflow-hidden bg-gradient-to-r from-[#78350F] to-[#451A03]">
        <div className="p-4 flex flex-col gap-3.5">
          {/* Header VIP */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] flex items-center justify-center shadow-inner">
                <Star className="w-5 h-5 text-[#FDE68A] fill-[#F59E0B]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-black text-[#FDE68A] tracking-wider uppercase">
                    ⭐ CENTRAL MASTER CFTV
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-black text-[9px] font-mono font-black">
                    VIP
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#FDE68A]/80 mt-0.5">
                  Broadcast & Gestão de PiP em Todas as Smart TVs
                </p>
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-[#F59E0B]/30 w-full" />

          {/* CONTROLES DE TESTE EM LOTE */}
          <div className="flex flex-col gap-2.5">
            {/* [🚨 Testar Todas as TVs] */}
            <button
              onClick={onTestAllTvs}
              className="w-full h-12 rounded-xl bg-[#E11D48] hover:bg-[#E11D48]/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#E11D48]/30 cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>🚨 TESTAR TODAS AS TVs (BROADCAST PiP)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {/* [⚡ Simular Detecção IA] */}
              <button
                onClick={onSimulateAiDetection}
                className="h-11 rounded-xl border border-[#F59E0B] bg-[#F59E0B]/10 hover:bg-[#F59E0B]/25 text-[#FDE68A] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="truncate">⚡ SIMULAR IA</span>
              </button>

              {/* [🔄 Atualizar Status de Rede] */}
              <button
                onClick={handleRefresh}
                className="h-11 rounded-xl border border-[#1F2937] bg-[#1F2937] hover:bg-[#1F2937]/80 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-[#22D3EE] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="truncate">🔄 ATUALIZAR REDE</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATUS GERAL DOS DISPOSITIVOS NA REDE */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
            Smart TVs na Rede Doméstica
          </span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981] text-[10px] font-mono font-bold text-[#10B981]">
          {onlineCount}/{tvDevices.length} ONLINE
        </div>
      </div>

      {/* 3. GRADE DE DISPOSITIVOS CONECTADOS */}
      <div className="flex flex-col gap-2.5">
        {tvDevices.map((tv) => (
          <TvMasterCardItem 
            key={tv.id} 
            tv={tv} 
            onTestPip={() => {
              setActivePipTv(tv.id);
              onTestTvPip(tv);
              setTimeout(() => setActivePipTv(null), 3000);
            }} 
            isTriggering={activePipTv === tv.id}
          />
        ))}
      </div>

      {/* 4. Mini Informativo Master */}
      <div className="rounded-xl bg-[#111827] border border-[#1F2937] p-3.5 flex items-start gap-3">
        <Activity className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
        <div className="text-[11px] font-mono text-[#94A3B8] leading-relaxed">
          <strong className="text-white font-sans">Protocolo Sentinela Overlay:</strong> Quando um alerta crítico é detectado, as TVs recebem o stream H.265 em PiP transparente via RTSP/WebRTC instantaneamente em 80ms.
        </div>
      </div>
    </div>
  );
};

interface TvMasterCardItemProps {
  tv: TvDevice;
  onTestPip: () => void;
  isTriggering: boolean;
}

const TvMasterCardItem: React.FC<TvMasterCardItemProps> = ({
  tv,
  onTestPip,
  isTriggering
}) => {
  return (
    <div 
      className={`rounded-2xl bg-[#111827] p-3.5 border transition-all duration-300 ${
        tv.isPipActive || isTriggering 
          ? 'border-[#F59E0B] shadow-lg shadow-[#F59E0B]/20 bg-[#1F2937]' 
          : 'border-[#1F2937]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Ícone e Nome */}
        <div className="flex items-center gap-3">
          <div 
            className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
              tv.isOnline 
                ? 'bg-[#1F2937] border-[#06B6D4]/40 text-[#22D3EE]' 
                : 'bg-[#18181B] border-transparent text-[#64748B]'
            }`}
          >
            <Tv className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[13px] font-bold text-white leading-snug">{tv.name}</h4>
              {(tv.isPipActive || isTriggering) && (
                <span className="px-1.5 py-0.5 rounded-sm bg-[#F59E0B] text-black text-[8px] font-mono font-black animate-pulse">
                  PiP ATIVO
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
              {tv.room} • {tv.ipAddress}
            </p>
          </div>
        </div>

        {/* Status e Botão Testar PiP */}
        <div className="flex items-center gap-2">
          {/* Badge Online/Offline */}
          <span 
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
              tv.isOnline 
                ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]' 
                : 'bg-[#E11D48]/15 border-[#E11D48] text-[#E11D48]'
            }`}
          >
            {tv.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>

          {/* Botão Individual de Teste */}
          <button
            onClick={onTestPip}
            disabled={!tv.isOnline}
            className={`h-9 px-3 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer border ${
              !tv.isOnline 
                ? 'bg-[#1F2937]/50 text-[#64748B] border-transparent cursor-not-allowed' 
                : tv.isPipActive || isTriggering
                ? 'bg-[#F59E0B] text-black border-[#F59E0B]'
                : 'bg-[#1F2937] text-[#22D3EE] border-[#1F2937] hover:border-[#22D3EE] hover:bg-[#22D3EE]/10'
            }`}
          >
            <Cast className="w-3 h-3" />
            <span>{isTriggering ? 'DISPARANDO...' : 'TESTAR PiP'}</span>
          </button>
        </div>
      </div>

      {/* Simulação Visual de PiP Ativo na TV */}
      {(tv.isPipActive || isTriggering) && (
        <div className="mt-3 p-2.5 rounded-xl bg-black/60 border border-[#F59E0B]/50 flex items-center justify-between text-[10px] font-mono text-[#FDE68A]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#E11D48] animate-ping" />
            <span>Transmissão PiP: Portão Principal (4K H.265)</span>
          </div>
          <span className="text-[#10B981] font-bold">18ms Latência</span>
        </div>
      )}
    </div>
  );
};
