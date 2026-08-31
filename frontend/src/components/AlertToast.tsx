"use client";

import React from "react";
import { useSentinelaStore } from "@/store/useSentinelaStore";
import Link from "next/link";
import { ShieldAlert, X, ExternalLink } from "lucide-react";

export const AlertToast: React.FC = () => {
  const { recentAlert, setRecentAlert } = useSentinelaStore();

  if (!recentAlert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-xl glass-panel-glow bg-slate-950/95 border-2 border-rose-500/80 shadow-2xl shadow-rose-500/30 text-white backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 mt-0.5">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[11px] tracking-wider uppercase text-rose-400">
                  ALERTA DE INTRUSÃO / ROI
                </span>
                {recentAlert.score && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    {recentAlert.score}%
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-100">
                {recentAlert.label.toUpperCase()} detectado
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Câmera: <strong className="text-slate-200">{recentAlert.camera}</strong> {recentAlert.zone ? `(Zona: ${recentAlert.zone})` : ""}
              </p>

              <div className="pt-2 flex items-center gap-2">
                <Link
                  href="/events"
                  onClick={() => setRecentAlert(null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ver na Central de Eventos</span>
                </Link>
              </div>
            </div>
          </div>

          <button
            onClick={() => setRecentAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-all"
            title="Fechar Alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
