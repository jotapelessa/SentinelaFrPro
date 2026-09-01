"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Cpu, 
  Flame, 
  HardDrive, 
  Wifi, 
  Shield, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Zap,
  Server,
  Layers,
  Sparkles,
  Film,
  Image as ImageIcon,
  Bot,
  Loader2,
  TrendingUp,
  BarChart3,
  ListOrdered,
  Video,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Terminal
} from "lucide-react";
import { useSentinelaStore } from "@/store/useSentinelaStore";

export default function DiagnosticsSettingsPage() {
  const { telemetry } = useSentinelaStore();
  const [statsData, setStatsData] = useState<any>(null);
  const [frigateStatus, setFrigateStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingFrigate, setSyncingFrigate] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Benchmark States
  const [runningBench, setRunningBench] = useState<string | null>(null);
  const [benchResult, setBenchResult] = useState<any>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const handleCopyLogs = () => {
    const reportLines = [
      "==================================================",
      " 🛡️ RELATÓRIO DE DIAGNÓSTICO & LOGS SENTINELA ⟷ FRIGATE",
      " Data/Hora: " + new Date().toLocaleString(),
      "==================================================",
      "",
      "--- [STATUS DE HARDWARE & SISTEMA] ---",
      `CPU: ${statsData?.snapshot?.cpu?.usage_percent ?? telemetry?.cpu?.usage_percent ?? 0}% | Temp: ${statsData?.snapshot?.cpu?.temperature_celsius ?? telemetry?.cpu?.temperature_celsius ?? 0}°C`,
      `RAM: ${statsData?.snapshot?.ram?.used_mb ?? telemetry?.ram?.used_mb ?? 0}MB / ${statsData?.snapshot?.ram?.total_mb ?? telemetry?.ram?.total_mb ?? 0}MB`,
      `SSD NVMe: ${statsData?.snapshot?.disk?.free_gb ?? telemetry?.disk?.free_gb ?? 0}GB livres de ${statsData?.snapshot?.disk?.total_gb ?? telemetry?.disk?.total_gb ?? 0}GB`,
      `Rede: RX ${statsData?.snapshot?.network?.rx_kbs ?? telemetry?.network?.rx_kbs ?? 0} KB/s | TX ${statsData?.snapshot?.network?.tx_kbs ?? telemetry?.network?.tx_kbs ?? 0} KB/s`,
      "",
      "--- [STATUS FRIGATE & GO2RTC] ---",
      `Frigate REST API: ${frigateStatus?.frigate_http ? `Conectado (${frigateStatus.frigate_version || "OK"})` : "Desconectado"}`,
      `go2rtc WebRTC Hub: ${frigateStatus?.go2rtc_http ? `${frigateStatus.go2rtc_streams?.length || 0} Streams Ativos (${(frigateStatus.go2rtc_streams || []).join(", ")})` : "Offline"}`,
      `Detectores de IA: ${frigateStatus?.detectors_online ? "Ativo (OpenVINO/VAAPI)" : "Standby/Offline"}`,
      `Câmeras Ativas no NVR: ${(frigateStatus?.cameras_active || []).join(", ") || "Nenhuma"}`,
      `Uptime NVR: ${frigateStatus?.uptime_seconds || 0}s`,
      "",
      "--- [LOGS RECENTES DE SONDAGEM & CONECTIVIDADE] ---"
    ];

    if (frigateStatus?.logs && frigateStatus.logs.length > 0) {
      frigateStatus.logs.forEach((l: any) => {
        reportLines.push(`[${l.timestamp}] [${l.status}] ${l.target} (${l.latency_ms}ms) -> ${l.detail}`);
      });
    } else {
      reportLines.push("Nenhum log de sonda registrado no momento.");
    }

    reportLines.push("");
    reportLines.push("==================================================");

    const fullReport = reportLines.join("\n");
    navigator.clipboard.writeText(fullReport);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 3000);
  };

  const fetchDetailedStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const [resStats, resFrigate] = await Promise.all([
        fetch(`${apiUrl}/telemetry/stats-detailed`),
        fetch(`${apiUrl}/telemetry/frigate-status`)
      ]);
      if (resStats.ok) {
        const data = await resStats.json();
        setStatsData(data);
      }
      if (resFrigate.ok) {
        const fData = await resFrigate.json();
        setFrigateStatus(fData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFrigate = async () => {
    setSyncingFrigate(true);
    setSyncMsg(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/cameras/sync-frigate`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`✅ Sincronização concluída! ${data.synced_cameras} câmera(s) sincronizadas com o Frigate.`);
      } else {
        setSyncMsg(`⚠️ Falha ao sincronizar: ${data.detail || "Erro no Frigate"}`);
      }
    } catch (err: any) {
      setSyncMsg(`⚠️ Erro de conexão: ${err.message}`);
    } finally {
      setSyncingFrigate(false);
      fetchDetailedStats();
    }
  };


  useEffect(() => {
    fetchDetailedStats();
    const interval = setInterval(fetchDetailedStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRunBenchmark = async (type: string) => {
    setRunningBench(type);
    setBenchResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
      const res = await fetch(`${apiUrl}/telemetry/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmark_type: type })
      });
      if (res.ok) {
        const data = await res.json();
        setBenchResult(data);
      } else {
        setBenchResult({ verdict: "ERRO", summary: "Falha ao executar benchmark." });
      }
    } catch (err: any) {
      setBenchResult({ verdict: "ERRO", summary: `Erro de conexão: ${err.message}` });
    } finally {
      setRunningBench(null);
      fetchDetailedStats();
    }
  };

  const cpuLoad = statsData?.snapshot?.cpu?.usage_percent ?? telemetry?.cpu?.usage_percent ?? 0;
  const cpuTemp = statsData?.snapshot?.cpu?.temperature_celsius ?? telemetry?.cpu?.temperature_celsius ?? 35;
  const ramPercent = statsData?.snapshot?.ram?.percent ?? telemetry?.ram?.percent ?? 0;
  const ramUsedMb = statsData?.snapshot?.ram?.used_mb ?? telemetry?.ram?.used_mb ?? 0;
  const ramTotalMb = statsData?.snapshot?.ram?.total_mb ?? telemetry?.ram?.total_mb ?? 0;
  const cores = statsData?.cpu_details?.cores_load || telemetry?.cpu?.cores || [0, 0, 0, 0];
  const diskFreeGb = statsData?.snapshot?.disk?.free_gb ?? telemetry?.disk?.free_gb ?? 0;
  const diskTotalGb = statsData?.snapshot?.disk?.total_gb ?? telemetry?.disk?.total_gb ?? 0;
  const rxSpeed = statsData?.snapshot?.network?.rx_kbs ?? telemetry?.network?.rx_kbs ?? 0;
  const txSpeed = statsData?.snapshot?.network?.tx_kbs ?? telemetry?.network?.tx_kbs ?? 0;

  return (
    <div className="space-y-6">

      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Estatísticas & Monitoramento em Tempo Real</h2>
            <p className="text-xs text-slate-400">Telemetria ao vivo do Ubuntu Linux, Intel Jasper Lake N5105, SSD NVMe e processos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            AO VIVO (3s)
          </span>
          <button
            onClick={fetchDetailedStats}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs border border-slate-700"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Frigate NVR Deep Integration & Auto-Sync Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Integração & Comunicação com Frigate NVR</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-bold">
                  PORTA 5000 / 1984
                </span>
              </div>
              <p className="text-xs text-slate-400">Status dos canais de comunicação REST API, WebSockets, go2rtc e IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLogs}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md ${
                copiedLogs
                  ? "bg-emerald-500 text-obsidian-950 shadow-emerald-500/20"
                  : "bg-cyan-500 hover:bg-cyan-400 text-obsidian-950 shadow-cyan-500/20"
              }`}
              title="Copiar relatório completo e logs recentes para a área de transferência"
            >
              {copiedLogs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLogs ? "✅ Logs Copiados!" : "📋 Copiar Logs de Diagnóstico"}</span>
            </button>

            <button
              onClick={handleSyncFrigate}
              disabled={syncingFrigate}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingFrigate ? "animate-spin text-cyan-400" : ""}`} />
              <span>{syncingFrigate ? "Sincronizando..." : "Sincronizar Câmeras"}</span>
            </button>
            <a
              href="http://frigate.local:5000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <span>Abrir Frigate</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {syncMsg && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
            {syncMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Frigate REST API */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Frigate REST API</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${frigateStatus?.frigate_http ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <strong className="text-xs text-slate-200">
                {frigateStatus?.frigate_http ? `Conectado (${frigateStatus.frigate_version || "OK"})` : "Desconectado"}
              </strong>
            </div>
          </div>

          {/* go2rtc WebRTC Hub */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">go2rtc WebRTC Hub</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${frigateStatus?.go2rtc_http ? "bg-emerald-400" : "bg-rose-500"}`} />
              <strong className="text-xs text-slate-200">
                {frigateStatus?.go2rtc_http ? `${frigateStatus.go2rtc_streams?.length || 0} Streams Ativos` : "Offline"}
              </strong>
            </div>
          </div>

          {/* Detectors Status */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Detectores de IA (OpenVINO / VAAPI)</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${frigateStatus?.detectors_online ? "bg-emerald-400" : "bg-amber-400"}`} />
              <strong className="text-xs text-slate-200">
                {frigateStatus?.detectors_online ? "Multi-Core Ativo" : "Standby"}
              </strong>
            </div>
          </div>

          {/* Active Cameras In Frigate */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-400 block font-semibold">Câmeras no NVR</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <strong className="text-xs text-slate-200">
                {frigateStatus?.cameras_active?.length ? `${frigateStatus.cameras_active.length} Detectando` : "Carregando..."}
              </strong>
            </div>
          </div>
        </div>

        {/* Real-time Probe Communication Logs */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Histórico de Sondas & Conectividade Sentinela ⟷ Frigate
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {frigateStatus?.logs?.length || 0} sondagens registradas
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 p-3 border border-slate-800 font-mono text-[11px] space-y-1.5 select-text">
            {frigateStatus?.logs && frigateStatus.logs.length > 0 ? (
              frigateStatus.logs.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                      log.status === "SUCCESS"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-cyan-300 font-bold shrink-0">{log.target}</span>
                  <span className="text-slate-400 shrink-0">({log.latency_ms}ms)</span>
                  <span className="text-slate-300 truncate">{log.detail}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 py-2 text-center">
                Aguardando primeiras sondas de conectividade...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        
        {/* CPU Total */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              CPU Jasper Lake
            </span>
            <span className="text-xs font-mono font-bold text-cyan-400">{cpuLoad}%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 ${
                  cpuLoad > 80 ? "bg-rose-500" : cpuLoad > 50 ? "bg-amber-500" : "bg-cyan-400"
                }`}
                style={{ width: `${Math.min(cpuLoad, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span>Freq: {statsData?.cpu_details?.frequency_mhz || 2000} MHz</span>
              <span>4 Cores</span>
            </div>
          </div>
        </div>

        {/* Chip Temperature */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-400" />
              Temperatura do Chip
            </span>
            <span className={`text-xs font-mono font-bold ${cpuTemp > 65 ? "text-rose-400" : "text-emerald-400"}`}>
              {cpuTemp}°C
            </span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 ${
                  cpuTemp > 70 ? "bg-rose-500" : cpuTemp > 50 ? "bg-amber-500" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min((cpuTemp / 90) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span>Status Térmico</span>
              <span className="text-emerald-400 font-bold">{cpuTemp < 55 ? "❄️ Saudável" : "⚠️ Aquecido"}</span>
            </div>
          </div>
        </div>

        {/* RAM Memory */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Memória RAM
            </span>
            <span className="text-xs font-mono font-bold text-purple-400">{ramPercent}%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(ramPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span>{ramUsedMb} MB em uso</span>
              <span>Total: {ramTotalMb} MB</span>
            </div>
          </div>
        </div>

        {/* SSD & Network */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-sky-400" />
              Rede & Armazenamento
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">{diskFreeGb} GB livres</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-300">
              <span className="flex items-center gap-1 text-sky-400">↓ RX: {rxSpeed} KB/s</span>
              <span className="flex items-center gap-1 text-teal-400">↑ TX: {txSpeed} KB/s</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 pt-1">
              SSD NVMe: {diskTotalGb} GB Total
            </div>
          </div>
        </div>

      </div>

      {/* 3. Detailed CPU Cores Load & Partitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Per-Core Load */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Distribuição de Carga por Núcleo (4 Cores N5105)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {cores.map((load: number, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Núcleo {idx + 1}</span>
                  <span className="text-cyan-400 font-bold">{load}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      load > 80 ? "bg-rose-500" : load > 50 ? "bg-amber-500" : "bg-cyan-400"
                    }`}
                    style={{ width: `${Math.min(load, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partitions NVMe & RAM Cache */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            Partições SSD NVMe & Cache
          </h3>
          <div className="space-y-3">
            {statsData?.storage_details?.partitions?.map((part: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-200 font-bold">{part.mount}</span>
                  <span className="text-emerald-400">{part.used_gb} GB / {part.total_gb} GB ({part.percent}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(part.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Top Ubuntu Processes Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Processos & Aplicações com Maior Consumo no Ubuntu</h3>
              <p className="text-xs text-slate-400">Monitoramento dos processos em execução ordenados por uso de CPU e Memória RAM</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            TOP 10 PROCESSOS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800/80">
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">Aplicação / Processo</th>
                <th className="py-2.5 px-3">Usuário</th>
                <th className="py-2.5 px-3">Uso de CPU</th>
                <th className="py-2.5 px-3">Memória RAM</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {statsData?.processes?.map((p: any) => (
                <tr key={p.pid} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400">{p.pid}</td>
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {p.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{p.username}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      p.cpu_percent > 30 ? "bg-rose-950/60 text-rose-400 border border-rose-800/50" : "text-cyan-400"
                    }`}>
                      {p.cpu_percent}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{p.memory_mb} MB ({p.memory_percent}%)</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Server Stress & Performance Benchmark Suite */}
      <div className="p-6 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Central de Stress & Benchmarks do Servidor</h2>
              <p className="text-xs text-slate-400">Teste o comportamento do servidor sob carga real em resoluções 1080p, 2K, 4K, IA e imagens</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-amber-400">
            TESTE DE CAPACIDADE
          </span>
        </div>

        {/* Benchmark Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* 1080p Test */}
          <button
            type="button"
            disabled={runningBench !== null}
            onClick={() => handleRunBenchmark("1080p")}
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 transition-all text-left space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <Film className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                1080p
              </span>
            </div>
            <strong className="text-xs font-bold text-white block">Vídeo Full HD</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Testa transcodificação 1920x1080 @ 30 FPS.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
              {runningBench === "1080p" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{runningBench === "1080p" ? "Executando..." : "Rodar 1080p"}</span>
            </div>
          </button>

          {/* 2K Test */}
          <button
            type="button"
            disabled={runningBench !== null}
            onClick={() => handleRunBenchmark("2k")}
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 transition-all text-left space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <Film className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                1440p
              </span>
            </div>
            <strong className="text-xs font-bold text-white block">Vídeo 2K QHD</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Testa carga com 2560x1440 @ 30 FPS.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              {runningBench === "2k" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{runningBench === "2k" ? "Executando..." : "Rodar 2K"}</span>
            </div>
          </button>

          {/* 4K Test */}
          <button
            type="button"
            disabled={runningBench !== null}
            onClick={() => handleRunBenchmark("4k")}
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/50 transition-all text-left space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <Film className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                4K UHD
              </span>
            </div>
            <strong className="text-xs font-bold text-white block">Vídeo 4K Ultra HD</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Avalia o limite extremo 3840x2160.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
              {runningBench === "4k" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{runningBench === "4k" ? "Executando..." : "Rodar 4K"}</span>
            </div>
          </button>

          {/* IA Detection Test */}
          <button
            type="button"
            disabled={runningBench !== null}
            onClick={() => handleRunBenchmark("detection")}
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 transition-all text-left space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <Bot className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                TFLITE
              </span>
            </div>
            <strong className="text-xs font-bold text-white block">Inferência de IA</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Calcula a latência em ms por detecção.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
              {runningBench === "detection" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{runningBench === "detection" ? "Executando..." : "Rodar IA"}</span>
            </div>
          </button>

          {/* Image & HUD Processing */}
          <button
            type="button"
            disabled={runningBench !== null}
            onClick={() => handleRunBenchmark("image_hud")}
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-teal-500/50 transition-all text-left space-y-2 group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <ImageIcon className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">
                100 FOTOS
              </span>
            </div>
            <strong className="text-xs font-bold text-white block">Processamento HUD</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Renderiza 100 fotos com marca d&apos;água.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-teal-400">
              {runningBench === "image_hud" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{runningBench === "image_hud" ? "Executando..." : "Rodar Imagens"}</span>
            </div>
          </button>

        </div>

        {/* Benchmark Results Display Box */}
        {benchResult && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <strong className="text-sm font-bold text-white">{benchResult.benchmark}</strong>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start sm:self-auto ${
                benchResult.verdict === "EXCELENTE" || benchResult.verdict === "ULTRA RÁPIDO" || benchResult.verdict === "PERFEITO"
                  ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-300"
                  : "bg-amber-950/80 border border-amber-500/50 text-amber-300"
              }`}>
                VEREDITO: {benchResult.verdict}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {benchResult.summary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {benchResult.fps && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Velocidade Atingida</span>
                  <strong className="text-base font-bold text-cyan-400">{benchResult.fps} FPS</strong>
                </div>
              )}

              {benchResult.latency_per_frame_ms && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Latência por Frame</span>
                  <strong className="text-base font-bold text-amber-400">{benchResult.latency_per_frame_ms} ms</strong>
                </div>
              )}

              {benchResult.images_per_second && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Taxa de Renderização</span>
                  <strong className="text-base font-bold text-teal-400">{benchResult.images_per_second} fotos/s</strong>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Pico de CPU</span>
                <strong className="text-base font-bold text-white">{benchResult.cpu_usage_peak}%</strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Temperatura Final</span>
                <strong className="text-base font-bold text-emerald-400">{benchResult.temperature}°C</strong>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

