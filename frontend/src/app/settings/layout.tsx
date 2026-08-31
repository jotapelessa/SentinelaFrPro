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
  ChevronRight
} from "lucide-react";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const subNavItems = [
    {
      name: "Telegram & Vault",
      href: "/settings/telegram",
      icon: Send,
      desc: "Token, Chat ID, alertas e comandos",
      color: "text-sky-400"
    },
    {
      name: "Backup & Dados",
      href: "/settings/backup",
      icon: HardDrive,
      desc: "Download SQLite, snapshot e restauração",
      color: "text-emerald-400"
    },
    {
      name: "Diagnósticos",
      href: "/settings/diagnostics",
      icon: Activity,
      desc: "Hardware N5105, VAAPI, MQTT e streams",
      color: "text-cyan-400"
    },
    {
      name: "Logs do Sistema",
      href: "/settings/logs",
      icon: Terminal,
      desc: "Visualizador de logs em tempo real",
      color: "text-amber-400"
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Link href="/settings" className="hover:text-cyan-400 transition-colors">Ajustes</Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-bold">
                {subNavItems.find((item) => pathname === item.href)?.name || "Visão Geral"}
              </span>
            </div>
            <h1 className="text-lg font-black text-white tracking-wide">
              Central de Ajustes & Infraestrutura
            </h1>
          </div>
        </div>

        {/* Quick Nav Chips */}
        <div className="flex flex-wrap items-center gap-1.5 bg-obsidian-950/80 p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-cyan-500 text-obsidian-950 font-bold shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-obsidian-950" : item.color}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Settings Body */}
      <div>{children}</div>
    </div>
  );
}
