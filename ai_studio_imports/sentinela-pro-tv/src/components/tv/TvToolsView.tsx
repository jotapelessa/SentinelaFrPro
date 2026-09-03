import React, { useState } from 'react';
import { Siren, RefreshCw, HardDrive, ShieldCheck, Radio, Wifi, Zap, Sliders, CheckCircle2 } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

export const TvToolsView: React.FC = () => {
  const [sirenActive, setSirenActive] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [flushingBuffer, setFlushingBuffer] = useState(false);
  const [activeActionFeedback, setActiveActionFeedback] = useState<string | null>(null);

  const triggerAction = (label: string, action: () => void) => {
    tvAudio.playSelectSound();
    action();
    setActiveActionFeedback(label);
    setTimeout(() => setActiveActionFeedback(null), 3000);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-white font-heading">
            Ferramentas & Ações Rápidas NVR
          </h2>
          <p className="text-[12px] text-[#94A3B8]">
            Comandos remotos de hardware, relés de automação e telemetria
          </p>
        </div>

        {activeActionFeedback && (
          <div className="flex items-center gap-2 bg-[#10B981]/20 border border-[#10B981] px-3 py-1.5 rounded-[8px] text-[11px] font-mono text-[#10B981] animate-bounce">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{activeActionFeedback} executado com sucesso!</span>
          </div>
        )}
      </div>

      {/* Grid of Tools (D-Pad Focusable Cards) */}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* Tool 1: Sirene de Alarme Geral */}
        <div
          onClick={() =>
            triggerAction(sirenActive ? 'Sirene Desativada' : 'Sirene de Pânico Acionada', () => {
              if (!sirenActive) tvAudio.playAlertSound();
              setSirenActive(!sirenActive);
            })
          }
          className={`p-4 rounded-[14px] border flex flex-col justify-between cursor-pointer transition-all duration-200 ${
            sirenActive
              ? 'bg-[#EF4444]/20 border-[#EF4444] shadow-[0_0_25px_rgba(239,68,68,0.4)]'
              : 'bg-[#0E1424] border-[#1E293B] hover:bg-[#161F36] hover:border-[#EF4444]/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-[10px] ${sirenActive ? 'bg-[#EF4444] text-white' : 'bg-[#161F36] text-[#EF4444]'}`}>
              <Siren className={`w-6 h-6 ${sirenActive ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#050E1A] text-[#EF4444] border border-[#EF4444]/30">
              {sirenActive ? 'EMITINDO 110dB' : 'STANDBY'}
            </span>
          </div>
          <div>
            <h3 className="text-white text-[15px] font-bold font-heading">
              Sirene de Pânico Geral
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Dispara estrobos e sirenes piezoelétricas de todas as zonas externas.
            </p>
          </div>
          <div className="text-[11px] font-mono text-[#22D3EE] font-bold">
            [OK] {sirenActive ? 'DESATIVAR ALARME' : 'DISPARAR SIRENE'}
          </div>
        </div>

        {/* Tool 2: Relé do Portão Principal */}
        <div
          onClick={() =>
            triggerAction(gateOpen ? 'Portão Trancado' : 'Pulso Relé Portão Enviado', () =>
              setGateOpen(!gateOpen)
            )
          }
          className={`p-4 rounded-[14px] border flex flex-col justify-between cursor-pointer transition-all duration-200 ${
            gateOpen
              ? 'bg-[#10B981]/20 border-[#10B981] shadow-[0_0_25px_rgba(16,185,129,0.3)]'
              : 'bg-[#0E1424] border-[#1E293B] hover:bg-[#161F36] hover:border-[#10B981]/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-2.5 rounded-[10px] ${gateOpen ? 'bg-[#10B981] text-white' : 'bg-[#161F36] text-[#10B981]'}`}>
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#050E1A] text-[#10B981] border border-[#10B981]/30">
              {gateOpen ? 'RELÉ ABERTO' : 'FECHADO'}
            </span>
          </div>
          <div>
            <h3 className="text-white text-[15px] font-bold font-heading">
              Relé de Acesso Portaria
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Pulso seco 12V para liberação de cancela veicular e eclusa.
            </p>
          </div>
          <div className="text-[11px] font-mono text-[#22D3EE] font-bold">
            [OK] {gateOpen ? 'BLOQUEAR PORTÃO' : 'LIBERAR ENTRADA'}
          </div>
        </div>

        {/* Tool 3: Flush RTSP Buffer */}
        <div
          onClick={() => {
            setFlushingBuffer(true);
            triggerAction('Buffer RTSP Zerado', () => {
              setTimeout(() => setFlushingBuffer(false), 1200);
            });
          }}
          className="p-4 rounded-[14px] bg-[#0E1424] border border-[#1E293B] hover:bg-[#161F36] hover:border-[#06B6D4] flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#22D3EE]">
              <RefreshCw className={`w-6 h-6 ${flushingBuffer ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-[10px] font-mono text-[#22D3EE] bg-[#050E1A] px-2 py-0.5 rounded border border-[#06B6D4]/30">
              LATÊNCIA: 32ms
            </span>
          </div>
          <div>
            <h3 className="text-white text-[15px] font-bold font-heading">
              Limpar Buffer RTSP
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Ressincroniza streams H.265 para minimizar atraso de exibição na TV.
            </p>
          </div>
          <div className="text-[11px] font-mono text-[#22D3EE] font-bold">
            [OK] RESSINCRONIZAR 24 FPS
          </div>
        </div>

        {/* Tool 4: Diagnóstico Tailscale Mesh */}
        <div
          onClick={() => triggerAction('Ping Mesh Tailscale: 14ms (100.84.21.9)', () => {})}
          className="p-4 rounded-[14px] bg-[#0E1424] border border-[#1E293B] hover:bg-[#161F36] hover:border-[#06B6D4] flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#10B981]">
              <Radio className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-[#10B981] bg-[#050E1A] px-2 py-0.5 rounded border border-[#10B981]/30">
              DIRECT P2P
            </span>
          </div>
          <div>
            <h3 className="text-white text-[15px] font-bold font-heading">
              Rede Tailscale Mesh
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Túnel criptografado WireGuard para transmissão remota ultra-segura.
            </p>
          </div>
          <div className="text-[11px] font-mono text-[#22D3EE] font-bold">
            [OK] TESTAR CONECTIVIDADE
          </div>
        </div>

        {/* Tool 5: Calibração PTZ Preset 360 */}
        <div
          onClick={() => triggerAction('Patrulha PTZ Automática Iniciada', () => {})}
          className="p-4 rounded-[14px] bg-[#0E1424] border border-[#1E293B] hover:bg-[#161F36] hover:border-[#06B6D4] flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#F59E0B]">
              <Sliders className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-[#F59E0B] bg-[#050E1A] px-2 py-0.5 rounded border border-[#F59E0B]/30">
              6 PRESETS
            </span>
          </div>
          <div>
            <h3 className="text-white text-[15px] font-bold font-heading">
              Patrulha PTZ Perimetral
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Inicia rotação automática nas câmeras 360° do Estacionamento Norte.
            </p>
          </div>
          <div className="text-[11px] font-mono text-[#22D3EE] font-bold">
            [OK] INICIAR PATRULHA
          </div>
        </div>

        {/* Tool 6: Saúde do Armazenamento NVR */}
        <div
          onClick={() => triggerAction('S.M.A.R.T. NVMe: Saudável (0 erros)', () => {})}
          className="p-4 rounded-[14px] bg-[#0E1424] border border-[#1E293B] hover:bg-[#161F36] hover:border-[#06B6D4] flex flex-col justify-between cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-[10px] bg-[#161F36] text-[#22D3EE]">
              <HardDrive className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-[#10B981] bg-[#050E1A] px-2 py-0.5 rounded border border-[#10B981]/30">
              RAID-10 100% OK
            </span>
          </div>
          <div>
            <h3 className="text-white text-[15px] font-bold font-heading">
              Verificação RAID-10 NVMe
            </h3>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              14.2 TB disponíveis • Gravação em loop contínuo garantida por 45 dias.
            </p>
          </div>
          <div className="text-[11px] font-mono text-[#22D3EE] font-bold">
            [OK] VERIFICAR S.M.A.R.T.
          </div>
        </div>
      </div>
    </div>
  );
};
