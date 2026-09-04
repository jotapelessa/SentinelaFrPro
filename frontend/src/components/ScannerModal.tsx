"use client";

import React, { useState } from "react";
import { useSentinelaStore, DiscoveredDevice } from "@/store/useSentinelaStore";
import { Search, X, Check, Copy, Wifi, ShieldCheck, Loader2, Camera as CameraIcon, Plus, CheckCircle2 } from "lucide-react";

export const ScannerModal: React.FC = () => {
  const { isScannerOpen, setIsScannerOpen, isScanning, setIsScanning, scanResults, setScanResults, setCameras } = useSentinelaStore();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [subnetInput, setSubnetInput] = useState("192.168.1");
  const [addingIp, setAddingIp] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<{ duration?: number; scanned_ips?: number } | null>(null);

  if (!isScannerOpen) return null;

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanInfo(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/scanner/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subnet: subnetInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setScanResults(data.devices || []);
        setScanInfo({ duration: data.duration_seconds, scanned_ips: 254 });
      } else {
        setScanResults([]);
      }
    } catch (err) {
      console.error("Scanner error:", err);
      setScanResults([]);
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

  const handleAddDirect = async (dev: DiscoveredDevice) => {
    setAddingIp(dev.ip);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camName = `cam_${dev.ip.replace(/\./g, "_")}`;
      const payload = {
        name: camName,
        friendly_name: dev.friendly_name || `Câmera (${dev.ip})`,
        rtsp_main: dev.rtsp_main || dev.rtsp_url_hint || `rtsp://${dev.ip}:554/live/ch0`,
        rtsp_sub: dev.rtsp_sub || (dev.is_5mp ? `rtsp://${dev.ip}:554/live/ch1` : undefined),
        ip_address: dev.ip,
        onvif_port: dev.onvif_port || (dev.port === 3702 ? 8899 : 80),
        enabled: true
      };

      const res = await fetch(`${apiUrl}/cameras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAddedSuccess(dev.ip);
        // Refresh camera list
        const camRes = await fetch(`${apiUrl}/cameras`);
        if (camRes.ok) {
          const camData = await camRes.json();
          setCameras(Array.isArray(camData) ? camData : []);
        }
        setTimeout(() => setAddedSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingIp(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-panel-glow rounded-2xl p-6 border border-cyan-500/30 bg-slate-900 shadow-2xl relative flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-wide">
                Scanner Autêntico de Câmeras & ONVIF
              </h3>
              <p className="text-xs text-slate-400">
                Detecção avançada de Câmeras IP (AITEK 5MP SEG6050BP, Xiongmai, ONVIF 8899/80, RTSP 554)
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
        <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Action Bar with Subnet Input */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300 w-full sm:w-auto">
              <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-semibold">Sub-rede:</span>
              <input
                type="text"
                value={subnetInput}
                onChange={(e) => setSubnetInput(e.target.value)}
                placeholder="Ex: 192.168.1"
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-xs w-28 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-500 font-mono">.0/24</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                disabled={isScanning}
                onClick={handleStartScan}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Varrendo 254 IPs...</span>
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAll ? "Copiados!" : "Copiar IPs"}</span>
                </button>
              )}
            </div>
          </div>

          {scanInfo && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
              <span>Varredura concluída em <strong className="font-mono">{scanInfo.duration}s</strong></span>
              <span className="text-[11px] font-mono text-slate-400">254 IPs analisados</span>
            </div>
          )}

          {/* Results List */}
          {scanResults.length === 0 && !isScanning ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CameraIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Nenhuma câmera detectada na sub-rede {subnetInput}.0/24.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Certifique-se de que as câmeras estão ligadas e conectadas ao mesmo roteador ou switch da rede.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Câmeras & Dispositivos de Vídeo Detectados ({scanResults.length})
              </div>
              {scanResults.map((dev, idx) => {
                const is5Mp = dev.is_5mp || dev.resolution?.includes("5MP") || dev.friendly_name?.includes("AITEK");
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      is5Mp
                        ? "bg-slate-950/90 border border-cyan-500/50 shadow-lg shadow-cyan-950/30"
                        : "bg-slate-950 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-cyan-300">{dev.ip}</span>
                        {dev.friendly_name && (
                          <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                            {dev.friendly_name}
                          </span>
                        )}
                        {is5Mp && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold uppercase tracking-wider">
                            5MP Ultra HD
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{dev.protocol || "Câmera RTSP"}</span>
                        </span>
                      </div>

                      {/* Features Badges */}
                      {dev.features && dev.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {dev.features.map((feat, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stream hints */}
                      <div className="space-y-0.5 pt-1">
                        {dev.rtsp_main && (
                          <p className="text-[11px] font-mono text-slate-400 truncate max-w-md bg-slate-900 px-2 py-0.5 rounded border border-slate-800/80">
                            <span className="text-cyan-400 font-semibold">Gravação (5MP):</span> {dev.rtsp_main}
                          </p>
                        )}
                        {dev.rtsp_sub && (
                          <p className="text-[11px] font-mono text-slate-400 truncate max-w-md bg-slate-900 px-2 py-0.5 rounded border border-slate-800/80">
                            <span className="text-emerald-400 font-semibold">IA Detecção (Sub):</span> {dev.rtsp_sub}
                          </p>
                        )}
                        {!dev.rtsp_main && dev.rtsp_url_hint && (
                          <p className="text-[11px] font-mono text-slate-400 truncate max-w-md bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {dev.rtsp_url_hint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                      <button
                        onClick={() => handleAddDirect(dev)}
                        disabled={addingIp === dev.ip || addedSuccess === dev.ip}
                        className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                          addedSuccess === dev.ip
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : is5Mp
                            ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-obsidian-950 shadow-md shadow-cyan-500/30"
                            : "bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 shadow-md shadow-cyan-500/20"
                        }`}
                      >
                        {addedSuccess === dev.ip ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Adicionada!</span>
                          </>
                        ) : addingIp === dev.ip ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sincronizando...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{is5Mp ? "Adicionar 5MP Otimizada" : "Adicionar Câmera"}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopySingle(dev.ip, `ip-${idx}`)}
                        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700"
                        title="Copiar IP"
                      >
                        {copiedIp === `ip-${idx}` ? "Copiado!" : "IP"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
