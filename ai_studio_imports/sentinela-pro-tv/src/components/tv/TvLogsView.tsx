import React, { useState } from 'react';
import { MOCK_LOGS } from '../../data/mockData';
import { Shield, AlertTriangle, Info, Terminal, Download, RefreshCw } from 'lucide-react';
import { tvAudio } from '../../utils/audioFeedback';

export const TvLogsView: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'SECURITY' | 'INFO'>('ALL');
  const [logs, setLogs] = useState(MOCK_LOGS);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.level === filter;
  });

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/50';
      case 'SECURITY':
        return 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/50';
      case 'WARN':
        return 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50';
      default:
        return 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/50';
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-white font-heading">
            Auditoria & Logs de Segurança do NVR
          </h2>
          <p className="text-[12px] text-[#94A3B8]">
            Eventos de IA perimetral, conexões Tailscale e telemetria H.265
          </p>
        </div>

        {/* Filter Pills (D-Pad Switchable) */}
        <div className="flex items-center gap-2">
          {(['ALL', 'CRITICAL', 'SECURITY', 'INFO'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                tvAudio.playFocusTick();
                setFilter(lvl);
              }}
              className={`px-3 py-1 rounded-[8px] text-[11px] font-mono transition-all ${
                filter === lvl
                  ? 'bg-[#161F36] text-[#22D3EE] border border-[#06B6D4] font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0E1424] text-[#94A3B8] border border-[#1E293B] hover:text-white'
              }`}
            >
              {lvl === 'ALL' ? 'TODOS' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Monospace Logs Container */}
      <div className="flex-1 bg-[#090D18] border border-[#1E293B] rounded-[14px] p-4 flex flex-col font-mono overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#1E293B] text-[11px] text-[#475569]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#22D3EE]" />
            <span className="text-[#94A3B8]">sentinela-nvr-daemon • /var/log/nvr/security.log</span>
          </div>
          <span className="text-[#10B981] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            LIVE STREAM AUDIT
          </span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-[8px] bg-[#0E1424] border border-[#1E293B]/70 flex items-start gap-3 text-[11px] hover:border-[#06B6D4]/50 transition-colors"
            >
              <span className="text-[#94A3B8] flex-shrink-0 font-bold">{log.timestamp}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${getLevelBadge(log.level)}`}>
                {log.level}
              </span>
              <span className="text-[#22D3EE] font-bold flex-shrink-0">[{log.source}]</span>
              <span className="text-white flex-1">{log.message}</span>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="pt-3 mt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#94A3B8]">
          <span>Total de eventos registrados: {filteredLogs.length}</span>
          <button
            onClick={() => {
              tvAudio.playSelectSound();
              setLogs([
                {
                  id: `log-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString('pt-BR') + '.000',
                  level: 'INFO',
                  source: 'SYSTEM_CHECK',
                  message: 'Varredura Perimetral concluída. 0 intrusões pendentes.',
                },
                ...logs,
              ]);
            }}
            className="flex items-center gap-1 text-[#22D3EE] hover:text-white font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Forçar Varredura Manual
          </button>
        </div>
      </div>
    </div>
  );
};
