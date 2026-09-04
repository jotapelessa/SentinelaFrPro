"use client";

import React, { useState, useEffect } from "react";
import { Camera } from "@/store/useSentinelaStore";
import { 
  X, Settings, Wifi, Eye, HardDrive, Bell, Save, Trash2, Check, 
  User, Car, Zap, Shield, Sparkles, Sliders, Activity, Terminal, 
  Copy, RefreshCw, AlertTriangle, Play, Pause, CheckCircle2, History, Search
} from "lucide-react";

import { ZoneCanvasModal, ZoneItem } from "./ZoneCanvasModal";

interface CameraConfigModalProps {
  camera: Camera;
  onClose: () => void;
  onSaved: () => void;
}

export const CameraConfigModal: React.FC<CameraConfigModalProps> = ({ camera, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<"conn" | "ai" | "record" | "alerts" | "diag">("conn");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [testingRtsp, setTestingRtsp] = useState(false);
  const [rtspTestResult, setRtspTestResult] = useState<{ success: boolean; message: string; suggested_port?: number; suggested_url?: string } | null>(null);

  // Diagnostics State
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [diagData, setDiagData] = useState<any>(null);
  const [togglingFallback, setTogglingFallback] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [logFilter, setLogFilter] = useState("");

  // Form State
  const [friendlyName, setFriendlyName] = useState(camera.friendly_name || camera.name);
  const [rtspMain, setRtspMain] = useState(camera.rtsp_main);
  const [rtspSub, setRtspSub] = useState(camera.rtsp_sub || "");
  const [ipAddress, setIpAddress] = useState(camera.ip_address || "");
  const [onvifPort, setOnvifPort] = useState(camera.onvif_port || 80);
  const [enabled, setEnabled] = useState(camera.enabled ?? true);

  const fetchDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camId = camera.id || camera.name || "camera_principal";
      const res = await fetch(`${apiUrl}/cameras/${camId}/diagnostics`);
      if (res.ok) {
        const data = await res.json();
        setDiagData(data);
      }
    } catch (err) {
      console.error("Error fetching diagnostics:", err);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    if (activeTab === "diag") {
      fetchDiagnostics();
    }
  }, [activeTab]);

  const handleToggleFallback = async () => {
    setTogglingFallback(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camId = camera.id || camera.name || "camera_principal";
      const res = await fetch(`${apiUrl}/cameras/${camId}/toggle-fallback`, { method: "POST" });
      if (res.ok) {
        await fetchDiagnostics();
        onSaved();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingFallback(false);
    }
  };

  const handleCopyLogs = () => {
    if (!diagData?.logs?.length) return;
    navigator.clipboard.writeText(diagData.logs.join("\n"));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleTestRtsp = async () => {
    if (!rtspMain) return;
    setTestingRtsp(true);
    setRtspTestResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/cameras/test-rtsp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtsp_url: rtspMain })
      });
      const data = await res.json();
      setRtspTestResult(data);
    } catch (err: any) {
      setRtspTestResult({ success: false, message: `Erro ao conectar com API: ${err.message}` });
    } finally {
      setTestingRtsp(false);
    }
  };

  const applyPortFix = () => {
    if (rtspTestResult?.suggested_url) {
      setRtspMain(rtspTestResult.suggested_url);
      setRtspTestResult(null);
    }
  };

  // AI & Detection State
  const initialObjects: string[] = camera.objects_to_track
    ? (typeof camera.objects_to_track === "string" ? JSON.parse(camera.objects_to_track || "[]") : camera.objects_to_track)
    : ["person", "car", "motorcycle", "dog"];
  const [trackedObjects, setTrackedObjects] = useState<string[]>(initialObjects);
  const [minScore, setMinScore] = useState(camera.min_score ? Math.round(camera.min_score * 100) : 70);
  const [detectFps, setDetectFps] = useState(camera.detect_fps || 5);
  const [motionThreshold, setMotionThreshold] = useState(camera.motion_threshold || 25);

  // Recording & Streaming State
  const [recordMode, setRecordMode] = useState(camera.record_mode || "motion");
  const [streamMode, setStreamMode] = useState(camera.stream_mode || "webrtc");
  const [ecoFps, setEcoFps] = useState(camera.eco_fps || 10);
  const [recordFps, setRecordFps] = useState(camera.record_fps || 24);
  const [retainDays, setRetainDays] = useState(camera.record_retain_days || 14);
  const [recordAudio, setRecordAudio] = useState(camera.record_audio ?? false);

  // Notifications State
  const [notifyTelegram, setNotifyTelegram] = useState(camera.notify_telegram ?? true);
  const [notifyTv, setNotifyTv] = useState(camera.notify_tv ?? true);
  const [notifyAudio, setNotifyAudio] = useState(camera.notify_audio ?? true);
  const [cooldown, setCooldown] = useState(camera.cooldown_seconds || 10);

  const toggleObject = (obj: string) => {
    setTrackedObjects(prev => 
      prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camIdentifier = camera.id || camera.name || "camera_principal";
      const res = await fetch(`${apiUrl}/cameras/${camIdentifier}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendly_name: friendlyName,
          rtsp_main: rtspMain,
          rtsp_sub: rtspSub || null,
          ip_address: ipAddress || null,
          onvif_port: onvifPort,
          enabled: enabled,
          objects_to_track: JSON.stringify(trackedObjects),
          min_score: minScore / 100,
          detect_fps: detectFps,
          motion_threshold: motionThreshold,
          record_mode: recordMode,
          stream_mode: streamMode,
          eco_fps: ecoFps,
          record_fps: recordFps,
          record_retain_days: retainDays,
          record_audio: recordAudio,
          notify_telegram: notifyTelegram,
          notify_tv: notifyTv,
          notify_audio: notifyAudio,
          cooldown_seconds: cooldown
        })
      });

      if (res.ok) {
        setStatusMsg("✅ Configurações salvas com sucesso!");
        onSaved();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setStatusMsg(`⚠️ Erro ao salvar: ${errJson.detail || "Falha no servidor"}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("⚠️ Falha de comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async () => {
    if (!confirm(`Deseja realmente remover a câmera "${friendlyName}"?`)) return;
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camIdentifier = camera.id || camera.name || "camera_principal";
      const res = await fetch(`${apiUrl}/cameras/${camIdentifier}`, { method: "DELETE" });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(`Erro ao remover: ${errJson.detail || "Falha no servidor"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Falha de comunicação ao remover câmera.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Configuração da Câmera: <span className="text-cyan-400">{friendlyName}</span>
              </h2>
              <p className="text-[11px] font-mono text-slate-400">ID: {camera.name} | IP: {ipAddress || "N/A"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/60 px-4 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("conn")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === "conn" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>1. Conexão & Rede</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === "ai" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>2. IA & Detecção Frigate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("record")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === "record" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>3. Gravação & Retenção</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === "alerts" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>4. Canais de Alerta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diag")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === "diag" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>5. Logs & Diagnóstico</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {statusMsg && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* TAB 1: CONEXÃO & REDE */}
          {activeTab === "conn" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome de Exibição Amigável:</label>
                <input
                  type="text"
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  placeholder="Ex: Portão da Frente, Garagem Principal"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">Fluxo RTSP Principal (High-Res):</label>
                  <button
                    type="button"
                    onClick={handleTestRtsp}
                    disabled={testingRtsp || !rtspMain}
                    className="px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500 hover:text-obsidian-950 font-bold text-[10px] transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testingRtsp ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Zap className="w-3 h-3 text-cyan-400" />
                    )}
                    <span>{testingRtsp ? "Testando..." : "Testar Conexão RTSP"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={rtspMain}
                  onChange={(e) => setRtspMain(e.target.value)}
                  placeholder="Ex: rtsp://192.168.1.6:554/stream ou rtsp://admin:senha@192.168.1.6:554/live/ch0"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                {rtspTestResult && (
                  <div className={`mt-2 p-2.5 rounded-lg text-[11px] border font-medium flex items-center gap-2 ${
                    rtspTestResult.success 
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}>
                    <span>{rtspTestResult.success ? "🟢" : "🔴"}</span>
                    <span>{rtspTestResult.message}</span>
                  </div>
                )}
                {rtspTestResult?.suggested_url && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-[11px] font-semibold">Porta {rtspTestResult.suggested_port} detectada aberta no IP da câmera!</span>
                    </div>
                    <button
                      type="button"
                      onClick={applyPortFix}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-bold text-xs flex items-center gap-1 shrink-0 shadow transition-all"
                    >
                      <span>✨ Corrigir para Porta 554</span>
                    </button>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 block mt-1">Usado para gravação de alta definição e detecção com aceleração por hardware Intel Jasper Lake.</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Fluxo RTSP Substream (Opcional / Detecção Leve):</label>
                <input
                  type="text"
                  value={rtspSub}
                  onChange={(e) => setRtspSub(e.target.value)}
                  placeholder="Ex: rtsp://192.168.1.6:554/substream"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Endereço IP Local:</label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="Ex: 192.168.1.6"
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Porta ONVIF / PTZ:</label>
                  <input
                    type="number"
                    value={onvifPort}
                    onChange={(e) => setOnvifPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-slate-300">Câmera Ativa no Mosaico:</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 2: IA & DETECÇÃO */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-2">Objetos Monitorados nesta Câmera:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "person", label: "Pessoa (Intrusão)" },
                    { id: "car", label: "Carro" },
                    { id: "motorcycle", label: "Motocicleta" },
                    { id: "dog", label: "Cachorro" },
                    { id: "cat", label: "Gato" },
                    { id: "bicycle", label: "Bicicleta" }
                  ].map((item) => {
                    const isChecked = trackedObjects.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleObject(item.id)}
                        className={`p-2.5 rounded-xl border text-left font-semibold transition-all flex items-center justify-between ${
                          isChecked ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        {isChecked && <Check className="w-4 h-4 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Taxa de Detecção IA (Detector FPS) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Taxa de Detecção do Detector OpenVINO IA:</label>
                  <span className="text-xs font-mono font-bold text-cyan-400">{detectFps} FPS</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 7, 10].map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setDetectFps(fps)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all ${
                        detectFps === fps ? "bg-cyan-500 text-obsidian-950 border-cyan-400 shadow-md shadow-cyan-500/20" : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      {fps} FPS {fps === 5 ? "(Padrão)" : fps === 7 ? "(Rápido)" : "(Ultra-Rápido)"}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Determina com que frequência a IA analisa novos quadros por segundo. 10 FPS proporciona resposta instantânea para detecção de veículos rápidos.
                </span>
              </div>

              {/* Sensibilidade do Sensor de Movimento */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Sensibilidade do Sensor de Movimento (Motion Threshold):</label>
                  <span className="font-mono font-black text-cyan-400 text-sm">{motionThreshold} {motionThreshold <= 20 ? "(Ultra-Sensível)" : motionThreshold <= 30 ? "(Equilibrado)" : "(Tolerante)"}</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  step={5}
                  value={motionThreshold}
                  onChange={(e) => setMotionThreshold(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Limiar de variação de pixels. Valores menores (15-20) disparam com o menor movimento; valores maiores (35-50) ignoram pequenas variações.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Confiança Mínima de Classificação IA:</label>
                  <span className="font-mono font-black text-cyan-400 text-sm">{minScore}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={5}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Valores mais altos (ex: 75%+) reduzem falsos positivos. Valores mais baixos aumentam a sensibilidade.
                </span>
              </div>

              {/* Dual ROI Zones & Masks Options */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div>
                  <strong className="text-cyan-300 block font-bold text-sm">Zonas & Máscaras de Detecção (Frigate NVR):</strong>
                  <span className="text-[10px] text-slate-400">Configure perímetros de invasão (Zonas) ou ignore árvores e reflexos (Máscaras).</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsZoneModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>🎨 Editor Visual Sentinela</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
                      const camName = camera.name || "camera_principal";
                      window.open(`http://${host}:5000/cameras/${camName}/zones`, "_blank");
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span>🎯 Estúdio Oficial Frigate ↗</span>
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GRAVAÇÃO & TRANSMISSÃO */}
          {activeTab === "record" && (
            <div className="space-y-4">
              {/* Modo de Transmissão ao Vivo */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-slate-300 font-bold">Modo Padrão de Visualização Ao Vivo:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStreamMode("eco")}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      streamMode === "eco" || streamMode === "monitor" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300" : "bg-slate-800/80 border-slate-700 text-slate-400"
                    }`}
                  >
                    <strong className="block text-white font-bold text-xs">Eco - Sync Total</strong>
                    <span className="text-[9px] text-slate-400">Zero delay acumulado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStreamMode("mse")}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      streamMode === "mse" ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300" : "bg-slate-800/80 border-slate-700 text-slate-400"
                    }`}
                  >
                    <strong className="block text-white font-bold text-xs">MSE (24 FPS)</strong>
                    <span className="text-[9px] text-slate-400">Fluxo contínuo fluido</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStreamMode("webrtc")}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      streamMode === "webrtc" ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300" : "bg-slate-800/80 border-slate-700 text-slate-400"
                    }`}
                  >
                    <strong className="block text-white font-bold text-xs">WebRTC (&lt;50ms)</strong>
                    <span className="text-[9px] text-slate-400">Ultra-baixa latência</span>
                  </button>
                </div>

                {/* Eco FPS Selection */}
                {(streamMode === "eco" || streamMode === "monitor") && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="text-slate-300 font-bold block mb-1.5 text-[11px]">Taxa de Quadros do Modo Eco:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 15].map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => setEcoFps(fps)}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                            ecoFps === fps ? "bg-emerald-500 text-obsidian-950 border-emerald-400 shadow-md shadow-emerald-500/20" : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                          }`}
                        >
                          {fps} FPS {fps === 5 ? "(Econômico)" : fps === 10 ? "(Equilibrado)" : "(Fluido)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Taxa de Gravação de Vídeo */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Taxa de Quadros da Gravação (FPS):</label>
                  <span className="text-xs font-mono font-bold text-cyan-400">{recordFps} FPS</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[24, 30].map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setRecordFps(fps)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                        recordFps === fps ? "bg-cyan-500 text-obsidian-950 border-cyan-400 shadow-md shadow-cyan-500/20" : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      {fps} FPS {fps === 24 ? "(Recomendado / 24 FPS)" : "(Máximo / 30 FPS)"}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">Garante que as gravações de vídeo no Frigate e no SSD sejam suaves e sem travamentos.</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-2">Modo de Gravação no SSD NVMe:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecordMode("motion")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      recordMode === "motion" ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    <strong className="block text-white font-bold mb-0.5">Apenas Detecções & Eventos</strong>
                    <span className="text-[10px] text-slate-400">Economiza espaço no SSD gravando clipes apenas quando detectar movimento ou pessoas.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecordMode("all")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      recordMode === "all" ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    <strong className="block text-white font-bold mb-0.5">Gravação Contínua 24/7</strong>
                    <span className="text-[10px] text-slate-400">Grava todas as 24 horas ininterruptamente (consome mais espaço de SSD).</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Retenção de Gravações (Dias):</label>
                  <span className="font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded">{retainDays} dias</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={60}
                  step={1}
                  value={retainDays}
                  onChange={(e) => setRetainDays(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <strong className="text-white block">Gravar Áudio da Câmera:</strong>
                  <span className="text-[10px] text-slate-500">Inclui a faixa de microfone da câmera nos clipes MP4.</span>
                </div>
                <input
                  type="checkbox"
                  checked={recordAudio}
                  onChange={(e) => setRecordAudio(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: CANAIS DE ALERTA */}
          {activeTab === "alerts" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <strong className="text-white block">Enviar Fotos para o Telegram:</strong>
                  <span className="text-[10px] text-slate-500">Dispara foto com marca d&apos;água HUD em &lt;1.2s no seu Telegram.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <strong className="text-white block">Projetar Picture-in-Picture na TV:</strong>
                  <span className="text-[10px] text-slate-500">Exibe pop-up flutuante na Smart TV TCL da sala.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyTv}
                  onChange={(e) => setNotifyTv(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <strong className="text-white block">Tocar Som Chime no Navegador:</strong>
                  <span className="text-[10px] text-slate-500">Emite sinal sonoro quando a janela estiver aberta no PC.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyAudio}
                  onChange={(e) => setNotifyAudio(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <strong className="text-white block">Intervalo Anti-Flood (Cooldown):</strong>
                  <span className="text-[10px] text-slate-500">Tempo mínimo entre alertas consecutivos desta câmera.</span>
                </div>
                <select
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                >
                  <option value={5}>5 segundos</option>
                  <option value={10}>10 segundos</option>
                  <option value={30}>30 segundos</option>
                  <option value={60}>60 segundos</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 5: LOGS & DIAGNÓSTICO */}
          {activeTab === "diag" && (
            <div className="space-y-4">
              {/* Health Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs">Saúde do Pipeline em Tempo Real</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDiagnostics}
                    disabled={loadingDiag}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDiag ? "animate-spin text-cyan-400" : ""}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Estado do Stream</span>
                    <span className={`text-xs font-black flex items-center gap-1.5 mt-0.5 ${
                      diagData?.health?.status === "online" 
                        ? "text-emerald-400" 
                        : diagData?.health?.status === "fallback" 
                        ? "text-amber-400" 
                        : "text-rose-400"
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      {diagData?.health?.status === "online" ? "ONLINE" : diagData?.health?.status === "fallback" ? "FALLBACK VIRTUAL" : "OFFLINE"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">FPS da Câmera</span>
                    <span className="text-xs font-mono font-bold text-cyan-300 block mt-0.5">
                      {diagData?.health?.camera_fps ?? 0} fps
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">FPS de Detecção</span>
                    <span className="text-xs font-mono font-bold text-purple-300 block mt-0.5">
                      {diagData?.health?.detection_fps ?? 0} fps
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">FFmpeg PID</span>
                    <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                      {diagData?.health?.pid ? `#${diagData.health.pid}` : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Virtual Fallback Mode Switch */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-950 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <strong className="text-amber-300 text-xs font-bold">Modo Stream Virtual de Teste (SMPTE)</strong>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Gera um stream sintético 720p diretamente no go2rtc para evitar loops de 404 e testar IA quando a câmera estiver fora do ar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleFallback}
                  disabled={togglingFallback}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 shadow-lg flex items-center gap-1.5 transition-all ${
                    diagData?.is_fallback 
                      ? "bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 shadow-emerald-500/20" 
                      : "bg-amber-500 hover:bg-amber-400 text-obsidian-950 shadow-amber-500/20"
                  }`}
                >
                  {togglingFallback ? (
                    <span className="animate-spin">⏳</span>
                  ) : diagData?.is_fallback ? (
                    <Play className="w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {togglingFallback 
                      ? "Alternando..." 
                      : diagData?.is_fallback 
                      ? "Restaurar RTSP Real" 
                      : "Ativar Stream Virtual"}
                  </span>
                </button>
              </div>

              {/* Live Log Terminal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-200 text-xs">Logs Recentes do Frigate / FFmpeg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="Filtrar logs..."
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value)}
                        className="pl-6 pr-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-[10px] focus:outline-none focus:border-cyan-500 w-28 sm:w-36"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLogs}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Copy className="w-3 h-3 text-cyan-400" />
                      <span>{copiedLogs ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] max-h-48 overflow-y-auto space-y-1 select-text">
                  {diagData?.logs?.length ? (
                    diagData.logs
                      .filter((l: string) => !logFilter || l.toLowerCase().includes(logFilter.toLowerCase()))
                      .map((log: string, idx: number) => {
                        const isError = log.includes("ERROR") || log.includes("404") || log.includes("refused");
                        const isWarn = log.includes("WARNING") || log.includes("WRN");
                        const isSuccess = log.includes("INFO") || log.includes("OK") || log.includes("started");
                        return (
                          <div 
                            key={idx} 
                            className={`leading-relaxed break-all ${
                              isError ? "text-rose-400" : isWarn ? "text-amber-300" : isSuccess ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {log}
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-slate-500 py-4 text-center">Nenhum registro recente encontrado para esta câmera.</div>
                  )}
                </div>
              </div>

              {/* Audit History Timeline */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-200 text-xs">Trilha de Auditoria & Alterações</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 max-h-36 overflow-y-auto">
                  {diagData?.audit_history?.length ? (
                    diagData.audit_history.map((audit: any) => (
                      <div key={audit.id} className="flex items-start justify-between text-[10px] border-b border-slate-800/60 pb-1.5 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                          <span className="font-bold text-cyan-300 block">{audit.action}</span>
                          <span className="text-slate-400">{audit.details}</span>
                        </div>
                        <span className="text-slate-500 font-mono shrink-0 ml-2">{audit.created_at}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-[10px] text-center py-2">Nenhuma alteração registrada recentemente.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Câmera</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Salvando..." : "Salvar Configurações"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {isZoneModalOpen && (
        <ZoneCanvasModal
          camera={camera}
          onClose={() => setIsZoneModalOpen(false)}
          onSaved={() => {
            onSaved();
          }}
        />
      )}
    </div>
  );
};

