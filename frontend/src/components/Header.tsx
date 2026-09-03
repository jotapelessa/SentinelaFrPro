"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Shield, 
  Flame, 
  Cpu, 
  HardDrive, 
  Activity, 
  Send, 
  Search, 
  Tv, 
  Video, 
  Bell, 
  Settings as SettingsIcon,
  Radio,
  ExternalLink
} from "lucide-react";

import { useSentinelaStore } from "@/store/useSentinelaStore";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { telemetry, wsConnected, setIsScannerOpen } = useSentinelaStore();

  const getTempColor = (temp: number) => {
    if (temp < 45) return "text-emerald-400";
    if (temp < 65) return "text-amber-400";
    return "text-rose-400";
  };

  const navItems = [
    { label: "Câmeras", href: "/", icon: Video },
    { label: "Eventos", href: "/events", icon: Bell },
    { label: "Telas", href: "/screens", icon: Tv },
    { label: "Ajustes", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/20 px-3 sm:px-4 flex items-center select-none shadow-lg shadow-black/40">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 h-full">
        
        {/* ZONE 1: BRAND & SYSTEM STATUS */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Shield className="w-4 h-4 text-obsidian-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                  SENTINELA
                </span>
                <span className="text-[9px] uppercase tracking-widest px-1 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-extrabold">
                  PRO
                </span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase font-semibold">001.000.000.047</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 leading-none">
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-rose-400"}`} />
                <span className="hidden sm:inline">{wsConnected ? "ONLINE (N5105 / QSV)" : "OFFLINE"}</span>
                <span className="sm:hidden">{wsConnected ? "ONLINE" : "OFF"}</span>
              </span>
            </div>
          </Link>
        </div>

        {/* ZONE 2: LIVE TELEMETRY HUD (Fixed tabular digits, zero shift) */}
        {telemetry && (
          <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] tabular-nums flex-shrink-0">
            {/* CPU & Temp */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 shadow-inner min-w-[105px] justify-center">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-200 font-bold w-9 text-right">{telemetry.cpu.usage_percent.toFixed(1)}%</span>
              <span className="text-slate-700">|</span>
              <Flame className={`w-3.5 h-3.5 flex-shrink-0 ${getTempColor(telemetry.cpu.temperature_celsius)}`} />
              <span className={`font-bold ${getTempColor(telemetry.cpu.temperature_celsius)}`}>
                {telemetry.cpu.temperature_celsius}°C
              </span>
            </div>

            {/* RAM */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 shadow-inner min-w-[95px] justify-center">
              <Activity className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span className="text-slate-400 text-[10px]">RAM:</span>
              <span className="text-slate-200 font-bold">
                {Math.round(telemetry.ram.used_mb)}M
              </span>
              <span className="text-[10px] text-slate-500">({Math.round(telemetry.ram.percent)}%)</span>
            </div>

            {/* SSD NVMe */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 shadow-inner min-w-[85px] justify-center">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-400 text-[10px]">SSD:</span>
              <span className="text-slate-200 font-bold">{Math.round(telemetry.disk.free_gb)}G</span>
              <span className="text-[10px] text-slate-500">livres</span>
            </div>

            {/* Telegram Vault Status */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 shadow-inner">
              <Send className="w-3 h-3 text-sky-400 flex-shrink-0" />
              <span className="text-[10px]">
                {telemetry.telegram?.paused ? (
                  <span className="text-amber-400 font-bold">⏸️ Pausado</span>
                ) : telemetry.telegram?.configured ? (
                  <span className="text-emerald-400 font-bold">🟢 Vault OK</span>
                ) : (
                  <span className="text-slate-500">⚪ Desativado</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* ZONE 3: ACTIONS & NAVIGATION */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* External Links: Frigate & Tailscale */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <a
              href="http://frigate.local:5000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all group"
              title="Abrir Frigate NVR (Porta 5000)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Frigate</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </a>
            <a
              href="https://login.tailscale.com/admin/machines"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-300 hover:text-emerald-300 hover:bg-slate-800 transition-all group"
              title="Abrir Console Tailscale VPN"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Tailscale</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </a>
          </div>

          {/* Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 text-xs font-semibold tracking-wide transition-all shadow-sm shadow-cyan-500/10"
            title="Escanear câmeras ONVIF na rede"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Scanner CFTV</span>
          </button>


          {/* Mobile Scanner Icon Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="sm:hidden p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all"
            title="Escanear câmeras"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Main Navigation Tabs */}
          <nav className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 sm:p-1 rounded-lg border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/"
                ? (pathname === "/" || pathname === "/cameras")
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500 text-obsidian-950 font-bold shadow-md shadow-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

      </div>
    </header>
  );
};
