import React, { useState } from 'react';
import { 
  Settings, 
  Shield, 
  Cpu, 
  Wifi, 
  HardDrive, 
  Star, 
  Check, 
  Smartphone, 
  Zap, 
  Lock,
  Server
} from 'lucide-react';

interface SettingsViewProps {
  isMasterAdmin: boolean;
  onToggleMasterAdmin: (enabled: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isMasterAdmin,
  onToggleMasterAdmin
}) => {
  const [hwDecode, setHwDecode] = useState(true);
  const [fps120, setFps120] = useState(true);
  const [lowLatency, setLowLatency] = useState(true);
  const [vibrationFeedback, setVibrationFeedback] = useState(true);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-h-full">
      {/* Header */}
      <div>
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Configurações do NVR Smartphone
        </h3>
        <p className="text-[11px] font-mono text-[#94A3B8]">
          Perfil: Moto G54 5G • MediaCodec H.265 120Hz
        </p>
      </div>

      {/* Card Modo Master Admin */}
      <div className={`rounded-2xl p-4 border transition-all ${
        isMasterAdmin 
          ? 'bg-gradient-to-r from-[#78350F]/70 to-[#451A03]/70 border-[#F59E0B] shadow-lg shadow-[#F59E0B]/10' 
          : 'bg-[#111827] border-[#1F2937]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isMasterAdmin 
                ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#FDE68A]' 
                : 'bg-[#1F2937] border-transparent text-[#64748B]'
            }`}>
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white">Modo Central Master (is_master_admin)</h4>
                {isMasterAdmin && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#F59E0B] text-black text-[8px] font-mono font-bold">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-[#94A3B8] mt-0.5">
                Libera a aba ⭐ Central Master e testes em lote de PiP nas TVs.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={isMasterAdmin} 
              onChange={(e) => onToggleMasterAdmin(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1F2937] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F59E0B]"></div>
          </label>
        </div>
      </div>

      {/* Servidores e Conectividade */}
      <div className="rounded-2xl bg-[#111827] border border-[#1F2937] p-4 flex flex-col gap-3">
        <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>Infraestrutura Frigate & Tailscale</span>
        </h4>

        <div className="flex flex-col gap-2 font-mono text-[11px]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#090D16] border border-[#1F2937]">
            <span className="text-[#94A3B8]">Servidor Frigate NVR</span>
            <span className="text-white font-bold">100.82.14.1:5000</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#090D16] border border-[#1F2937]">
            <span className="text-[#94A3B8]">Tailscale IP (Device)</span>
            <span className="text-[#10B981] font-bold">100.82.14.20 (Ativo)</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#090D16] border border-[#1F2937]">
            <span className="text-[#94A3B8]">Broker MQTT (Alertas PiP)</span>
            <span className="text-white">mqtt://100.82.14.1:1883</span>
          </div>
        </div>
      </div>

      {/* Otimizações de Vídeo e Hardware */}
      <div className="rounded-2xl bg-[#111827] border border-[#1F2937] p-4 flex flex-col gap-3">
        <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span>Aceleração Gráfica & Ergonomia</span>
        </h4>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Decodificação H.265 por GPU</p>
              <p className="text-[10px] font-mono text-[#94A3B8]">Zero buffer com MediaCodec</p>
            </div>
            <button 
              onClick={() => setHwDecode(!hwDecode)}
              className={`w-9 h-5 rounded-full transition-colors relative ${hwDecode ? 'bg-[#22D3EE]' : 'bg-[#1F2937]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 left-0.5 ${hwDecode ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-[#1F2937] pt-2">
            <div>
              <p className="text-xs font-bold text-white">Taxa de Atualização 120Hz</p>
              <p className="text-[10px] font-mono text-[#94A3B8]">Rolagem ultrassuave no feed</p>
            </div>
            <button 
              onClick={() => setFps120(!fps120)}
              className={`w-9 h-5 rounded-full transition-colors relative ${fps120 ? 'bg-[#22D3EE]' : 'bg-[#1F2937]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 left-0.5 ${fps120 ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-[#1F2937] pt-2">
            <div>
              <p className="text-xs font-bold text-white">Haptic Feedback (Toque com Polegar)</p>
              <p className="text-[10px] font-mono text-[#94A3B8]">Vibração tátil em botões de ação</p>
            </div>
            <button 
              onClick={() => setVibrationFeedback(!vibrationFeedback)}
              className={`w-9 h-5 rounded-full transition-colors relative ${vibrationFeedback ? 'bg-[#22D3EE]' : 'bg-[#1F2937]'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 left-0.5 ${vibrationFeedback ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
