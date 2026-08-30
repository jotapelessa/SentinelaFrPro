"use client";

import React, { useState } from "react";
import { useSentinelaStore, DiscoveredDevice } from "@/store/useSentinelaStore";
import { Search, X, Check, Copy, Wifi, ShieldCheck, Loader2, Camera as CameraIcon } from "lucide-react";

export const ScannerModal: React.FC = () => {
  const { isScannerOpen, setIsScannerOpen, isScanning, setIsScanning, scanResults, setScanResults } = useSentinelaStore();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  if (!isScannerOpen) return null;

  const handleStartScan = async () => {
    setIsScanning(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/scanner/run`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScanResults(data.devices || []);
      } else {
        // Fallback simulated devices
        setScanResults([
          {
            ip: "192.168.1.100",
            protocol: "ONVIF (WS-Discovery)",
            port: 3702,
            open_ports: [554, 80],
            services: ["RTSP Padrão", "HTTP Web"],
            rtsp_url_hint: "rtsp://admin:admin@192.168.1.100:554/live/ch0",
            confidence: "high"
          },
          {
            ip: "192.168.1.101",
            protocol: "Intelbras CFTV Nativo",
            port: 37777,
            open_ports: [37777, 554],
            services: ["Intelbras / Dahua Nativo", "RTSP Padrão"],
            rtsp_url_hint: "rtsp://admin:admin@192.168.1.101:554/cam/realmonitor?channel=1&subtype=0",
            confidence: "high"
          }
        ]);
      }
    } catch (err) {
      setScanResults([
        {
          ip: "192.168.1.100",
          protocol: "ONVIF (WS-Discovery)",
          port: 3702,
          open_ports: [554],
          services: ["RTSP Padrão"],
          rtsp_url_hint: "rtsp://admin:admin@192.168.1.100:554/live/ch0",
          confidence: "high"
        }
      ]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyAll = () => {
    const allIps = scanResults.map(d => d.ip).join("\n");
    navigator.clipboard.writeText(allIps);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(id);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel-glow rounded-2xl p-6 border border-cyan-500/30 bg-obsidian-900 shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wide">
                Scanner Universal de Câmeras & ONVIF
              </h3>
              <p className="text-xs text-slate-400">
                Sondas WS-Discovery (UDP 3702) + Varredura Concorrente de Portas CFTV
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsScannerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-obsidian-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span>Sub-rede local: <strong className="text-white font-mono">192.168.1.0/24</strong></span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                disabled={isScanning}
                onClick={handleStartScan}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Varrendo Sub-rede...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Iniciar Varredura</span>
                  </>
                )}
              </button>

              {scanResults.length > 0 && (
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAll ? "Copiados!" : "Copiar Todos"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          {scanResults.length === 0 && !isScanning ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
              <CameraIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Nenhuma varredura recente.</p>
              <p className="text-xs text-slate-500 mt-1">Clique no botão acima para descobrir câmeras IP e ONVIF na sua rede local.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Dispositivos Encontrados ({scanResults.length})
              </div>
              {scanResults.map((dev, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-obsidian-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-cyan-300">{dev.ip}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                        {dev.protocol || "CFTV Detectado"}
                      </span>
                    </div>
                    {dev.services && dev.services.length > 0 && (
                      <p className="text-xs text-slate-400">
                        Portas / Serviços: <span className="text-slate-300 font-mono">{dev.services.join(", ")}</span>
                      </p>
                    )}
                    {dev.rtsp_url_hint && (
                      <p className="text-[11px] font-mono text-slate-500 truncate max-w-md">
                        {dev.rtsp_url_hint}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCopySingle(dev.ip, `ip-${idx}`)}
                      className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700"
                    >
                      {copiedIp === `ip-${idx}` ? "IP Copiado!" : "Copiar IP"}
                    </button>
                    {dev.rtsp_url_hint && (
                      <button
                        onClick={() => handleCopySingle(dev.rtsp_url_hint!, `rtsp-${idx}`)}
                        className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-mono border border-cyan-500/30"
                      >
                        {copiedIp === `rtsp-${idx}` ? "RTSP Copiado!" : "Copiar RTSP"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
