import React, { useState } from 'react';
import { CameraFeed, CaptureItem } from '../types';
import { 
  Camera, 
  Video, 
  Square, 
  Maximize2, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Radio, 
  Eye, 
  Zap, 
  Cpu
} from 'lucide-react';

interface LiveFeedViewProps {
  cameras: CameraFeed[];
  onTakeSnapshot: (camera: CameraFeed) => void;
  onRecordClip: (camera: CameraFeed) => void;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  cameras,
  onTakeSnapshot,
  onRecordClip
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 pb-20 overflow-y-auto max-h-full">
      {cameras.map((camera) => (
        <CameraStreamCardItem 
          key={camera.id} 
          camera={camera} 
          onSnapshot={() => onTakeSnapshot(camera)}
          onRecord={() => onRecordClip(camera)}
        />
      ))}
    </div>
  );
};

interface CameraStreamCardItemProps {
  camera: CameraFeed;
  onSnapshot: () => void;
  onRecord: () => void;
}

const CameraStreamCardItem: React.FC<CameraStreamCardItemProps> = ({
  camera,
  onSnapshot,
  onRecord
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.min(5.0, Math.max(1.0, zoom + (e.deltaY < 0 ? 0.3 : -0.3)));
    setZoom(Number(newZoom.toFixed(1)));
    if (newZoom === 1.0) setPan({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    if (zoom > 1.0) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1.0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1.0) {
      const maxPan = 150 * (zoom - 1);
      const nextX = Math.min(maxPan, Math.max(-maxPan, e.clientX - dragStart.x));
      const nextY = Math.min(maxPan, Math.max(-maxPan, e.clientY - dragStart.y));
      setPan({ x: nextX, y: nextY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const triggerSnapshot = () => {
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 220);
    onSnapshot();
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    onRecord();
  };

  return (
    <div 
      className={`rounded-2xl bg-[#111827] border transition-all duration-300 shadow-md overflow-hidden ${
        camera.hasMotion 
          ? 'border-[#E11D48] shadow-[#E11D48]/20' 
          : zoom > 1.05 
          ? 'border-[#06B6D4]' 
          : 'border-[#1F2937]'
      }`}
    >
      {/* 16:9 Viewport com Gestos Multitoque */}
      <div 
        className="relative w-full aspect-video bg-black overflow-hidden select-none cursor-grab active:cursor-grabbing group"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleTap}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Camada de Shutter Flash */}
        {isShutterActive && (
          <div className="absolute inset-0 bg-white/90 z-40 transition-opacity duration-200 pointer-events-none animate-pulse" />
        )}

        {/* Video Canvas / Texture Simulation */}
        <div 
          className="w-full h-full relative transition-transform duration-100 ease-out origin-center"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
          }}
        >
          <img 
            src={camera.thumbnailUrl} 
            alt={camera.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-90 contrast-105"
          />

          {/* Grid de mira tática de segurança */}
          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none" />

          {/* AI Bounding Box Detection */}
          {camera.hasMotion && camera.detectedObject && (
            <div className="absolute top-[28%] left-[34%] w-[32%] h-[50%] border-2 border-[#E11D48] bg-[#E11D48]/15 rounded-md pointer-events-none animate-pulse">
              <div className="absolute -top-5 left-0 bg-[#E11D48] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shadow">
                <ShieldAlert className="w-3 h-3 text-white" />
                <span>{camera.detectedObject.toUpperCase()}</span>
              </div>
              <div className="absolute bottom-1 right-1 bg-black/70 text-[#FDE68A] text-[8px] font-mono px-1 rounded">
                YOLOv8-GPU: 98%
              </div>
            </div>
          )}

          {/* Scanline / Live Feed Overlay Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
        </div>

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Nome da Câmera Badge */}
          <div className="px-2.5 py-1 rounded-full bg-[#090D16]/85 backdrop-blur-md border border-[#1F2937] flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-white tracking-wide">
              {camera.name.toUpperCase()}
            </span>
          </div>

          {/* Resolution & FPS Badge */}
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-full bg-[#090D16]/85 backdrop-blur-md border border-[#1F2937] text-[9px] font-mono font-semibold text-[#94A3B8]">
              {camera.resolution}
            </div>
            <div className="px-2 py-0.5 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[9px] font-mono font-bold text-[#10B981] flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" />
              <span>{camera.fps} FPS</span>
            </div>
          </div>
        </div>

        {/* Zoom Level Indicator & Reset Tool */}
        {zoom > 1.05 && (
          <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-[#090D16]/90 backdrop-blur-md border border-[#22D3EE] px-2 py-1 rounded-full text-[10px] font-mono font-bold text-[#22D3EE] shadow-lg">
            <span>{zoom.toFixed(1)}x ZOOM</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setZoom(1.0); setPan({ x: 0, y: 0 }); }}
              className="ml-1 hover:text-white p-0.5"
              title="Resetar Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Quick Pinch Buttons for Touch / Desktop */}
        <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setZoom(Math.min(5.0, Number((zoom + 0.5).toFixed(1))))}
            className="w-7 h-7 rounded-lg bg-[#1F2937]/90 text-white flex items-center justify-center text-xs font-bold hover:bg-[#22D3EE] hover:text-black border border-[#1F2937]"
            title="Aumentar Zoom"
          >
            +
          </button>
          <button
            onClick={() => setZoom(Math.max(1.0, Number((zoom - 0.5).toFixed(1))))}
            className="w-7 h-7 rounded-lg bg-[#1F2937]/90 text-white flex items-center justify-center text-xs font-bold hover:bg-[#22D3EE] hover:text-black border border-[#1F2937]"
            title="Diminuir Zoom"
          >
            -
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-7 h-7 rounded-lg bg-[#1F2937]/90 text-white flex items-center justify-center hover:text-[#22D3EE] border border-[#1F2937]"
            title={isMuted ? "Ativar Áudio" : "Mutar Áudio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#22D3EE]" />}
          </button>
        </div>

        {/* Recording active badge */}
        {isRecording && (
          <div className="absolute top-10 left-2.5 z-20 flex items-center gap-1.5 bg-[#E11D48] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full animate-pulse shadow-md">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>REC 00:0{Math.floor(Math.random() * 8) + 1}</span>
          </div>
        )}
      </div>

      {/* Info Bar & Thumb Action Buttons */}
      <div className="px-3.5 py-3 flex items-center justify-between border-t border-[#1F2937]">
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">{camera.zone}</h4>
          <p className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
            <span>IP: {camera.rtspUrl.split('@')[1]?.split(':')[0] || '100.82.14.10'}</span>
            <span>•</span>
            <span className="text-[#22D3EE]/80">{camera.codec}</span>
          </p>
        </div>

        {/* One-Hand UI Ergonomic Action Buttons (MinTouchTarget 48dp) */}
        <div className="flex items-center gap-2">
          {/* Snapshot Button */}
          <button
            onClick={triggerSnapshot}
            className="w-11 h-11 rounded-xl bg-[#1F2937] hover:bg-[#22D3EE]/20 hover:border-[#22D3EE] border border-transparent flex items-center justify-center text-[#22D3EE] transition-all active:scale-95 shadow-sm"
            title="Capturar Foto"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Record Button */}
          <button
            onClick={toggleRecording}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm border ${
              isRecording 
                ? 'bg-[#E11D48]/25 text-[#E11D48] border-[#E11D48]' 
                : 'bg-[#1F2937] text-white hover:text-[#E11D48] border-transparent'
            }`}
            title="Gravar Vídeo"
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Video className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
