"use client";

import React, { useEffect, useRef } from "react";
import { useSentinelaStore, SecurityEvent } from "@/store/useSentinelaStore";

function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.12); // C6
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignored if user hasn't interacted with page yet
  }
}

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    setTelemetry,
    addEvent,
    setEvents,
    setWsConnected,
    setActiveDetection,
    setMotionStatus,
    setObjectCount,
    audioAlertEnabled
  } = useSentinelaStore();

  const audioEnabledRef = useRef(audioAlertEnabled);
  audioEnabledRef.current = audioAlertEnabled;

  useEffect(() => {
    // 1. Fetch initial historical events detected by Frigate
    const loadInitialEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
        const res = await fetch(`${apiUrl}/events?limit=50`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setEvents(data);
          }
        }
      } catch (e) {
        console.error("Failed to load initial events:", e);
      }
    };
    loadInitialEvents();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let isActive = true;

    function connect() {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isActive) {
            setWsConnected(true);
          }
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "TELEMETRY_UPDATE") {
              setTelemetry(data);
            } else if (data.type === "NEW_DETECTION") {
              const event: SecurityEvent = {
                event_id: data.event_id,
                camera: data.camera,
                label: data.label,
                score: data.score,
                zone: data.zone,
                box: data.box,
                timestamp: data.timestamp,
                snapshot_url: data.snapshot_url
              };
              addEvent(event);
              if (audioEnabledRef.current) {
                playAlertChime();
              }
            } else if (data.type === "CAMERA_DETECTION_ACTIVE") {
              if (data.active) {
                setActiveDetection(data.camera, {
                  camera: data.camera,
                  label: data.label,
                  score: data.score,
                  zone: data.zone,
                  box: data.box,
                  timestamp: Date.now()
                });
              } else {
                setActiveDetection(data.camera, null);
              }
            } else if (data.type === "CAMERA_MOTION_STATUS") {
              setMotionStatus(data.camera, !!data.motion);
              if (!data.motion) {
                // Resiliência: limpar alerta ativo caso movimento acabe
                setActiveDetection(data.camera, null);
              }
            } else if (data.type === "CAMERA_OBJECTS_COUNT") {
              setObjectCount(data.camera, data.label, data.count);
            }
          } catch (err) {
            console.error("Failed to parse WS message", err);
          }
        };

        ws.onclose = () => {
          if (isActive) {
            setWsConnected(false);
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        if (isActive) {
          reconnectTimeout = setTimeout(connect, 4000);
        }
      }
    }

    connect();

    return () => {
      isActive = false;
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [setTelemetry, addEvent, setEvents, setWsConnected, setActiveDetection, setMotionStatus, setObjectCount]);

  return <>{children}</>;
};
