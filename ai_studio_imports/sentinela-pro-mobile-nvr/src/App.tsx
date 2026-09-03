import React, { useState } from 'react';
import { 
  CameraFeed, 
  TvDevice, 
  CaptureItem, 
  BottomNavTab 
} from './types';
import { 
  INITIAL_CAMERAS, 
  INITIAL_TVS, 
  INITIAL_CAPTURES 
} from './data/mockData';
import { PhoneSimulator } from './components/PhoneSimulator';
import { KotlinCodeViewer } from './components/KotlinCodeViewer';
import { DesignTokensDoc } from './components/DesignTokensDoc';
import { 
  Smartphone, 
  FileCode2, 
  Palette, 
  Star, 
  Zap, 
  Tv, 
  ShieldCheck, 
  Sparkles,
  Info,
  CheckCircle,
  Bell
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<BottomNavTab>('live');
  const [isMasterAdmin, setIsMasterAdmin] = useState<boolean>(true);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<'simulator' | 'code' | 'tokens'>('simulator');
  
  const [cameras, setCameras] = useState<CameraFeed[]>(INITIAL_CAMERAS);
  const [tvDevices, setTvDevices] = useState<TvDevice[]>(INITIAL_TVS);
  const [captures, setCaptures] = useState<CaptureItem[]>(INITIAL_CAPTURES);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // 1. Ação Tirar Snapshot
  const handleTakeSnapshot = (camera: CameraFeed) => {
    const newCap: CaptureItem = {
      id: `cap_${Date.now()}`,
      cameraId: camera.id,
      cameraName: camera.name,
      timestamp: 'Agora mesmo',
      type: 'photo',
      thumbnailUrl: camera.thumbnailUrl,
      fileSize: '3.6 MB (4K UHD)',
      objectDetected: camera.hasMotion ? camera.detectedObject : undefined
    };
    setCaptures([newCap, ...captures]);
    showToast(`📸 Snapshot 4K salvo: ${camera.name}`);
  };

  // 2. Ação Gravar Clipe
  const handleRecordClip = (camera: CameraFeed) => {
    showToast(`🎬 Gravação de 10s iniciada: ${camera.name}`);
    setTimeout(() => {
      const newCap: CaptureItem = {
        id: `cap_${Date.now()}`,
        cameraId: camera.id,
        cameraName: camera.name,
        timestamp: 'Agora mesmo',
        type: 'video',
        duration: '00:10',
        thumbnailUrl: camera.thumbnailUrl,
        fileSize: '14.2 MB (H.265 GPU)',
        objectDetected: camera.hasMotion ? camera.detectedObject : undefined
      };
      setCaptures((prev) => [newCap, ...prev]);
      showToast(`💾 Gravação salva em Capturas: ${camera.name}`);
    }, 2500);
  };

  // 3. Central Master: [🚨 Testar Todas as TVs]
  const handleTestAllTvs = () => {
    setTvDevices((prev) =>
      prev.map((tv) => (tv.isOnline ? { ...tv, isPipActive: true } : tv))
    );
    showToast('🚨 BROADCAST: Disparando PiP em TODAS as Smart TVs!');
  };

  // 4. Central Master: [⚡ Simular Detecção IA]
  const handleSimulateAiDetection = () => {
    setCameras((prev) =>
      prev.map((cam, idx) =>
        idx === 0
          ? {
              ...cam,
              hasMotion: true,
              detectedObject: 'Intruso / Pessoa Detectada (99.1%)'
            }
          : cam
      )
    );
    showToast('⚡ IA Frigate: Pessoa Detectada no Portão Principal!');
  };

  // 5. Central Master: [🔄 Atualizar Status de Rede]
  const handleRefreshNetwork = () => {
    setTvDevices((prev) =>
      prev.map((tv) => ({
        ...tv,
        lastPingMs: tv.isOnline ? Math.floor(Math.random() * 15) + 10 : 999
      }))
    );
    showToast('🔄 Rede Tailscale / Mesh atualizada com sucesso!');
  };

  // 6. Central Master: Teste Individual PiP
  const handleTestTvPip = (tv: TvDevice) => {
    setTvDevices((prev) =>
      prev.map((item) =>
        item.id === tv.id ? { ...item, isPipActive: !item.isPipActive } : item
      )
    );
    showToast(`📡 Comando PiP enviado para: ${tv.name}`);
  };

  const handleDeleteCapture = (id: string) => {
    setCaptures((prev) => prev.filter((c) => c.id !== id));
    showToast('🗑️ Captura excluída');
  };

  return (
    <div className="min-h-screen w-full bg-[#090D16] text-[#FFFFFF] flex flex-col font-sans selection:bg-[#22D3EE] selection:text-black">
      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#111827]/95 border border-[#22D3EE] text-white text-xs font-mono font-bold shadow-2xl flex items-center gap-2 animate-bounce backdrop-blur-md">
          <Bell className="w-4 h-4 text-[#22D3EE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="w-full bg-[#0F0F13] border-b border-[#1F2937] px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Project Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111827] border border-[#06B6D4] flex items-center justify-center shadow-lg shadow-[#06B6D4]/10">
              <ShieldCheck className="w-6 h-6 text-[#22D3EE]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-wider text-white">
                  SENTINELA PRO
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE] text-[#22D3EE] text-[10px] font-mono font-bold">
                  ANDROID JETPACK COMPOSE
                </span>
                {isMasterAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B] text-[#FDE68A] text-[10px] font-mono font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                    <span>MASTER ADMIN</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#94A3B8]">
                Mobile NVR (CFTV & Central Master) • Moto G54 5G 120Hz Spec
              </p>
            </div>
          </div>

          {/* Master Admin Toggle & Quick Triggers */}
          <div className="flex items-center gap-3">
            {/* Master Toggle */}
            <div className="flex items-center gap-2 bg-[#111827] px-3 py-1.5 rounded-xl border border-[#1F2937]">
              <span className="text-xs font-mono text-[#94A3B8] hidden sm:inline">
                is_master_admin:
              </span>
              <button
                onClick={() => {
                  const next = !isMasterAdmin;
                  setIsMasterAdmin(next);
                  if (!next && currentTab === 'master') setCurrentTab('live');
                  showToast(next ? '⭐ Modo Master Admin Habilitado!' : '🔒 Modo Usuário Padrão');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isMasterAdmin
                    ? 'bg-[#F59E0B] text-black shadow-md shadow-[#F59E0B]/20'
                    : 'bg-[#1F2937] text-[#64748B]'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isMasterAdmin ? 'fill-black' : ''}`} />
                <span>{isMasterAdmin ? 'TRUE (VIP)' : 'FALSE'}</span>
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
              <button
                onClick={() => setActiveWorkspaceView('simulator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                  activeWorkspaceView === 'simulator'
                    ? 'bg-[#22D3EE] text-black shadow'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Simulador</span>
              </button>

              <button
                onClick={() => setActiveWorkspaceView('code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                  activeWorkspaceView === 'code'
                    ? 'bg-[#22D3EE] text-black shadow'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <FileCode2 className="w-4 h-4" />
                <span className="hidden sm:inline">Kotlin .kt</span>
              </button>

              <button
                onClick={() => setActiveWorkspaceView('tokens')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all ${
                  activeWorkspaceView === 'tokens'
                    ? 'bg-[#22D3EE] text-black shadow'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Design Tokens</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Phone Simulator (Moto G54 5G) */}
        <div className={`lg:col-span-6 flex flex-col items-center justify-center ${
          activeWorkspaceView === 'simulator' ? 'block' : 'hidden lg:flex'
        }`}>
          <div className="w-full flex items-center justify-between mb-3 px-2 text-xs font-mono text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span className="text-white font-bold">Moto G54 5G Preview (412x915dp)</span>
            </div>
            <span>One-Hand Ergonomics</span>
          </div>

          <PhoneSimulator
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            isMasterAdmin={isMasterAdmin}
            cameras={cameras}
            tvDevices={tvDevices}
            captures={captures}
            onTakeSnapshot={handleTakeSnapshot}
            onRecordClip={handleRecordClip}
            onTestAllTvs={handleTestAllTvs}
            onSimulateAiDetection={handleSimulateAiDetection}
            onRefreshNetwork={handleRefreshNetwork}
            onTestTvPip={handleTestTvPip}
            onToggleMasterAdmin={setIsMasterAdmin}
            onDeleteCapture={handleDeleteCapture}
          />
        </div>

        {/* Right Column: Code Studio & Design Tokens & Control Deck */}
        <div className={`lg:col-span-6 flex flex-col gap-4 h-full ${
          activeWorkspaceView === 'simulator' ? 'hidden lg:flex' : 'block'
        }`}>
          {activeWorkspaceView === 'tokens' ? (
            <DesignTokensDoc />
          ) : (
            <div className="h-[830px] flex flex-col gap-3">
              <KotlinCodeViewer />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="w-full bg-[#0F0F13] border-t border-[#1F2937] py-2 px-4 text-center text-[11px] font-mono text-[#64748B]">
        Sentinela Pro Mobile NVR • Jetpack Compose 1.7+ & Material 3 • Design Tokens Obsidian & Master Gold
      </footer>
    </div>
  );
}
