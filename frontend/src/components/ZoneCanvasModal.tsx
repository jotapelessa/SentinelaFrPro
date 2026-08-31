"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera } from "@/store/useSentinelaStore";
import {
  X,
  Layers,
  Trash2,
  Save,
  Undo,
  Check,
  RefreshCw,
  Shield,
  EyeOff,
  Crosshair,
  AlertCircle
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

export interface ZoneItem {
  id: string;
  name: string;
  slug?: string;
  type: "zone" | "mask" | "object_mask";
  target_object?: string;
  color: string;
  points: Point[];
  objects?: string[];
}

interface ZoneCanvasModalProps {
  camera: Camera;
  onClose: () => void;
  onSaved: (zones: ZoneItem[]) => void;
}

const AVAILABLE_TRACK_OBJECTS = [
  { id: "person", label: "Pessoa", icon: "🚶" },
  { id: "car", label: "Carro", icon: "🚗" },
  { id: "motorcycle", label: "Moto", icon: "🏍️" },
  { id: "bus", label: "Ônibus", icon: "🚌" },
  { id: "dog", label: "Cachorro", icon: "🐕" },
  { id: "cat", label: "Gato", icon: "🐈" },
  { id: "bicycle", label: "Bicicleta", icon: "🚲" }
];

const ZONE_COLORS = [
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f59e0b"  // Amber
];

export const ZoneCanvasModal: React.FC<ZoneCanvasModalProps> = ({ camera, onClose, onSaved }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [snapshotUrl, setSnapshotUrl] = useState<string>(
    `/frigate/api/${camera.name || "camera_principal"}/latest.jpg?t=${Date.now()}`
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [loadingZones, setLoadingZones] = useState(true);

  const [zones, setZones] = useState<ZoneItem[]>([]);
  const [currentType, setCurrentType] = useState<"zone" | "mask" | "object_mask">("zone");
  const [newZoneName, setNewZoneName] = useState("Zona de Alerta");
  const [targetObject, setTargetObject] = useState<string>("person");
  const [selectedObjects, setSelectedObjects] = useState<string[]>(["person", "car", "motorcycle"]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // 1. Fetch live zones & masks from Frigate / Sentinela Backend
  useEffect(() => {
    let isMounted = true;
    const fetchFrigateZones = async () => {
      setLoadingZones(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
        const camIdentifier = camera.name || camera.id || "camera_principal";
        const res = await fetch(`${apiUrl}/cameras/${camIdentifier}/frigate-zones`);
        
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.parsed_items && Array.isArray(data.parsed_items) && data.parsed_items.length > 0) {
            setZones(data.parsed_items);
            return;
          }
        }
      } catch (err) {
        console.error("Erro ao carregar zonas do Frigate:", err);
      } finally {
        if (isMounted) setLoadingZones(false);
      }

      // Fallback to local DB camera.zones if API had no parsed items
      if (camera.zones && isMounted) {
        try {
          if (typeof camera.zones === "string") {
            const parsed = JSON.parse(camera.zones);
            if (Array.isArray(parsed)) setZones(parsed);
          } else if (Array.isArray(camera.zones)) {
            setZones(
              camera.zones.map((z, idx) => ({
                id: `zone_${idx}`,
                name: typeof z === "string" ? z : `Zona ${idx + 1}`,
                type: "zone",
                color: ZONE_COLORS[idx % ZONE_COLORS.length],
                points: [],
                objects: ["person", "car", "motorcycle"]
              }))
            );
          }
        } catch (e) {
          console.error("Erro ao processar zonas locais:", e);
        }
      }
    };

    fetchFrigateZones();
    return () => {
      isMounted = false;
    };
  }, [camera.name, camera.id, camera.zones]);

  // 2. Load live snapshot image with resilient fallback
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
          setImgLoaded(true);
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

  // 3. Draw Canvas Polygons and Handles
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    // Draw existing zones / masks
    zones.forEach((zone) => {
      if (!zone.points || zone.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(zone.points[0].x * canvas.width, zone.points[0].y * canvas.height);
      zone.points.slice(1).forEach((pt) => {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      });
      ctx.closePath();

      // Style based on type
      let strokeColor = zone.color || "#06b6d4";
      let fillColor = "rgba(6, 182, 212, 0.25)";
      let tagLabel = "Alerta";

      if (zone.type === "mask") {
        strokeColor = "#f43f5e";
        fillColor = "rgba(244, 63, 94, 0.35)";
        tagLabel = "Máscara Movimento";
      } else if (zone.type === "object_mask") {
        strokeColor = "#f59e0b";
        fillColor = "rgba(245, 158, 11, 0.35)";
        tagLabel = `Filtro ${zone.target_object || "Objeto"}`;
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();

      // Draw vertices
      zone.points.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Label at first point
      const firstPt = zone.points[0];
      const lx = firstPt.x * canvas.width + 6;
      const ly = Math.max(16, firstPt.y * canvas.height - 6);

      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      const labelText = `● ${zone.name} (${tagLabel})`;
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillRect(lx - 2, ly - 12, textWidth + 8, 16);

      ctx.fillStyle = strokeColor;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(labelText, lx + 2, ly);
    });

    // Draw active drawing points
    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x * canvas.width, currentPoints[0].y * canvas.height);
      currentPoints.slice(1).forEach((pt) => {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      });

      let drawColor = currentType === "zone" ? "#22d3ee" : currentType === "mask" ? "#fb7185" : "#fbbf24";
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      currentPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 6, 0, 2 * Math.PI);
        ctx.fillStyle = idx === 0 ? "#10b981" : drawColor;
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
      x: Number(Math.max(0, Math.min(1, x)).toFixed(4)),
      y: Number(Math.max(0, Math.min(1, y)).toFixed(4))
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
      alert("Desenhe ao menos 3 pontos no vídeo para fechar o polígono.");
      return;
    }

    const colorIndex = zones.length % ZONE_COLORS.length;
    const color =
      currentType === "zone"
        ? ZONE_COLORS[colorIndex]
        : currentType === "mask"
        ? "#f43f5e"
        : "#f59e0b";

    const defaultTitle =
      currentType === "zone"
        ? `Zona ${zones.filter((z) => z.type === "zone").length + 1}`
        : currentType === "mask"
        ? "Máscara de Movimento"
        : `Filtro ${targetObject.toUpperCase()}`;

    const newZone: ZoneItem = {
      id: `item_${Date.now()}`,
      name: newZoneName.trim() || defaultTitle,
      slug: (newZoneName.trim() || defaultTitle).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      type: currentType,
      target_object: currentType === "object_mask" ? targetObject : undefined,
      color,
      points: currentPoints,
      objects: currentType === "zone" ? selectedObjects : undefined
    };

    setZones((prev) => [...prev, newZone]);
    setCurrentPoints([]);
    setNewZoneName(currentType === "zone" ? "Nova Zona" : currentType === "mask" ? "Nova Máscara" : "Novo Filtro");
  };

  const handleRemoveZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const handleClearAll = () => {
    if (confirm("Deseja realmente remover todas as zonas e máscaras desta câmera?")) {
      setZones([]);
      setCurrentPoints([]);
    }
  };

  const toggleObjectFilter = (objId: string) => {
    setSelectedObjects((prev) =>
      prev.includes(objId) ? prev.filter((o) => o !== objId) : [...prev, objId]
    );
  };

  // 4. Save to Frigate API & Sentinela Database
  const handleSaveToBackend = async () => {
    setSaving(true);
    setStatusMsg({ text: "Sincronizando com Frigate NVR...", type: "info" });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const camIdentifier = camera.name || camera.id || "camera_principal";

      // 1. Post to Frigate Zones API
      const frigateRes = await fetch(`${apiUrl}/cameras/${camIdentifier}/frigate-zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_items: zones
        })
      });

      if (frigateRes.ok) {
        setStatusMsg({
          text: "✅ Zonas e Máscaras gravadas com sucesso no Frigate e no Sentinela!",
          type: "success"
        });
        onSaved(zones);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({
          text: "⚠️ Ocorreu um problema ao sincronizar com o Frigate NVR.",
          type: "error"
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({
        text: "❌ Falha de rede ao conectar com o servidor.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Editor Visual de Zonas & Máscaras: <span className="text-cyan-400">{camera.friendly_name || camera.name}</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Desenhe perímetros no vídeo. As zonas criadas aqui sincronizam em tempo real com o Frigate NVR.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshSnapshot}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1.5"
              title="Capturar Novo Frame da Câmera"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Atualizar Frame</span>
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
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Canvas Viewport (Left 2 Cols) */}
          <div
            className="lg:col-span-2 flex flex-col items-center justify-center bg-black/70 rounded-xl border border-slate-800 overflow-hidden relative min-h-[340px]"
            ref={containerRef}
          >
            {(!imgLoaded || loadingZones) && (
              <div className="p-8 text-center text-xs font-mono text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Carregando frame ao vivo e zonas do Frigate...
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasTouch}
              className="w-full h-auto max-h-[58vh] object-contain cursor-crosshair"
            />

            <div className="absolute top-2 left-2 bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-200 border border-slate-700/80 shadow-md">
              {currentPoints.length === 0
                ? "💡 Clique na imagem para marcar os vértices do perímetro"
                : `📍 ${currentPoints.length} ponto(s) marcado(s) — clique em 'Fechar Polígono'`}
            </div>

            {/* Quick Canvas Actions */}
            {zones.length > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold backdrop-blur transition-all"
                >
                  Limpar Todas ({zones.length})
                </button>
              </div>
            )}
          </div>

          {/* Controls & Layers Panel (Right 1 Col) */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 tracking-wider mb-2">
                  Tipo de Polígono:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCurrentType("zone")}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      currentType === "zone"
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Zona Alerta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentType("mask")}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      currentType === "mask"
                        ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <EyeOff className="w-4 h-4 text-rose-400" />
                    <span>Máscara</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentType("object_mask")}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      currentType === "object_mask"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20"
                        : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Crosshair className="w-4 h-4 text-amber-400" />
                    <span>Filtro Falso</span>
                  </button>
                </div>
              </div>

              {/* Name & Target Object inputs */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">
                    Nome da Camada:
                  </label>
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="Ex: Garagem, Portão Principal, Calçada"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {currentType === "zone" && (
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold mb-1.5">
                      Objetos monitorados nesta zona:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_TRACK_OBJECTS.map((obj) => {
                        const isChecked = selectedObjects.includes(obj.id);
                        return (
                          <button
                            key={obj.id}
                            type="button"
                            onClick={() => toggleObjectFilter(obj.id)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border transition-all ${
                              isChecked
                                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                                : "bg-slate-800/60 border-slate-700 text-slate-400"
                            }`}
                          >
                            <span>{obj.icon}</span>
                            <span>{obj.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentType === "object_mask" && (
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">
                      Filtrar falso positivo de:
                    </label>
                    <select
                      value={targetObject}
                      onChange={(e) => setTargetObject(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      {AVAILABLE_TRACK_OBJECTS.map((obj) => (
                        <option key={obj.id} value={obj.id}>
                          {obj.icon} {obj.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Drawing Actions */}
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
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
                    title="Descartar pontos atuais"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Active Layers List */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-bold uppercase text-slate-400">
                    Camadas Ativas ({zones.length})
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Sincronizadas com Frigate</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {zones.length === 0 ? (
                    <div className="p-3 text-center text-[11px] font-mono text-slate-500 bg-slate-950/60 rounded-lg border border-slate-800">
                      Nenhuma zona ou máscara configurada.
                    </div>
                  ) : (
                    zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="font-bold text-slate-200 truncate">{zone.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            ({zone.type === "zone" ? "Alerta" : zone.type === "mask" ? "Máscara" : "Filtro"})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveZone(zone.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-all ml-1"
                          title="Remover Camada"
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
            <div className="space-y-2 pt-3 border-t border-slate-800">
              {statusMsg && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${
                    statusMsg.type === "success"
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : statusMsg.type === "error"
                      ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                      : "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveToBackend}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Sincronizando com Frigate NVR..." : "Salvar no Frigate & Sentinela"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

