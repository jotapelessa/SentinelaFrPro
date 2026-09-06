"use client";

import React, { useState } from "react";
import { useSentinelaStore, DiscoveredDevice } from "@/store/useSentinelaStore";
import { 
  Search, X, Check, Copy, Wifi, ShieldCheck, Loader2, 
  Camera as CameraIcon, Plus, CheckCircle2, Play, AlertCircle,
  Settings2, ChevronDown, ChevronUp, Radio
} from "lucide-react";

export const ScannerModal: React.FC = () => {
  const { 
    isScannerOpen, setIsScannerOpen, 
    isScanning, setIsScanning, 
    scanResults, setScanResults, 
    cameras, setCameras 
  } = useSentinelaStore();

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [subnetInput, setSubnetInput] = useState("192.168.1");
  
  // Feedback states
  const [addingIp, setAddingIp] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState<string | null>(null);
  const [addError, setAddError] = useState<{ [ip: string]: string }>({});
  
  // RTSP connectivity test states
  const [testingIp, setTestingIp] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [ip: string]: { ok: boolean; msg: string } }>({});
  const [scanInfo, setScanInfo] = useState<{ duration?: number; scanned_ips?: number } | null>(null);

  // Customization drawer per device with full editing capability
  const [expandedCustomIp, setExpandedCustomIp] = useState<string | null>(null);
  const [customForms, setCustomForms] = useState<{
    [ip: string]: {
      ip: string;
      rtsp_port: string;
      onvif_port: string;
      name: string;
      friendly_name: string;
      rtsp_user?: string;
      rtsp_pass?: string;
      rtsp_main?: string;
      rtsp_sub?: string;
      is_manual_rtsp?: boolean;
    }
  }>({});

  if (!isScannerOpen) return null;

  const buildRtspUrl = (
    ip: string,
    port: string,
    user?: string,
    pass?: string,
    path = "live"
  ) => {
    const cleanIp = ip.trim();
    const cleanPort = port.trim();
    const creds = user?.trim() && pass?.trim()
      ? `${encodeURIComponent(user.trim())}:${encodeURIComponent(pass.trim())}@`
      : "";
    const portPart = cleanPort ? `:${cleanPort}` : "";
    const pathPart = path.startsWith("/") ? path : `/${path}`;
    return `rtsp://${creds}${cleanIp}${portPart}${pathPart}`;
  };

  const handleTestRtsp = async (dev: DiscoveredDevice) => {
    setTestingIp(dev.ip);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const custom = customForms[dev.ip];
      
      let rtspUrl = custom?.rtsp_main || dev.rtsp_main || dev.rtsp_url_hint;
      if (!rtspUrl) {
        const port = custom?.rtsp_port || (dev.open_ports?.find(p => p !== 80 && p !== 8899) ? String(dev.open_ports.find(p => p !== 80 && p !== 8899)) : "8554");
        rtspUrl = buildRtspUrl(custom?.ip || dev.ip, port, custom?.rtsp_user, custom?.rtsp_pass, "live");
      } else if (custom?.rtsp_user && custom?.rtsp_pass && !rtspUrl.includes("@")) {
        const userPass = `${encodeURIComponent(custom.rtsp_user)}:${encodeURIComponent(custom.rtsp_pass)}@`;
        rtspUrl = rtspUrl.replace("rtsp://", `rtsp://${userPass}`);
      }

      const res = await fetch(`${apiUrl}/cameras/test-rtsp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtsp_url: rtspUrl })
      });
      const data = await res.json();
      setTestResult(prev => ({
        ...prev,
        [dev.ip]: {
          ok: !!data.success,
          msg: data.success ? "RTSP Ativo!" : "Sem Resposta RTSP"
        }
      }));
      setTimeout(() => {
        setTestResult(prev => {
          const next = { ...prev };
          delete next[dev.ip];
          return next;
        });
      }, 4000);
    } catch {
      setTestResult(prev => ({
        ...prev,
        [dev.ip]: { ok: false, msg: "Falha de Rede" }
      }));
    } finally {
      setTestingIp(null);
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanInfo(null);
    setAddError({});
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

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const toggleCustomDrawer = (dev: DiscoveredDevice) => {
    if (expandedCustomIp === dev.ip) {
      setExpandedCustomIp(null);
    } else {
      setExpandedCustomIp(dev.ip);
      if (!customForms[dev.ip]) {
        const cleanName = `cam_${dev.ip.replace(/\./g, "_")}`;
        const defaultPort = dev.open_ports?.find(p => p !== 80 && p !== 8899 && p !== 3702)
          ? String(dev.open_ports.find(p => p !== 80 && p !== 8899 && p !== 3702))
          : "8554";
        const defaultOnvif = String(dev.onvif_port || (dev.port === 3702 ? 8899 : 80));
        const initialMain = dev.rtsp_main || dev.rtsp_url_hint || buildRtspUrl(dev.ip, defaultPort, "", "", "live");

        setCustomForms(prev => ({
          ...prev,
          [dev.ip]: {
            ip: dev.ip,
            rtsp_port: defaultPort,
            onvif_port: defaultOnvif,
            name: cleanName,
            friendly_name: dev.friendly_name || `Câmera ${dev.ip}`,
            rtsp_user: "",
            rtsp_pass: "",
            rtsp_main: initialMain,
            rtsp_sub: dev.rtsp_sub || "",
            is_manual_rtsp: false
          }
        }));
      }
    }
  };

  const handleUpdateCustomField = (
    devIp: string,
    field: "ip" | "rtsp_port" | "onvif_port" | "name" | "friendly_name" | "rtsp_user" | "rtsp_pass" | "rtsp_main" | "rtsp_sub",
    value: string
  ) => {
    setCustomForms(prev => {
      const current = prev[devIp];
      if (!current) return prev;

      const updated = { ...current, [field]: value };

      // Se editou a URL diretamente, ativa trava manual
      if (field === "rtsp_main" || field === "rtsp_sub") {
        updated.is_manual_rtsp = true;
      } else if (!updated.is_manual_rtsp && (field === "ip" || field === "rtsp_port" || field === "rtsp_user" || field === "rtsp_pass")) {
        // Recálculo reativo se não estiver travado manualmente
        updated.rtsp_main = buildRtspUrl(
          updated.ip,
          updated.rtsp_port,
          updated.rtsp_user,
          updated.rtsp_pass,
          "live"
        );
        if (updated.rtsp_sub && !updated.rtsp_sub.includes("ch1")) {
          updated.rtsp_sub = buildRtspUrl(
            updated.ip,
            updated.rtsp_port,
            updated.rtsp_user,
            updated.rtsp_pass,
            "live/sub"
          );
        }
      }

      return {
        ...prev,
        [devIp]: updated
      };
    });
  };

  const handleResetRtspUrl = (devIp: string) => {
    setCustomForms(prev => {
      const current = prev[devIp];
      if (!current) return prev;
      return {
        ...prev,
        [devIp]: {
          ...current,
          is_manual_rtsp: false,
          rtsp_main: buildRtspUrl(current.ip, current.rtsp_port, current.rtsp_user, current.rtsp_pass, "live")
        }
      };
    });
  };

  const handleAddDirect = async (dev: DiscoveredDevice) => {
    setAddingIp(dev.ip);
    setAddError(prev => {
      const next = { ...prev };
      delete next[dev.ip];
      return next;
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const custom = customForms[dev.ip];
      
      const targetIp = (custom?.ip || dev.ip).trim();
      const targetPort = (custom?.rtsp_port || (dev.open_ports?.find(p => p !== 80 && p !== 8899) ? String(dev.open_ports.find(p => p !== 80 && p !== 8899)) : "8554")).trim();
      const onvifPortNum = parseInt(custom?.onvif_port || String(dev.onvif_port || (dev.port === 3702 ? 8899 : 80)), 10) || 80;

      const camName = (custom?.name || `cam_${targetIp.replace(/\./g, "_")}`).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      let mainUrl = (custom?.rtsp_main || dev.rtsp_main || dev.rtsp_url_hint || buildRtspUrl(targetIp, targetPort, custom?.rtsp_user, custom?.rtsp_pass, "live")).trim();
      let subUrl = (custom?.rtsp_sub || dev.rtsp_sub || "").trim() || undefined;

      // Injetar credenciais se preenchidas e ainda não presentes no RTSP
      if (custom?.rtsp_user && custom?.rtsp_pass) {
        const userPass = `${encodeURIComponent(custom.rtsp_user)}:${encodeURIComponent(custom.rtsp_pass)}@`;
        if (!mainUrl.includes("@")) {
          mainUrl = mainUrl.replace("rtsp://", `rtsp://${userPass}`);
        }
        if (subUrl && !subUrl.includes("@")) {
          subUrl = subUrl.replace("rtsp://", `rtsp://${userPass}`);
        }
      }

      const payload = {
        name: camName,
        friendly_name: (custom?.friendly_name || dev.friendly_name || `Câmera (${targetIp})`).trim(),
        rtsp_main: mainUrl,
        rtsp_sub: subUrl,
        ip_address: targetIp,
        onvif_port: onvifPortNum,
        enabled: true
      };

      // Chamada com barra no final para total conformidade com FastAPI
      const res = await fetch(`${apiUrl}/cameras/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAddedSuccess(dev.ip);
        setExpandedCustomIp(null);
        
        // Atualiza a lista unificada de câmeras na store
        const camRes = await fetch(`${apiUrl}/cameras/`);
        if (camRes.ok) {
          const camData = await camRes.json();
          setCameras(Array.isArray(camData) ? camData : []);
        }
        setTimeout(() => setAddedSuccess(null), 3500);
      } else {
        const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        setAddError(prev => ({
          ...prev,
          [dev.ip]: errData.detail || "Erro ao adicionar câmera. Verifique os dados RTSP."
        }));
      }
    } catch (err: any) {
      console.error(err);
      setAddError(prev => ({
        ...prev,
        [dev.ip]: err?.message || "Falha de conexão com o servidor."
      }));
    } finally {
      setAddingIp(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl glass-panel-glow rounded-2xl p-5 sm:p-6 border border-cyan-500/30 bg-slate-900 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white tracking-wide flex items-center gap-2">
                Scanner Autêntico de Câmeras & ONVIF
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-medium">
                  v001.000.000.087
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Detecção avançada de câmeras na LAN (AITEK 5MP SEG6050BP, Xiongmai, ONVIF 8899/80, RTSP 8554)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsScannerOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Fechar Janela"
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
              <span className="font-semibold">Sub-rede de Varredura:</span>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1">
                <input
                  type="text"
                  value={subnetInput}
                  onChange={(e) => setSubnetInput(e.target.value)}
                  placeholder="Ex: 192.168.1"
                  className="bg-transparent text-white font-mono text-xs w-24 focus:outline-none"
                />
                <span className="text-slate-500 font-mono text-xs">.0/24</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                disabled={isScanning}
                onClick={handleStartScan}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-obsidian-950" />
                    <span>Varrendo 254 IPs na rede...</span>
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
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedAll ? "Copiados!" : "Copiar IPs"}</span>
                </button>
              )}
            </div>
          </div>

          {scanInfo && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Varredura finalizada em <strong>{scanInfo.duration}s</strong>
              </span>
              <span className="text-slate-400">254 IPs analisados via ARP e sockets ONVIF/RTSP</span>
            </div>
          )}

          {/* Results List */}
          {scanResults.length === 0 && !isScanning ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-2">
              <CameraIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">Nenhuma câmera detectada na sub-rede {subnetInput}.0/24.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Certifique-se de que as câmeras IP estão alimentadas e conectadas ao mesmo switch ou roteador. Clique em <strong>Iniciar Varredura</strong> para pesquisar novamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                <span>Câmeras & Dispositivos de Vídeo Detectados ({scanResults.length})</span>
                <span className="text-[11px] font-normal lowercase text-slate-500">clique em adicionar para vincular ao Sentinela e Frigate NVR</span>
              </div>

              {scanResults.map((dev, idx) => {
                const is5Mp = dev.is_5mp || dev.resolution?.includes("5MP") || dev.friendly_name?.includes("AITEK");
                
                // Verificar se a câmera já está no banco de dados do sistema
                const alreadyRegistered = cameras.find(
                  c => c.ip_address === dev.ip || (dev.rtsp_main && c.rtsp_main?.includes(dev.ip))
                );

                const isCustomExpanded = expandedCustomIp === dev.ip;
                const defaultPort = dev.open_ports?.find(p => p !== 80 && p !== 8899 && p !== 3702)
                  ? String(dev.open_ports.find(p => p !== 80 && p !== 8899 && p !== 3702))
                  : "8554";
                const defaultOnvif = String(dev.onvif_port || (dev.port === 3702 ? 8899 : 80));

                const custom = customForms[dev.ip] || {
                  ip: dev.ip,
                  rtsp_port: defaultPort,
                  onvif_port: defaultOnvif,
                  name: `cam_${dev.ip.replace(/\./g, "_")}`,
                  friendly_name: dev.friendly_name || `Câmera ${dev.ip}`,
                  rtsp_user: "",
                  rtsp_pass: "",
                  rtsp_main: dev.rtsp_main || dev.rtsp_url_hint || buildRtspUrl(dev.ip, defaultPort, "", "", "live"),
                  rtsp_sub: dev.rtsp_sub || "",
                  is_manual_rtsp: false
                };

                const currentDisplayIp = custom.ip || dev.ip;
                const currentDisplayMain = custom.rtsp_main || dev.rtsp_main || dev.rtsp_url_hint;
                const currentDisplaySub = custom.rtsp_sub || dev.rtsp_sub;

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl transition-all border p-4 sm:p-5 space-y-3.5 ${
                      alreadyRegistered
                        ? "bg-slate-950/80 border-slate-800"
                        : is5Mp
                        ? "bg-slate-950/95 border-cyan-500/50 shadow-xl shadow-cyan-950/20"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Header do Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm sm:text-base text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/50">
                            {currentDisplayIp}
                          </span>
                          <button
                            onClick={() => handleCopyText(currentDisplayIp, `ip-${idx}`)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copiar IP"
                          >
                            {copiedItem === `ip-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {custom.friendly_name && (
                          <span className="text-xs sm:text-sm font-semibold text-white">
                            {custom.friendly_name}
                          </span>
                        )}

                        {is5Mp && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold uppercase tracking-wider">
                            5MP Ultra HD
                          </span>
                        )}

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{dev.protocol || "ONVIF / RTSP"}</span>
                        </span>

                        {alreadyRegistered && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                            <span>● Cadastrada: {alreadyRegistered.friendly_name || alreadyRegistered.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Badges de Fabricante e Portas */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        {dev.manufacturer && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            {dev.manufacturer} {dev.model ? `(${dev.model})` : ""}
                          </span>
                        )}
                        {dev.open_ports && dev.open_ports.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                            Portas Abertas: {dev.open_ports.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Features Tags */}
                    {dev.features && dev.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {dev.features.map((feat, fIdx) => (
                          <span
                            key={fIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-800 font-mono"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* URLs RTSP Espaçosas Sem Truncamento */}
                    <div className="space-y-1.5 pt-1">
                      {currentDisplayMain && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-2 overflow-x-auto min-w-0">
                            <span className="text-[11px] font-bold text-cyan-400 shrink-0 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                              Gravação (Main 5MP):
                            </span>
                            <code className="text-xs font-mono text-slate-300 select-all break-all sm:break-normal">
                              {currentDisplayMain}
                            </code>
                          </div>
                          <button
                            onClick={() => handleCopyText(currentDisplayMain || "", `main-${idx}`)}
                            className="self-end sm:self-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 shrink-0 cursor-pointer"
                            title="Copiar URL RTSP Main"
                          >
                            {copiedItem === `main-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedItem === `main-${idx}` ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      )}

                      {currentDisplaySub && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-2 overflow-x-auto min-w-0">
                            <span className="text-[11px] font-bold text-emerald-400 shrink-0 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              IA Detecção (Sub):
                            </span>
                            <code className="text-xs font-mono text-slate-300 select-all break-all sm:break-normal">
                              {currentDisplaySub}
                            </code>
                          </div>
                          <button
                            onClick={() => handleCopyText(currentDisplaySub || "", `sub-${idx}`)}
                            className="self-end sm:self-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 shrink-0 cursor-pointer"
                            title="Copiar URL RTSP Sub"
                          >
                            {copiedItem === `sub-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedItem === `sub-${idx}` ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Gaveta Completa de Edição de Dados */}
                    {isCustomExpanded && (
                      <div className="p-4 rounded-xl bg-slate-900/95 border border-cyan-500/40 space-y-3.5 shadow-lg animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-cyan-400" />
                            <span>Editar Todos os Dados da Câmera (IP, Portas, Nomes e RTSP)</span>
                          </div>
                          {custom.is_manual_rtsp && (
                            <button
                              type="button"
                              onClick={() => handleResetRtspUrl(dev.ip)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer"
                              title="Recalcular RTSP com base no IP e Porta"
                            >
                              Restaurar URL Automática
                            </button>
                          )}
                        </div>

                        {/* Linha 1: IP e Portas */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Endereço IP</label>
                            <input
                              type="text"
                              value={custom.ip}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "ip", e.target.value)}
                              placeholder="192.168.1.6"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-slate-400 font-medium">Porta RTSP</label>
                              {dev.open_ports && dev.open_ports.length > 0 && (
                                <div className="flex gap-1">
                                  {dev.open_ports.map(p => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => handleUpdateCustomField(dev.ip, "rtsp_port", String(p))}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900 cursor-pointer"
                                      title={`Usar porta ${p}`}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={custom.rtsp_port}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "rtsp_port", e.target.value)}
                              placeholder="8554"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Porta ONVIF</label>
                            <input
                              type="text"
                              value={custom.onvif_port}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "onvif_port", e.target.value)}
                              placeholder="80 ou 8899"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Linha 2: Identificação e Credenciais */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Slug Frigate (sem espaços)</label>
                            <input
                              type="text"
                              value={custom.name}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Nome Amigável</label>
                            <input
                              type="text"
                              value={custom.friendly_name}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "friendly_name", e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Usuário RTSP (Opcional)</label>
                            <input
                              type="text"
                              placeholder="admin"
                              value={custom.rtsp_user || ""}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "rtsp_user", e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">Senha RTSP</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={custom.rtsp_pass || ""}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "rtsp_pass", e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        {/* Linha 3: URLs RTSP Customizadas */}
                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                                <span>URL RTSP Main (Gravação / HD 1080p ou 5MP)</span>
                                {custom.is_manual_rtsp && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Manual
                                  </span>
                                )}
                              </label>
                            </div>
                            <input
                              type="text"
                              value={custom.rtsp_main || ""}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "rtsp_main", e.target.value)}
                              placeholder="rtsp://admin:admin@192.168.1.6:8554/live"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1 font-medium">URL RTSP Sub (Detecção IA - Opcional)</label>
                            <input
                              type="text"
                              value={custom.rtsp_sub || ""}
                              onChange={(e) => handleUpdateCustomField(dev.ip, "rtsp_sub", e.target.value)}
                              placeholder="rtsp://admin:admin@192.168.1.6:8554/live/sub"
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-emerald-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mensagem de Erro Específica no Card */}
                    {addError[dev.ip] && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{addError[dev.ip]}</span>
                      </div>
                    )}

                    {/* Barra de Ações do Card */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleCustomDrawer(dev)}
                        className="text-xs text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer py-1"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isCustomExpanded ? "Fechar Personalização" : "Editar Nome / Credenciais"}</span>
                        {isCustomExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <div className="flex items-center gap-2 justify-end">
                        {/* Botão de Teste RTSP */}
                        <button
                          type="button"
                          onClick={() => handleTestRtsp(dev)}
                          disabled={testingIp === dev.ip}
                          className={`px-3 py-2 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                            testResult[dev.ip]?.ok
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                              : testResult[dev.ip]?.ok === false
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                          }`}
                          title="Testar Conectividade RTSP"
                        >
                          {testingIp === dev.ip ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          ) : testResult[dev.ip]?.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : testResult[dev.ip]?.ok === false ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span>{testResult[dev.ip]?.msg || "Testar RTSP"}</span>
                        </button>

                        {/* Botão Principal de Adicionar / Atualizar */}
                        <button
                          type="button"
                          onClick={() => handleAddDirect(dev)}
                          disabled={addingIp === dev.ip || addedSuccess === dev.ip}
                          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                            addedSuccess === dev.ip
                              ? "bg-emerald-500 text-obsidian-950 shadow-emerald-500/30"
                              : alreadyRegistered
                              ? "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30"
                              : is5Mp
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-obsidian-950 shadow-cyan-500/30"
                              : "bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 shadow-cyan-500/20"
                          }`}
                        >
                          {addedSuccess === dev.ip ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-obsidian-950" />
                              <span>{alreadyRegistered ? "Atualizada!" : "Câmera Adicionada!"}</span>
                            </>
                          ) : addingIp === dev.ip ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-obsidian-950" />
                              <span>Sincronizando com Frigate...</span>
                            </>
                          ) : alreadyRegistered ? (
                            <>
                              <Check className="w-4 h-4 text-cyan-400" />
                              <span>Sincronizar Novamente</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>{is5Mp ? "Adicionar Câmera 5MP" : "Adicionar Câmera"}</span>
                            </>
                          )}
                        </button>
                      </div>
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
