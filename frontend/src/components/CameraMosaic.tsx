"use client";

import React from "react";
import { WebRTCPlayer } from "./WebRTCPlayer";
import { useSentinelaStore, Camera } from "@/store/useSentinelaStore";
import { Grid, Maximize, Video, ShieldAlert } from "lucide-react";

export const CameraMosaic: React.FC = () => {
  const { cameras, spotlightCamera, setSpotlightCamera } = useSentinelaStore();

  return (
    <section className="w-full space-y-4">
      {/* Mosaic Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Mosaico de Câmeras em Tempo Real
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {cameras.length} Ativas
          </span>
        </div>

        {spotlightCamera && (
          <button
            onClick={() => setSpotlightCamera(null)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Voltar ao Mosaico</span>
          </button>
        )}
      </div>

      {/* Cameras View (Spotlight vs Grid) */}
      {spotlightCamera ? (
        <div className="w-full">
          <WebRTCPlayer
            camera={spotlightCamera}
            isSpotlight={true}
            onToggleSpotlight={() => setSpotlightCamera(null)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {cameras.map((camera) => (
            <WebRTCPlayer
              key={camera.id}
              camera={camera}
              isSpotlight={false}
              onToggleSpotlight={() => setSpotlightCamera(camera)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
