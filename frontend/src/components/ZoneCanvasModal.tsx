"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera } from "@/store/useSentinelaStore";
import { X, Layers, Plus, Trash2, Save, Undo, ShieldAlert, Sparkles, Check, RefreshCw } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

export interface ZoneItem {
  id: string;
  name: string;
  type: "zone" | "mask";
  color: string;
  points: Point[];
}

interface ZoneCanvasModalProps {
  camera: Camera;
  onClose: () => void;
  onSaved: (zones: ZoneItem[]) => void;
}

export const ZoneCanvasModal: React.FC<ZoneCanvasModalProps> = ({ camera, onClose, onSaved }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string>(
    `/frigate/api/${camera.name || "camera_principal"}/latest.jpg?t=${Date.now()}`
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Existing or Parsed Zones
  const [zones, setZones] = useState<ZoneItem[]>(() => {
    if (camera.zones) {
      try {
        if (typeof camera.zones === "string") {
          return JSON.parse(camera.zones);
        } else if (Array.isArray(camera.zones)) {
          return camera.zones.map((z, idx) => ({
            id: `zone_${idx}`,
            name: typeof z === "string" ? z : "Zona " + idx,
            type: "zone",
            color: "#06b6d4",
            points: []
          }));
        }
      } catch (e) {
        console.error("Error parsing initial zones:", e);
      }
    }
    return [];
  });

  const [currentType, setCurrentType] = useState<"zone" | "mask">("zone");
  const [newZoneName, setNewZoneName] = useState("Zona de Alerta");
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Load snapshot image with resilient fallback
  useEffect(() => {
    let isMounted = true;
    const loadImg = (url: string, isRetry = false) => {
      const img = new Image();
      img.onload = () => {
        if (isMounted) {
          setBgImage(img);
          setImgLoaded(true);
        }
      };
      img.onerror = () => {
        if (isMounted && !isRetry) {
          const altUrl = `/go2rtc/api/frame.jpeg?src=${camera.name || "camera_principal"}&t=${Date.now()}`;
          loadImg(altUrl, true);
        } else if (isMounted) {
          setImgLoaded(true); // Allow drawing on grid even if snapshot is unavailable
        }
      };
      img.src = url;
    };

    const initialUrl = `/frigate/api/${camera.name || "camera_principal"}/latest.jpg?t=${Date.now()}`;
    loadImg(initialUrl);

    return () => {
      isMounted = false;
    };
  }, [snapshotUrl, camera.name]);

  const refreshSnapshot = () => {
    setSnapshotUrl(`/frigate/api/${camera.name || "camera_principal"}/latest.jpg?t=${Date.now()}`);
  };

  // Draw Canvas
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (Real camera snapshot or High-Tech Grid Fallback)
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `📷 Frame ao Vivo (${camera.friendly_name || camera.name}) - Clique para desenhar`,
        canvas.width / 2,
        canvas.height / 2
      );
      ctx.textAlign = "left";
    }

    // Draw existing zones
    zones.forEach((zone) => {
      if (zone.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(zone.points[0].x * canvas.width, zone.points[0].y * canvas.height);
      zone.points.slice(1).forEach((pt) => {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      });
      ctx.closePath();

      // Style
      ctx.strokeStyle = zone.color || (zone.type === "zone" ? "#06b6d4" : "#f43f5e");
      ctx.lineWidth = 3;
      ctx.fillStyle = zone.type === "zone" ? "rgba(6, 182, 212, 0.3)" : "rgba(244, 63, 94, 0.4)";
      ctx.fill();
      ctx.stroke();

      // Label at first point
      const firstPt = zone.points[0];
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(
        `● ${zone.name} (${zone.type === "zone" ? "Alerta" : "Máscara"})`,
        firstPt.x * canvas.width + 6,
        firstPt.y * canvas.height - 6
      );
    });

    // Draw currently drawing points
    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x * canvas.width, currentPoints[0].y * canvas.height);
      currentPoints.slice(1).forEach((pt) => {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      });

      ctx.strokeStyle = currentType === "zone" ? "#22d3ee" : "#fb7185";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw handles
      currentPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 6, 0, 2 * Math.PI);
        ctx.fillStyle = idx === 0 ? "#10b981" : "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  };

  useEffect(() => {
    redraw();
  }, [bgImage, zones, currentPoints, currentType]);

  const addPointFromCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const newPt: Point = {
      x: Number(Math.max(0, Math.min(1, x)).toFixed(3)),
      y: Number(Math.max(0, Math.min(1, y)).toFixed(3))
    };
    setCurrentPoints((prev) => [...prev, newPt]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    addPointFromCoords(e.clientX, e.clientY);
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches && e.touches.length > 0) {
      addPointFromCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };



  const handleCompletePolygon = () => {
    if (currentPoints.length < 3) {
      alert("Desenhe ao menos 3 pontos no vídeo para formar uma zona ou máscara.");
      return;
    }

    const newZone: ZoneItem = {
      id: `zone_${Date.now()}`,
      name: newZoneName.trim() || (currentType === "zone" ? "Zona de Alerta" : "Máscara"),
      type: currentType,
      color: currentType === "zone" ? "#06b6d4" : "#f43f5e",
      points: currentPoints
    };

    setZones((prev) => [...prev, newZone]);
    setCurrentPoints([]);
    setNewZoneName(currentType === "zone" ? "Nova Zona" : "Nova Máscara");
  };

  const handleRemoveZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const handleSaveToBackend = async () => {
    setSaving(true);
    setStatusMsg(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camIdentifier = camera.id || camera.name || "camera_principal";
      const res = await fetch(`${apiUrl}/cameras/${camIdentifier}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: JSON.stringify(zones)
        })
      });

      if (res.ok) {
        setStatusMsg("✅ Zonas e Máscaras gravadas com sucesso no Sentinela & Frigate!");
        onSaved(zones);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg("⚠️ Erro ao persistir zonas no servidor.");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("⚠️ Falha de comunicação.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Editor Visual de Zonas & Máscaras: <span className="text-cyan-400">{camera.friendly_name || camera.name}</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Clique sobre o vídeo para adicionar pontos e desenhar o perímetro de detecção inteligente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshSnapshot}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs"
              title="Capturar Novo Frame da Câmera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Canvas Viewport (Left / Top 2 Cols) */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-black/60 rounded-xl border border-slate-800 overflow-hidden relative min-h-[300px]" ref={containerRef}>
            {!imgLoaded && (
              <div className="p-8 text-center text-xs font-mono text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Carregando frame ao vivo da câmera...
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasTouch}
              className="w-full h-auto max-h-[55vh] object-contain cursor-crosshair"
            />

            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 border border-slate-700">
              {currentPoints.length === 0
                ? "💡 Clique na imagem para iniciar o desenho"
                : `📍 ${currentPoints.length} ponto(s) marcado(s)`}
            </div>
          </div>

          {/* Controls & Layers Panel (Right 1 Col) */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Criar Novo Polígono</h3>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCurrentType("zone")}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    currentType === "zone"
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  🟢 Zona de Alerta
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentType("mask")}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    currentType === "mask"
                      ? "bg-rose-500/20 border-rose-500 text-rose-300"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  🔴 Máscara (Ignorar)
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">Nome do Perímetro:</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Ex: Entrada Principal, Garagem"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={currentPoints.length < 3}
                  onClick={handleCompletePolygon}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-40 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Fechar Polígono</span>
                </button>

                {currentPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentPoints([])}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    title="Descartar pontos atuais"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Zones List */}
              <div className="pt-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-400 mb-2">Camadas Ativas ({zones.length})</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {zones.length === 0 ? (
                    <div className="p-3 text-center text-[11px] font-mono text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800">
                      Nenhuma zona configurada.
                    </div>
                  ) : (
                    zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="font-bold text-slate-200">{zone.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            ({zone.type === "zone" ? "Alerta" : "Máscara"})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(zone.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Status & Save Action */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {statusMsg && (
                <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold">
                  {statusMsg}
                </div>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveToBackend}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Gravando no Frigate..." : "Salvar Zonas no Frigate"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
