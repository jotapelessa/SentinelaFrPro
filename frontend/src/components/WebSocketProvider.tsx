"use client";

import React, { useEffect } from "react";
import { useSentinelaStore, SecurityEvent } from "@/store/useSentinelaStore";

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setTelemetry, addEvent, setWsConnected } = useSentinelaStore();

  useEffect(() => {
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
                timestamp: data.timestamp,
                snapshot_url: data.snapshot_url
              };
              addEvent(event);
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
  }, [setTelemetry, addEvent, setWsConnected]);

  return <>{children}</>;
};
