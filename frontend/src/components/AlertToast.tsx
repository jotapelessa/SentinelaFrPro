"use client";

import React from "react";
import { useSentinelaStore } from "@/store/useSentinelaStore";
import { ShieldAlert, X, Eye } from "lucide-react";

export const AlertToast: React.FC = () => {
  const { recentAlert, setRecentAlert } = useSentinelaStore();

  if (!recentAlert) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce transition-all max-w-sm w-full">
      <div className="p-4 rounded-xl glass-panel-glow bg-obsidian-950 border border-rose-500/50 shadow-2xl shadow-rose-500/20 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs tracking-wider uppercase text-rose-400">
                  ALERTA DE INTRUSÃO / ROI
                </span>
                {recentAlert.score && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300">
                    {recentAlert.score}%
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-100">
                {recentAlert.label.toUpperCase()} detectado
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Câmera: {recentAlert.camera} {recentAlert.zone ? `(${recentAlert.zone})` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={() => setRecentAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
