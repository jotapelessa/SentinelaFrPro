"use client";

import React, { useState } from "react";
import { Camera } from "@/store/useSentinelaStore";
import { X, Settings, Wifi, Eye, HardDrive, Bell, Save, Trash2, Check, User, Car, Zap, Shield, Sparkles } from "lucide-react";
import { ZoneCanvasModal, ZoneItem } from "./ZoneCanvasModal";

interface CameraConfigModalProps {
  camera: Camera;
  onClose: () => void;
  onSaved: () => void;
}

export const CameraConfigModal: React.FC<CameraConfigModalProps> = ({ camera, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<"conn" | "ai" | "record" | "alerts">("conn");
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);


  // Form State
  const [friendlyName, setFriendlyName] = useState(camera.friendly_name || camera.name);
  const [rtspMain, setRtspMain] = useState(camera.rtsp_main);
  const [rtspSub, setRtspSub] = useState(camera.rtsp_sub || "");
  const [ipAddress, setIpAddress] = useState(camera.ip_address || "");
  const [onvifPort, setOnvifPort] = useState(camera.onvif_port || 80);
  const [enabled, setEnabled] = useState(camera.enabled ?? true);

  // AI & Detection State
  const initialObjects: string[] = camera.objects_to_track
    ? (typeof camera.objects_to_track === "string" ? JSON.parse(camera.objects_to_track || "[]") : camera.objects_to_track)
    : ["person", "car", "motorcycle", "dog"];
  const [trackedObjects, setTrackedObjects] = useState<string[]>(initialObjects);
  const [minScore, setMinScore] = useState(camera.min_score ? Math.round(camera.min_score * 100) : 70);

  // Recording State
  const [recordMode, setRecordMode] = useState(camera.record_mode || "motion");
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
          record_mode: recordMode,
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
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/cameras/${camera.id}`, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
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
                <label className="block text-slate-300 font-bold mb-1">Fluxo RTSP Principal (High-Res):</label>
                <input
                  type="text"
                  value={rtspMain}
                  onChange={(e) => setRtspMain(e.target.value)}
                  placeholder="Ex: rtsp://192.168.1.6:8554/stream"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500">Usado para gravação de alta definição e visualização ao vivo.</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Fluxo RTSP Substream (Opcional / Detecção Leve):</label>
                <input
                  type="text"
                  value={rtspSub}
                  onChange={(e) => setRtspSub(e.target.value)}
                  placeholder="Ex: rtsp://192.168.1.6:8554/substream"
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

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Sensibilidade Mínima (Threshold de Confiança):</label>
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

              {/* Interactive ROI Zones & Masks Button */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <strong className="text-cyan-300 block font-bold">Editor Visual de Zonas & Máscaras (ROI):</strong>
                  <span className="text-[10px] text-slate-400">Desenhe polígonos de alerta e áreas de movimento ignoradas na imagem ao vivo.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Desenhar Zonas</span>
                </button>
              </div>
            </div>
          )}


          {/* TAB 3: GRAVAÇÃO & RETENÇÃO */}
          {activeTab === "record" && (
            <div className="space-y-4">
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

