"use client";

import React, { useState, useEffect } from "react";
import { WebRTCPlayer } from "./WebRTCPlayer";
import { TimelinePlayback } from "./TimelinePlayback";
import { useSentinelaStore, Camera } from "@/store/useSentinelaStore";
import { Grid, Maximize, Video, ShieldAlert, RefreshCw, Plus, User, Car, Zap, X, Search, Check, Volume2, VolumeX } from "lucide-react";

export const CameraMosaic: React.FC = () => {
  const {
    cameras,
    setCameras,
    spotlightCamera,
    setSpotlightCamera,
    events,
    activeDetections,
    audioAlertEnabled,
    toggleAudioAlert
  } = useSentinelaStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [scanningONVIF, setScanningONVIF] = useState(false);
  const [discoveredCams, setDiscoveredCams] = useState<any[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>("Gravação NVMe");
  const [formCam, setFormCam] = useState({
    name: "",
    friendly_name: "",
    rtsp_main: "rtsp://192.168.1.",
    ip_address: ""
  });
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [syncingFrigate, setSyncingFrigate] = useState(false);

  const fetchCameras = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/cameras`);
      if (res.ok) {
        const data = await res.json();
        setCameras(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching cameras:", e);
    }
  };

  const handleSyncFrigate = async () => {
    setSyncingFrigate(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      await fetch(`${apiUrl}/cameras/sync-frigate`, { method: "POST" });
      await fetchCameras();
    } catch (err) {
      console.error("Erro ao sincronizar com Frigate:", err);
    } finally {
      setSyncingFrigate(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleScanONVIF = async () => {
    setScanningONVIF(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/scanner/run`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredCams(data.devices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanningONVIF(false);
    }
  };

  const handleSelectDiscovered = (dev: any) => {
    setFormCam({
      name: `cam_${dev.ip.replace(/\./g, "_")}`,
      friendly_name: `Câmera (${dev.ip})`,
      rtsp_main: dev.rtsp_url_hint || `rtsp://${dev.ip}:554/live/ch0`,
      ip_address: dev.ip
    });
  };

  const handleSaveCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/cameras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formCam)
      });
      if (res.ok) {
        setAddMessage("✅ Câmera adicionada com sucesso!");
        await fetchCameras();
        setTimeout(() => {
          setIsAddModalOpen(false);
          setAddMessage(null);
          setFormCam({ name: "", friendly_name: "", rtsp_main: "rtsp://192.168.1.", ip_address: "" });
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeCount = Object.keys(activeDetections).length;
  const totalPersons = events.filter(e => e.label === "person").length;
  const totalVehicles = events.filter(e => e.label === "car" || e.label === "motorcycle").length;

  return (
    <section className="w-full space-y-4">
      {/* Mosaic Header Bar & Live Counters HUD */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? "bg-rose-500 animate-ping shadow-lg shadow-rose-500/50" : "bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50"}`} />
            <span className="text-xs font-mono font-bold text-slate-200">
              {cameras.length} {cameras.length === 1 ? "Câmera Ativa" : "Câmeras Ativas"}
            </span>
          </div>

          {/* Quick HUD Badges */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>{activeCount} {activeCount === 1 ? "Alerta IA Ativo" : "Alertas IA Ativos"}</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-bold flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{totalPersons} Pessoas</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1">
              <Car className="w-3 h-3" />
              <span>{totalVehicles} Veículos</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio Chime Alarm Toggle */}
          <button
            onClick={toggleAudioAlert}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              audioAlertEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={audioAlertEnabled ? "Sirene de Alerta Web Ativada" : "Sirene de Alerta Silenciada"}
          >
            {audioAlertEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioAlertEnabled ? "Som Ativo" : "Mudo"}</span>
          </button>

          <button
            onClick={handleSyncFrigate}
            disabled={syncingFrigate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-50"
            title="Sincronizar todas as câmeras diretamente com o Frigate NVR"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingFrigate ? "animate-spin text-cyan-400" : ""}`} />
            <span>{syncingFrigate ? "Sincronizando..." : "Sincronizar Frigate"}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Câmera</span>
          </button>

          {spotlightCamera && (
            <button
              onClick={() => setSpotlightCamera(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Mosaico</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {cameras.length === 0 && (
        <div className="p-12 text-center rounded-2xl glass-panel border border-slate-800 space-y-4 bg-slate-950/40">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Nenhuma Câmera Ativa Encontrada</h3>
            <p className="text-xs text-slate-400">
              Sincronize com as câmeras já configuradas no Frigate NVR ou utilize o Scanner ONVIF para encontrar novas fontes na rede.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={handleSyncFrigate}
              disabled={syncingFrigate}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingFrigate ? "animate-spin" : ""}`} />
              <span>{syncingFrigate ? "Sincronizando..." : "Sincronizar Câmeras do Frigate"}</span>
            </button>
            <button
              onClick={() => {
                setIsAddModalOpen(true);
                handleScanONVIF();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Escanear Rede (ONVIF)</span>
            </button>
          </div>
        </div>
      )}

      {/* Cameras View (Spotlight vs Grid) */}
      {cameras.length > 0 && (
        spotlightCamera ? (
          <div className="w-full space-y-3">
            <WebRTCPlayer
              camera={spotlightCamera}
              isSpotlight={true}
              onToggleSpotlight={() => setSpotlightCamera(null)}
              onCameraUpdated={fetchCameras}
            />
            <TimelinePlayback
              camera={spotlightCamera}
              onOpenClip={(url, title) => {
                setSelectedVideoUrl(url);
                setSelectedVideoTitle(title);
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`grid gap-4 ${cameras.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {cameras.map((camera) => (
                <WebRTCPlayer
                  key={camera.id || camera.name}
                  camera={camera}
                  isSpotlight={cameras.length === 1}
                  onToggleSpotlight={() => setSpotlightCamera(camera)}
                  onCameraUpdated={fetchCameras}
                />
              ))}
            </div>

            <TimelinePlayback
              camera={cameras[0]}
              onOpenClip={(url, title) => {
                setSelectedVideoUrl(url);
                setSelectedVideoTitle(title);
              }}
            />
          </div>
        )
      )}

      {/* MP4 Timeline Video Playback Modal */}
      {selectedVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">{selectedVideoTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={selectedVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Seu navegador não suporta reprodução de vídeo HTML5.
              </video>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Fechar Vídeo
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal Adicionar Câmera / Scanner ONVIF */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                Adicionar Nova Câmera de Segurança
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick ONVIF Discovery */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Scanner ONVIF Automático</span>
                <button
                  type="button"
                  disabled={scanningONVIF}
                  onClick={handleScanONVIF}
                  className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Search className={`w-3 h-3 ${scanningONVIF ? "animate-spin" : ""}`} />
                  <span>{scanningONVIF ? "Buscando Câmeras..." : "Escanear ONVIF"}</span>
                </button>
              </div>

              {discoveredCams.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {discoveredCams.map((dev) => (
                    <div
                      key={dev.ip}
                      onClick={() => handleSelectDiscovered(dev)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-cyan-300">{dev.ip}</span>
                      <span className="text-[10px] text-slate-400">{dev.services.join(", ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {addMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-bold">
                {addMessage}
              </div>
            )}

            <form onSubmit={handleSaveCamera} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome de Identificação (Slug):</label>
                <input
                  type="text"
                  placeholder="Ex: camera_portao, camera_garagem"
                  value={formCam.name}
                  onChange={(e) => setFormCam({ ...formCam, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome de Exibição Amigável:</label>
                <input
                  type="text"
                  placeholder="Ex: Portão da Frente, Garagem Principal"
                  value={formCam.friendly_name}
                  onChange={(e) => setFormCam({ ...formCam, friendly_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">URL de Transmissão RTSP:</label>
                <input
                  type="text"
                  placeholder="Ex: rtsp://192.168.1.6:8554/stream"
                  value={formCam.rtsp_main}
                  onChange={(e) => setFormCam({ ...formCam, rtsp_main: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  Salvar Câmera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
