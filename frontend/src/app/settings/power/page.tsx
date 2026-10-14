"use client";

import React, { useState } from "react";
import { 
  Power, 
  RefreshCw, 
  Server, 
  Boxes, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Clock, 
  X,
  Radio,
  Cpu,
  Layers
} from "lucide-react";

export default function PowerManagementPage() {
  // Modal states
  const [isRestartAppModalOpen, setIsRestartAppModalOpen] = useState(false);
  const [isRebootHostModalOpen, setIsRebootHostModalOpen] = useState(false);

  // Action states
  const [isRestartingApp, setIsRestartingApp] = useState(false);
  const [isRebootingHost, setIsRebootingHost] = useState(false);

  // Status feedback
  const [appFeedback, setAppFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [hostFeedback, setHostFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleRestartApp = async () => {
    setIsRestartingApp(true);
    setAppFeedback(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/power/restart-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setAppFeedback({
          type: "success",
          message: data.message || "Comando de reinicialização dos contêineres enviado com sucesso! Os serviços reiniciarão em instantes."
        });
        setIsRestartAppModalOpen(false);
      } else {
        setAppFeedback({
          type: "error",
          message: data.detail || "Falha ao enviar comando de reinicialização dos contêineres."
        });
      }
    } catch (e: any) {
      setAppFeedback({
        type: "error",
        message: e?.message || "Erro de rede ao conectar com a API."
      });
    } finally {
      setIsRestartingApp(false);
    }
  };

  const handleRebootHost = async () => {
    setIsRebootingHost(true);
    setHostFeedback(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/settings/power/reboot-server`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setHostFeedback({
          type: "success",
          message: data.message || "Comando de reinicialização enviado ao servidor host Ubuntu! O Mini PC reiniciará em instantes."
        });
        setIsRebootHostModalOpen(false);
      } else {
        setHostFeedback({
          type: "error",
          message: data.detail || "Falha ao enviar comando de reinicialização do servidor host."
        });
      }
    } catch (e: any) {
      setHostFeedback({
        type: "error",
        message: e?.message || "Erro de rede ao conectar com a API."
      });
    } finally {
      setIsRebootingHost(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-obsidian-950 to-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden space-y-2">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/10 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-500/10">
            <Power className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Gerenciamento de Energia & Reinicialização
            </h2>
            <p className="text-xs text-slate-400">
              Controle granular para reinicialização da esteira de contêineres ou do servidor físico Ubuntu
            </p>
          </div>
        </div>
      </div>

      {/* Global Feedback Notifications */}
      {appFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn text-xs font-mono ${
            appFeedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/60 border-rose-500/40 text-rose-200"
          }`}
        >
          {appFeedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{appFeedback.message}</span>
        </div>
      )}

      {hostFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn text-xs font-mono ${
            hostFeedback.type === "success"
              ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-200"
              : "bg-rose-950/60 border-rose-500/40 text-rose-200"
          }`}
        >
          {hostFeedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{hostFeedback.message}</span>
        </div>
      )}

      {/* Two Dedicated Operation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD 1: REINICIAR APLICAÇÃO (CONTAINERS) */}
        <div className="glass-panel rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-obsidian-950 to-slate-900/90 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Reiniciar Aplicação</h3>
                  <span className="text-[10px] font-mono text-cyan-400">Contêineres Docker</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                ~10-15s
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Reinicia os contêineres Docker do Sentinela (<code className="text-cyan-300 font-mono text-[11px]">sentinela_frigate</code>, <code className="text-cyan-300 font-mono text-[11px]">sentinela_frontend</code>, <code className="text-cyan-300 font-mono text-[11px]">sentinela_nginx</code> e <code className="text-cyan-300 font-mono text-[11px]">sentinela_backend</code>) mantendo o sistema operacional host Ubuntu em execução.
            </p>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Serviços Reiniciados:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Frigate NVR & go2rtc</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Backend FastAPI Core</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Frontend Next.js Web</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Nginx Reverse Proxy</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Gravações e detecções retornam em menos de 15 segundos.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRestartAppModalOpen(true)}
            disabled={isRestartingApp}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-obsidian-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isRestartingApp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando comando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Reiniciar Aplicação (Containers)</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: REINICIAR SERVIDOR (HOST UBUNTU) */}
        <div className="glass-panel rounded-2xl p-6 border border-rose-500/30 bg-gradient-to-br from-slate-900/90 via-obsidian-950 to-slate-900/90 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Reiniciar Servidor</h3>
                  <span className="text-[10px] font-mono text-rose-400">Host Ubuntu Físico</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                ~45-60s
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Executa a reinicialização física completa do hardware (Mini PC / Servidor Ubuntu). Todos os serviços, decodificadores gráficos de hardware VAAPI e conexões de rede LAN/Wi-Fi serão reinicializados atomicamente.
            </p>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Componentes de Hardware & Sistema:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Intel Celeron N5105</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>GPU Intel UHD VAAPI</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Stack de Rede & Avahi</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Kernel Linux 6.8+</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-rose-300/80">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>A gravação e os alertas ao vivo ficarão temporariamente indisponíveis.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRebootHostModalOpen(true)}
            disabled={isRebootingHost}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
          >
            {isRebootingHost ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando comando...</span>
              </>
            ) : (
              <>
                <Power className="w-4 h-4" />
                <span>Reiniciar Servidor (Host Ubuntu)</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* MODAL 1: CONFIRMAR REINICIALIZAÇÃO DA APLICAÇÃO */}
      {isRestartAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Reiniciar Contêineres da Aplicação</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestartAppModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja confirmar a reinicialização dos contêineres Docker do Sentinela?
              O NVR, a API e a interface web serão reiniciados atomicamente. O processo leva aproximadamente <strong className="text-cyan-300">10 a 15 segundos</strong>.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>• Frigate NVR (Vídeo, Gravações & go2rtc)</div>
              <div>• Sentinela Backend FastAPI</div>
              <div>• Sentinela Frontend Next.js</div>
              <div>• Nginx Reverse Proxy</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRestartAppModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestartingApp}
                onClick={handleRestartApp}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isRestartingApp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Reiniciando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirmar Reinício</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR REINICIALIZAÇÃO DO SERVIDOR HOST */}
      {isRebootHostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Confirmar Reinicialização do Host</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRebootHostModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 space-y-1">
              <strong className="block font-bold text-rose-300">Atenção: Ação Crítica de Infraestrutura</strong>
              <p className="leading-relaxed">
                O servidor físico Ubuntu (Mini PC) será reinicializado completamente via container privilegiado. Todo o monitoramento, gravação e alertas ficarão pausados por aproximadamente <strong className="text-white">45 a 60 segundos</strong>.
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Após o reinício, o Sentinela se conectará automaticamente à rede e retomará todos os serviços. Você precisará atualizar esta página após a inicialização.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRebootHostModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRebootingHost}
                onClick={handleRebootHost}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
              >
                {isRebootingHost ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    <span>Sim, Reiniciar Host</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
