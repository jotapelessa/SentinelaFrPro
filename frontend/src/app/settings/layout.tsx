"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Send, 
  HardDrive, 
  Activity, 
  Terminal, 
  Settings as SettingsIcon,
  ChevronRight,
  Tv,
  Radio,
  Server,
  ShieldCheck,
  ExternalLink,
  Video,
  Shield
} from "lucide-react";

import { useSentinelaStore } from "@/store/useSentinelaStore";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { wsConnected, telemetry } = useSentinelaStore();

  const subNavItems = [
    {
      name: "Telegram & Vault",
      href: "/settings/telegram",
      icon: Send,
      desc: "Token, chat ID, mídia & regras",
      color: "text-sky-400"
    },
    {
      name: "Logs & Auditoria 360°",
      href: "/settings/logs",
      icon: Terminal,
      desc: "Eventos recentes & todas as áreas",
      color: "text-amber-400"
    },
    {
      name: "Diagnósticos de Hardware",
      href: "/settings/diagnostics",
      icon: Activity,
      desc: "N5105, VAAPI, MQTT & Frigate",
      color: "text-cyan-400"
    },
    {
      name: "Backup & Dados",
      href: "/settings/backup",
      icon: HardDrive,
      desc: "Download SQLite & restauração",
      color: "text-emerald-400"
    },
    {
      name: "Telas & PiP Pareados",
      href: "/screens",
      icon: Tv,
      desc: "Smart TVs TCL, Android & Web",
      color: "text-teal-400"
    },
  ];

  const currentItem = subNavItems.find((item) => pathname === item.href) || {
    name: "Visão Geral",
    desc: "Painel de controle do Sentinela Pro"
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Title */}
      <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 flex items-center justify-between shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/10">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Link href="/settings" className="hover:text-cyan-400 transition-colors">Ajustes</Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-bold">{currentItem.name}</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
              Central de Ajustes & Infraestrutura
            </h1>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
          <Radio className={`w-3.5 h-3.5 ${wsConnected ? "text-emerald-400 animate-pulse" : "text-rose-400"}`} />
          <span className="text-slate-300 font-semibold">{wsConnected ? "SISTEMA ONLINE" : "OFFLINE"}</span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* LEFT SIDEBAR SUBMENU */}
        <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 space-y-4">
          
          {/* Navigation Items Box */}
          <div className="p-2 sm:p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Menu de Ajustes
            </div>
            
            <nav className="space-y-1">
              {subNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-cyan-500 text-obsidian-950 font-bold shadow-lg shadow-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? "bg-obsidian-950/20 text-obsidian-950" : "bg-slate-800 text-cyan-400"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.name}
                      </div>
                      <div className={`text-[10px] leading-tight truncate mt-0.5 ${isActive ? "text-obsidian-900" : "text-slate-400"}`}>
                        {item.desc}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* External Direct Links */}
            <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                <span>Atalhos Externos</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </div>
              
              <a
                href="http://sentinela.local:5000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent hover:border-cyan-500/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight flex items-center gap-1">
                      Frigate NVR
                      <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">Porta 5000</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                  :5000
                </span>
              </a>

              <a
                href="https://login.tailscale.com/admin/machines"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:text-emerald-300 hover:bg-slate-800/60 border border-transparent hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight flex items-center gap-1">
                      Tailscale Admin
                      <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">VPN Remota</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                  VPN
                </span>
              </a>
            </div>
          </div>


          {/* Quick System Badge Box */}
          <div className="hidden lg:block p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Sentinela Frigate Core</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Plataforma:</span>
                <strong className="text-slate-200">Intel N5105</strong>
              </div>
              <div className="flex justify-between">
                <span>GPU / VAAPI:</span>
                <strong className="text-emerald-400">QSV Ativo</strong>
              </div>
              <div className="flex justify-between">
                <span>Banco de Dados:</span>
                <strong className="text-slate-200">SQLite Async</strong>
              </div>
              <div className="flex justify-between">
                <span>IP Host LAN:</span>
                <strong className="text-cyan-300">192.168.1.252</strong>
              </div>
            </div>
          </div>

        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 w-full">
          {children}
        </main>

      </div>
    </div>
  );
}
