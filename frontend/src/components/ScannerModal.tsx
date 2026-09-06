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

  // Customization drawer per device
  const [expandedCustomIp, setExpandedCustomIp] = useState<string | null>(null);
  const [customForms, setCustomForms] = useState<{
    [ip: string]: {
      name: string;
      friendly_name: string;
      rtsp_user?: string;
      rtsp_pass?: string;
      rtsp_main?: string;
      rtsp_sub?: string;
    }
  }>({});

  if (!isScannerOpen) return null;

  const handleTestRtsp = async (dev: DiscoveredDevice) => {
    setTestingIp(dev.ip);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const custom = customForms[dev.ip];
      let rtspUrl = custom?.rtsp_main || dev.rtsp_main || dev.rtsp_url_hint || `rtsp://${dev.ip}:554/live/ch0`;

      // Apply credentials if customized
      if (custom?.rtsp_user && custom?.rtsp_pass && !rtspUrl.includes("@")) {
        rtspUrl = rtspUrl.replace("rtsp://", `rtsp://${encodeURIComponent(custom.rtsp_user)}:${encodeURIComponent(custom.rtsp_pass)}@`);
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
        setCustomForms(prev => ({
          ...prev,
          [dev.ip]: {
            name: cleanName,
            friendly_name: dev.friendly_name || `Câmera ${dev.ip}`,
            rtsp_user: "",
            rtsp_pass: "",
            rtsp_main: dev.rtsp_main || dev.rtsp_url_hint || `rtsp://${dev.ip}:554/live/ch0`,
            rtsp_sub: dev.rtsp_sub || (dev.is_5mp ? `rtsp://${dev.ip}:554/live/ch1` : "")
          }
        }));
      }
    }
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
      
      const camName = (custom?.name || `cam_${dev.ip.replace(/\./g, "_")}`).trim();
      let mainUrl = (custom?.rtsp_main || dev.rtsp_main || dev.rtsp_url_hint || `rtsp://${dev.ip}:554/live/ch0`).trim();
      let subUrl = (custom?.rtsp_sub || dev.rtsp_sub || (dev.is_5mp ? `rtsp://${dev.ip}:554/live/ch1` : "")).trim() || undefined;

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
        friendly_name: (custom?.friendly_name || dev.friendly_name || `Câmera (${dev.ip})`).trim(),
        rtsp_main: mainUrl,
        rtsp_sub: subUrl,
        ip_address: dev.ip,
        onvif_port: dev.onvif_port || (dev.port === 3702 ? 8899 : 80),
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
                Detecção avançada de câmeras na LAN (AITEK 5MP SEG6050BP, Xiongmai, ONVIF 8899/80, RTSP 554)
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
                const custom = customForms[dev.ip] || {
                  name: `cam_${dev.ip.replace(/\./g, "_")}`,
                  friendly_name: dev.friendly_name || `Câmera ${dev.ip}`,
                  rtsp_user: "",
                  rtsp_pass: "",
                  rtsp_main: dev.rtsp_main || dev.rtsp_url_hint || `rtsp://${dev.ip}:554/live/ch0`,
                  rtsp_sub: dev.rtsp_sub || (dev.is_5mp ? `rtsp://${dev.ip}:554/live/ch1` : "")
                };

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
                            {dev.ip}
                          </span>
                          <button
                            onClick={() => handleCopyText(dev.ip, `ip-${idx}`)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copiar IP"
                          >
                            {copiedItem === `ip-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {dev.friendly_name && (
                          <span className="text-xs sm:text-sm font-semibold text-white">
                            {dev.friendly_name}
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
                            Portas: {dev.open_ports.join(", ")}
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
                      {dev.rtsp_main && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-2 overflow-x-auto min-w-0">
                            <span className="text-[11px] font-bold text-cyan-400 shrink-0 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                              Gravação (Main 5MP):
                            </span>
                            <code className="text-xs font-mono text-slate-300 select-all break-all sm:break-normal">
                              {dev.rtsp_main}
                            </code>
                          </div>
                          <button
                            onClick={() => handleCopyText(dev.rtsp_main || "", `main-${idx}`)}
                            className="self-end sm:self-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 shrink-0 cursor-pointer"
                            title="Copiar URL RTSP Main"
                          >
                            {copiedItem === `main-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedItem === `main-${idx}` ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      )}

                      {dev.rtsp_sub && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-2 overflow-x-auto min-w-0">
                            <span className="text-[11px] font-bold text-emerald-400 shrink-0 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                              IA Detecção (Sub):
                            </span>
                            <code className="text-xs font-mono text-slate-300 select-all break-all sm:break-normal">
                              {dev.rtsp_sub}
                            </code>
                          </div>
                          <button
                            onClick={() => handleCopyText(dev.rtsp_sub || "", `sub-${idx}`)}
                            className="self-end sm:self-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 shrink-0 cursor-pointer"
                            title="Copiar URL RTSP Sub"
                          >
                            {copiedItem === `sub-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedItem === `sub-${idx}` ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      )}

                      {!dev.rtsp_main && dev.rtsp_url_hint && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 shrink-0">
                              Stream RTSP Sugerido:
                            </span>
                            <code className="text-xs font-mono text-slate-300 select-all break-all sm:break-normal">
                              {dev.rtsp_url_hint}
                            </code>
                          </div>
                          <button
                            onClick={() => handleCopyText(dev.rtsp_url_hint || "", `hint-${idx}`)}
                            className="self-end sm:self-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 shrink-0 cursor-pointer"
                          >
                            {copiedItem === `hint-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedItem === `hint-${idx}` ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Gaveta Opcional de Personalização */}
                    {isCustomExpanded && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-3 animate-in fade-in duration-150">
                        <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                          <Settings2 className="w-4 h-4" />
                          <span>Personalizar Dados Antes de Adicionar</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-400 mb-1">Identificador Único (slug sem espaços)</label>
                            <input
                              type="text"
                              value={custom.name}
                              onChange={(e) => setCustomForms(prev => ({
                                ...prev,
                                [dev.ip]: { ...custom, name: e.target.value }
                              }))}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Nome Amigável de Exibição</label>
                            <input
                              type="text"
                              value={custom.friendly_name}
                              onChange={(e) => setCustomForms(prev => ({
                                ...prev,
                                [dev.ip]: { ...custom, friendly_name: e.target.value }
                              }))}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Usuário RTSP (Opcional se tiver senha)</label>
                            <input
                              type="text"
                              placeholder="admin"
                              value={custom.rtsp_user}
                              onChange={(e) => setCustomForms(prev => ({
                                ...prev,
                                [dev.ip]: { ...custom, rtsp_user: e.target.value }
                              }))}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Senha RTSP</label>
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={custom.rtsp_pass}
                              onChange={(e) => setCustomForms(prev => ({
                                ...prev,
                                [dev.ip]: { ...custom, rtsp_pass: e.target.value }
                              }))}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
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
