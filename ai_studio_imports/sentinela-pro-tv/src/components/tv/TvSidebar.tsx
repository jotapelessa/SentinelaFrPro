import React, { useEffect, useState } from 'react';
import { Camera, Film, Zap, Activity, Settings } from 'lucide-react';
import { TvTab } from '../../types/tv';
import { tvAudio } from '../../utils/audioFeedback';

interface TvSidebarProps {
  activeTab: TvTab;
  focusedZone: string;
  focusedIndex: number;
  tailscaleIp: string;
  onSelectTab: (tab: TvTab) => void;
}

export const TvSidebar: React.FC<TvSidebarProps> = ({
  activeTab,
  focusedZone,
  focusedIndex,
  tailscaleIp,
  onSelectTab,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const menuItems: { tab: TvTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'CAMERAS', label: 'Câmeras', icon: <Camera className="w-5 h-5" /> },
    { tab: 'CAPTURES', label: 'Capturas', icon: <Film className="w-5 h-5" /> },
    { tab: 'TOOLS', label: 'Ferramentas', icon: <Zap className="w-5 h-5" /> },
    { tab: 'LOGS', label: 'Logs', icon: <Activity className="w-5 h-5" /> },
    { tab: 'SETTINGS', label: 'Ajustes', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside
      id="tv-sidebar"
      className="w-[250px] h-full bg-[#090D18] border-r border-[#1E293B] flex flex-col p-6 shrink-0 z-20 select-none"
    >
      {/* Brand & Version */}
      <div className="mb-6">
        <h1 className="text-[22px] font-black tracking-[2px] text-[#E50914] mb-1 font-heading leading-none">
          SENTINELA
        </h1>
        <div className="flex items-center gap-2">
          <span className="bg-[#E50914] text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
            TV PRO
          </span>
          <span className="text-[#475569] text-[10px] font-mono">v4.2.0-stable</span>
        </div>
      </div>

      {/* Online Status Pill */}
      <div className="inline-flex items-center gap-2 bg-[#050E1A] px-3 py-1.5 rounded-[20px] mb-6 border border-[#10B981]/30 w-fit">
        <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
        <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider font-mono">
          Online • 24 FPS
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex flex-col gap-2" aria-label="Menu Principal">
        {menuItems.map((item, idx) => {
          const isFocused = focusedZone === 'SIDEBAR' && focusedIndex === idx;
          const isSelected = activeTab === item.tab;

          return (
            <button
              key={item.tab}
              id={`tv-menu-item-${item.tab.toLowerCase()}`}
              onClick={() => {
                tvAudio.playSelectSound();
                onSelectTab(item.tab);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-[10px] transition-all duration-150 outline-none text-left cursor-pointer ${
                isFocused
                  ? 'bg-[#161F36] text-white scale-[1.03] border-2 border-white shadow-2xl font-bold z-10'
                  : isSelected
                  ? 'bg-[#E50914] text-white rounded-[10px] shadow-lg font-bold'
                  : 'text-[#94A3B8] hover:bg-[#161F36] hover:text-white font-medium'
              }`}
            >
              <span
                className={`${
                  isFocused || isSelected ? 'text-white' : 'text-[#94A3B8]'
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[14px] leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer: Clock & Tailscale Indicator */}
      <div className="mt-auto pt-6 border-t border-[#1E293B]">
        <div className="text-[28px] font-mono font-bold text-white leading-none mb-1">
          {time || '21:44'}
        </div>
        <div className="flex items-center gap-2 text-[#94A3B8]">
          <div className="w-2 h-2 rounded-full bg-[#22D3EE]" />
          <span className="text-[10px] font-mono uppercase tracking-widest truncate">
            Tailscale Active ({tailscaleIp})
          </span>
        </div>
      </div>
    </aside>
  );
};
