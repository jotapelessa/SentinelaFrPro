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
  Plus, 
  Tv, 
  Video, 
  Bell, 
  Settings as SettingsIcon,
  Radio
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
    { label: "Eventos & Gravações", href: "/events", icon: Bell },
    { label: "Telas Pareadas", href: "/screens", icon: Tv },
    { label: "Ajustes & Diagnósticos", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-cyan-500/20 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Brand & Live Indicator */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-obsidian-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  SENTINELA
                </span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Radio className={`w-2.5 h-2.5 ${wsConnected ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
                {wsConnected ? "ONLINE (N5105 / QSV)" : "OFFLINE"}
              </span>
            </div>
          </Link>

          {/* Quick Action Button for Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Live Telemetry Pills */}
        {telemetry && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            {/* CPU & Temp */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-obsidian-900/80 border border-slate-800 shadow-inner">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300 font-bold">{telemetry.cpu.usage_percent}%</span>
              <span className="text-slate-600">|</span>
              <Flame className={`w-3.5 h-3.5 ${getTempColor(telemetry.cpu.temperature_celsius)}`} />
              <span className={`font-bold ${getTempColor(telemetry.cpu.temperature_celsius)}`}>
                {telemetry.cpu.temperature_celsius}°C
              </span>
            </div>

            {/* RAM */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-obsidian-900/80 border border-slate-800 shadow-inner">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-400">RAM:</span>
              <span className="text-slate-200 font-bold">
                {telemetry.ram.used_mb}MB
              </span>
              <span className="text-[10px] text-slate-500">({telemetry.ram.percent}%)</span>
            </div>

            {/* SSD NVMe */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-obsidian-900/80 border border-slate-800 shadow-inner">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">SSD:</span>
              <span className="text-slate-200 font-bold">{telemetry.disk.free_gb}GB</span>
              <span className="text-[10px] text-slate-500">livres</span>
            </div>

            {/* Network RX/TX */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-obsidian-900/80 border border-slate-800 shadow-inner">
              <span className="text-cyan-400">⚡</span>
              <span className="text-slate-400">RX:</span>
              <span className="text-slate-200">{telemetry.network.rx_kbs} KB/s</span>
            </div>

            {/* Telegram Vault Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-obsidian-900/80 border border-slate-800 shadow-inner">
              <Send className="w-3 h-3 text-sky-400" />
              <span className="text-[11px] text-slate-300">
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

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-center lg:justify-end">
          {/* Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 text-xs font-semibold tracking-wide transition-all shadow-sm shadow-cyan-500/10"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Scanner CFTV</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 bg-obsidian-900/90 p-1 rounded-lg border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-cyan-500 text-obsidian-950 font-bold shadow-md shadow-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
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
