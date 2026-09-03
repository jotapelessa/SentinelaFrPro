import React from 'react';
import { CameraFeed, TvDevice, CaptureItem, BottomNavTab } from '../types';
import { LiveFeedView } from './LiveFeedView';
import { MasterCentralView } from './MasterCentralView';
import { CapturesView } from './CapturesView';
import { SettingsView } from './SettingsView';
import { 
  Shield, 
  Video, 
  Images, 
  Settings, 
  Star, 
  Wifi, 
  Radio, 
  Battery, 
  Signal 
} from 'lucide-react';

interface PhoneSimulatorProps {
  currentTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  isMasterAdmin: boolean;
  cameras: CameraFeed[];
  tvDevices: TvDevice[];
  captures: CaptureItem[];
  onTakeSnapshot: (camera: CameraFeed) => void;
  onRecordClip: (camera: CameraFeed) => void;
  onTestAllTvs: () => void;
  onSimulateAiDetection: () => void;
  onRefreshNetwork: () => void;
  onTestTvPip: (tv: TvDevice) => void;
  onToggleMasterAdmin: (enabled: boolean) => void;
  onDeleteCapture: (id: string) => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  currentTab,
  onTabChange,
  isMasterAdmin,
  cameras,
  tvDevices,
  captures,
  onTakeSnapshot,
  onRecordClip,
  onTestAllTvs,
  onSimulateAiDetection,
  onRefreshNetwork,
  onTestTvPip,
  onToggleMasterAdmin,
  onDeleteCapture
}) => {
  return (
    <div className="relative mx-auto w-[380px] sm:w-[412px] h-[830px] rounded-[44px] bg-[#090D16] p-3 shadow-2xl border-[4px] border-[#1F2937] flex flex-col justify-between select-none">
      {/* Moldura Externa Smartphone Moto G54 5G com Punch-Hole */}
      <div className="relative w-full h-full rounded-[36px] bg-[#090D16] overflow-hidden flex flex-col border border-[#1F2937]/80">
        {/* Android Status Bar */}
        <div className="h-7 w-full bg-[#090D16] px-5 flex items-center justify-between text-[11px] font-mono font-semibold text-[#94A3B8] z-30 shrink-0 select-none">
          <span>11:30</span>
          
          {/* Câmera Frontal Punch-Hole Centralizada */}
          <div className="w-4 h-4 rounded-full bg-black border border-[#1F2937] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]/30" />
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-[9px] px-1 bg-[#1F2937] rounded font-bold text-[#22D3EE]">120Hz</span>
            <Wifi className="w-3.5 h-3.5 text-white" />
            <Signal className="w-3.5 h-3.5 text-white" />
            <Battery className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
        </div>

        {/* 1. TOP BAR COMPACTA DO APP SENTINELA PRO */}
        <div className="w-full bg-[#090D16] px-4 py-2 flex items-center justify-between border-b border-[#1F2937] shrink-0 z-20">
          {/* Logo e Título */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1F2937] border border-[#06B6D4] flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-[#22D3EE]" />
            </div>

            <div>
              <div className="flex items-center gap-1 leading-none">
                <span className="text-sm font-black text-white tracking-wider font-sans">
                  SENTINELA
                </span>
                <span className={`text-sm font-black tracking-wider ${
                  isMasterAdmin ? 'text-[#F59E0B]' : 'text-[#22D3EE]'
                }`}>
                  PRO
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#64748B] block mt-0.5">
                v2.4.0 • NVR MOBILE
              </span>
            </div>
          </div>

          {/* Badges Frigate & Master Status */}
          <div className="flex items-center gap-1.5">
            {/* Frigate Status */}
            <div className="px-2 py-0.5 rounded-full bg-[#1F2937] border border-[#1F2937] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-[#10B981]">FRIGATE OK</span>
            </div>

            {/* Master Badge */}
            {isMasterAdmin && (
              <div className="px-2 py-0.5 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] flex items-center gap-1 shadow-sm">
                <Star className="w-2.5 h-2.5 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-[9px] font-mono font-black text-[#F59E0B]">MASTER</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. ÁREA DE CONTEÚDO PRINCIPAL COM SCROLL */}
        <div className="flex-1 overflow-hidden relative bg-[#090D16]">
          {currentTab === 'live' && (
            <LiveFeedView
              cameras={cameras}
              onTakeSnapshot={onTakeSnapshot}
              onRecordClip={onRecordClip}
            />
          )}

          {currentTab === 'master' && isMasterAdmin && (
            <MasterCentralView
              tvDevices={tvDevices}
              onTestAllTvs={onTestAllTvs}
              onSimulateAiDetection={onSimulateAiDetection}
              onRefreshNetwork={onRefreshNetwork}
              onTestTvPip={onTestTvPip}
            />
          )}

          {currentTab === 'captures' && (
            <CapturesView
              captures={captures}
              onDeleteCapture={onDeleteCapture}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              isMasterAdmin={isMasterAdmin}
              onToggleMasterAdmin={onToggleMasterAdmin}
            />
          )}
        </div>

        {/* 3. BOTTOM NAVIGATION BAR ESTILIZADA (BottomBarHeight 64dp, Ergonomia One-Hand) */}
        <div className="h-16 w-full bg-[#0F0F13] border-t border-[#1F2937] px-2 flex items-center justify-around shrink-0 z-30 shadow-2xl">
          {/* Aba [📹 Ao Vivo] */}
          <button
            onClick={() => onTabChange('live')}
            className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer group transition-all"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              currentTab === 'live' ? 'bg-[#22D3EE]/15 text-[#22D3EE]' : 'text-[#64748B] group-hover:text-white'
            }`}>
              <Video className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-bold font-sans tracking-tight ${
              currentTab === 'live' ? 'text-[#22D3EE]' : 'text-[#64748B]'
            }`}>
              Ao Vivo
            </span>
          </button>

          {/* Aba [🎬 Capturas] */}
          <button
            onClick={() => onTabChange('captures')}
            className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer group transition-all"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              currentTab === 'captures' ? 'bg-[#22D3EE]/15 text-[#22D3EE]' : 'text-[#64748B] group-hover:text-white'
            }`}>
              <Images className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-bold font-sans tracking-tight ${
              currentTab === 'captures' ? 'text-[#22D3EE]' : 'text-[#64748B]'
            }`}>
              Capturas
            </span>
          </button>

          {/* Aba [⚙️ Ajustes] */}
          <button
            onClick={() => onTabChange('settings')}
            className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer group transition-all"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              currentTab === 'settings' ? 'bg-[#22D3EE]/15 text-[#22D3EE]' : 'text-[#64748B] group-hover:text-white'
            }`}>
              <Settings className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-bold font-sans tracking-tight ${
              currentTab === 'settings' ? 'text-[#22D3EE]' : 'text-[#64748B]'
            }`}>
              Ajustes
            </span>
          </button>

          {/* Dinamicamente Aba [⭐ Master] se isMasterAdmin == true */}
          {isMasterAdmin && (
            <button
              onClick={() => onTabChange('master')}
              className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer group transition-all"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                currentTab === 'master' 
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] ring-1 ring-[#F59E0B]' 
                  : 'text-[#F59E0B]/70 group-hover:text-[#FDE68A]'
              }`}>
                <Star className="w-4 h-4 fill-current" />
              </div>
              <span className={`text-[10px] font-black font-sans tracking-tight ${
                currentTab === 'master' ? 'text-[#FDE68A]' : 'text-[#F59E0B]/80'
              }`}>
                ⭐ Master
              </span>
            </button>
          )}
        </div>

        {/* Barra de Gestos Android Home Indicator */}
        <div className="w-full bg-[#0F0F13] py-1 flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-[#64748B]/50 rounded-full" />
        </div>
      </div>
    </div>
  );
};
