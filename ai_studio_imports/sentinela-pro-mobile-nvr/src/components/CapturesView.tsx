import React, { useState } from 'react';
import { CaptureItem } from '../types';
import { Images, Trash2, Download, Eye, Play, Film, Calendar, ShieldCheck } from 'lucide-react';

interface CapturesViewProps {
  captures: CaptureItem[];
  onDeleteCapture?: (id: string) => void;
}

export const CapturesView: React.FC<CapturesViewProps> = ({
  captures,
  onDeleteCapture
}) => {
  const [selectedCapture, setSelectedCapture] = useState<CaptureItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  const filtered = captures.filter((c) => filter === 'all' || c.type === filter);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-h-full">
      {/* Header com Filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Galeria de Capturas
          </h3>
          <p className="text-[11px] font-mono text-[#94A3B8]">
            {captures.length} mídias salvas localmente
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filter === 'all' ? 'bg-[#22D3EE] text-black' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filter === 'photo' ? 'bg-[#22D3EE] text-black' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Fotos
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filter === 'video' ? 'bg-[#22D3EE] text-black' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Vídeos
          </button>
        </div>
      </div>

      {/* Grid de Mídias */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#111827] border border-[#1F2937] p-8 text-center flex flex-col items-center justify-center">
          <Film className="w-10 h-10 text-[#64748B] mb-2" />
          <p className="text-xs font-bold text-white">Nenhuma captura encontrada</p>
          <p className="text-[11px] font-mono text-[#64748B] mt-1">
            Toque nos botões de câmera ou gravação no feed Ao Vivo para registrar evidências.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedCapture(item)}
              className="group relative rounded-xl bg-[#111827] border border-[#1F2937] hover:border-[#22D3EE] overflow-hidden cursor-pointer shadow transition-all duration-200"
            >
              <div className="aspect-video w-full relative bg-black">
                <img 
                  src={item.thumbnailUrl} 
                  alt={item.cameraName} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                
                {item.type === 'video' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#22D3EE]/90 text-black flex items-center justify-center shadow">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Badge Tipo e Duração */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[8px] font-mono font-bold text-white flex items-center gap-1">
                  <span>{item.type === 'photo' ? 'FOTO' : `VÍDEO ${item.duration}`}</span>
                </div>

                {item.objectDetected && (
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#E11D48] text-white text-[8px] font-mono font-bold">
                    {item.objectDetected}
                  </div>
                )}
              </div>

              <div className="p-2.5">
                <h4 className="text-[11px] font-bold text-white truncate">{item.cameraName}</h4>
                <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-[#94A3B8]">
                  <span>{item.timestamp}</span>
                  <span className="text-[#22D3EE]">{item.fileSize}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preview de Captura */}
      {selectedCapture && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedCapture(null)}
        >
          <div 
            className="rounded-2xl bg-[#111827] border border-[#22D3EE] p-4 max-w-sm w-full shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">{selectedCapture.cameraName}</h4>
                <p className="text-[10px] font-mono text-[#94A3B8]">{selectedCapture.timestamp}</p>
              </div>
              <button 
                onClick={() => setSelectedCapture(null)}
                className="text-[#94A3B8] hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[#1F2937]">
              <img 
                src={selectedCapture.thumbnailUrl} 
                alt="Detalhe" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {selectedCapture.objectDetected && (
                <div className="absolute top-2 left-2 bg-[#E11D48] text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                  {selectedCapture.objectDetected}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] px-1">
              <span>Tamanho: {selectedCapture.fileSize}</span>
              <span className="text-[#10B981]">Frigate Storage OK</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => alert(`Download iniciado: ${selectedCapture.id}.jpg`)}
                className="flex-1 h-10 rounded-xl bg-[#22D3EE] hover:bg-[#22D3EE]/90 text-black font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>EXPORTAR</span>
              </button>
              {onDeleteCapture && (
                <button
                  onClick={() => {
                    onDeleteCapture(selectedCapture.id);
                    setSelectedCapture(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-[#E11D48]/20 border border-[#E11D48] text-[#E11D48] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
