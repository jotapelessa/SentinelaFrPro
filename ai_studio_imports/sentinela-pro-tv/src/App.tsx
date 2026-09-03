import React, { useState, useEffect, useCallback } from 'react';
import { TvTab, TvFocusZone, CameraEntity, PipAlert, TvSettingsState } from './types/tv';
import { MOCK_CAMERAS, MOCK_PIP_ALERT } from './data/mockData';
import { TvSidebar } from './components/tv/TvSidebar';
import { TvHeroSpotlight } from './components/tv/TvHeroSpotlight';
import { TvCameraCarousel } from './components/tv/TvCameraCarousel';
import { TvPipFloatingWindow } from './components/tv/TvPipFloatingWindow';
import { TvRecordingsView } from './components/tv/TvRecordingsView';
import { TvToolsView } from './components/tv/TvToolsView';
import { TvLogsView } from './components/tv/TvLogsView';
import { TvSettingsView } from './components/tv/TvSettingsView';
import { TvRemoteSimulator } from './components/tv/TvRemoteSimulator';
import { KotlinCodeModal } from './components/tv/KotlinCodeModal';
import { tvAudio } from './utils/audioFeedback';
import { FileCode, Sparkles, Tv as TvIcon, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TvTab>('CAMERAS');
  const [cameras, setCameras] = useState<CameraEntity[]>(MOCK_CAMERAS);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);

  // D-Pad Navigation State
  const [focusedZone, setFocusedZone] = useState<TvFocusZone>('CAROUSEL');
  const [focusedSidebarIndex, setFocusedSidebarIndex] = useState<number>(0);
  const [focusedCarouselIndex, setFocusedCarouselIndex] = useState<number>(0);

  // Modals & Overlays
  const [pipAlert, setPipAlert] = useState<PipAlert | null>(MOCK_PIP_ALERT);
  const [isKotlinModalOpen, setIsKotlinModalOpen] = useState<boolean>(false);
  const [isTvAspectLocked, setIsTvAspectLocked] = useState<boolean>(false);
  const [isFullscreenSpotlight, setIsFullscreenSpotlight] = useState<boolean>(false);

  // Global Settings State
  const [settings, setSettings] = useState<TvSettingsState>({
    resolution: '4K',
    audioFeedback: true,
    h265HardwareDecoder: true,
    autoPipOnIntrusion: true,
    pipTimeoutSeconds: 12,
    tailscaleStatus: 'CONNECTED',
    tailscaleIp: '100.84.21.9',
    dpadSensitivity: 'HIGH',
    theme: 'TV_OBSIDIAN',
  });

  const selectedCamera = cameras[selectedCameraIndex] || cameras[0];

  const handleUpdateSettings = (updated: Partial<TvSettingsState>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  // Trigger recording toggle on selected camera
  const handleToggleRecord = () => {
    setCameras((prev) =>
      prev.map((c, i) =>
        i === selectedCameraIndex ? { ...c, isRecording: !c.isRecording } : c
      )
    );
  };

  // D-Pad Action Handlers
  const handleDpadUp = useCallback(() => {
    tvAudio.playFocusTick();
    if (focusedZone === 'SIDEBAR') {
      setFocusedSidebarIndex((prev) => Math.max(0, prev - 1));
    } else if (focusedZone === 'CAROUSEL') {
      setFocusedZone('HERO');
    }
  }, [focusedZone]);

  const handleDpadDown = useCallback(() => {
    tvAudio.playFocusTick();
    if (focusedZone === 'SIDEBAR') {
      setFocusedSidebarIndex((prev) => Math.min(4, prev + 1));
    } else if (focusedZone === 'HERO') {
      setFocusedZone('CAROUSEL');
    }
  }, [focusedZone]);

  const handleDpadLeft = useCallback(() => {
    tvAudio.playFocusTick();
    if (focusedZone === 'CAROUSEL') {
      if (focusedCarouselIndex === 0) {
        setFocusedZone('SIDEBAR');
      } else {
        const nextIdx = Math.max(0, focusedCarouselIndex - 1);
        setFocusedCarouselIndex(nextIdx);
        setSelectedCameraIndex(nextIdx);
      }
    } else if (focusedZone === 'HERO') {
      setFocusedZone('SIDEBAR');
    }
  }, [focusedZone, focusedCarouselIndex]);

  const handleDpadRight = useCallback(() => {
    tvAudio.playFocusTick();
    if (focusedZone === 'SIDEBAR') {
      setFocusedZone('CAROUSEL');
    } else if (focusedZone === 'CAROUSEL') {
      const nextIdx = Math.min(cameras.length - 1, focusedCarouselIndex + 1);
      setFocusedCarouselIndex(nextIdx);
      setSelectedCameraIndex(nextIdx);
    }
  }, [focusedZone, focusedCarouselIndex, cameras.length]);

  const handleDpadCenter = useCallback(() => {
    tvAudio.playSelectSound();
    if (focusedZone === 'SIDEBAR') {
      const tabs: TvTab[] = ['CAMERAS', 'CAPTURES', 'TOOLS', 'LOGS', 'SETTINGS'];
      setActiveTab(tabs[focusedSidebarIndex]);
      setFocusedZone('CAROUSEL');
    } else if (focusedZone === 'HERO') {
      setIsFullscreenSpotlight((prev) => !prev);
    } else if (focusedZone === 'CAROUSEL') {
      setSelectedCameraIndex(focusedCarouselIndex);
    }
  }, [focusedZone, focusedSidebarIndex, focusedCarouselIndex]);

  const handleBack = useCallback(() => {
    tvAudio.playBackSound();
    if (isFullscreenSpotlight) {
      setIsFullscreenSpotlight(false);
      return;
    }
    if (isKotlinModalOpen) {
      setIsKotlinModalOpen(false);
      return;
    }
    if (pipAlert) {
      setPipAlert(null);
      return;
    }
    if (focusedZone !== 'SIDEBAR') {
      setFocusedZone('SIDEBAR');
    } else if (activeTab !== 'CAMERAS') {
      setActiveTab('CAMERAS');
    }
  }, [isFullscreenSpotlight, isKotlinModalOpen, pipAlert, focusedZone, activeTab]);

  // Keyboard Event Listener for authentic Android TV D-Pad Simulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when inside input/textarea
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleDpadUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleDpadDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleDpadLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleDpadRight();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleDpadCenter();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          handleBack();
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          setIsKotlinModalOpen((prev) => !prev);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setPipAlert({
            ...MOCK_PIP_ALERT,
            id: `pip-${Date.now()}`,
            timestamp: 'Agora • ' + new Date().toLocaleTimeString('pt-BR'),
          });
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          setIsTvAspectLocked((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDpadUp, handleDpadDown, handleDpadLeft, handleDpadRight, handleDpadCenter, handleBack]);

  return (
    <div className="w-screen h-screen bg-[#070B14] flex flex-col items-center justify-center overflow-hidden">
      {/* Top Banner Bar with Quick Actions & Jetpack Compose CTA */}
      <header className="w-full bg-[#090D18] border-b border-[#1E293B] px-4 py-2 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] shadow-[0_0_10px_#E50914]" />
            <span className="text-white text-[13px] font-extrabold font-heading tracking-wide">
              SENTINELA PRO NVR • ANDROID TV LEANBACK DESIGN SYSTEM
            </span>
          </div>
          <span className="hidden md:inline-flex bg-[#0E1424] text-[#22D3EE] border border-[#06B6D4]/40 text-[10px] font-mono px-2 py-0.5 rounded-full">
            10-Foot UI • Jetpack Compose Native
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              tvAudio.playAlertSound();
              setPipAlert({
                ...MOCK_PIP_ALERT,
                id: `pip-${Date.now()}`,
                timestamp: 'Agora • ' + new Date().toLocaleTimeString('pt-BR'),
              });
            }}
            className="flex items-center gap-1.5 text-[11px] font-mono font-bold bg-[#EF4444]/20 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/50 px-2.5 py-1 rounded-[6px] transition-colors"
          >
            <span>⚠️ Testar PiP</span>
          </button>

          <button
            onClick={() => {
              tvAudio.playSelectSound();
              setIsTvAspectLocked(!isTvAspectLocked);
            }}
            className={`flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-[6px] border transition-colors ${
              isTvAspectLocked
                ? 'bg-[#06B6D4] text-black border-[#06B6D4]'
                : 'bg-[#161F36] text-[#94A3B8] border-[#1E293B] hover:text-white'
            }`}
          >
            <TvIcon className="w-3.5 h-3.5" />
            <span>{isTvAspectLocked ? '16:9 TV Ativado' : 'Proporção 16:9'}</span>
          </button>

          <button
            onClick={() => {
              tvAudio.playSelectSound();
              setIsKotlinModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-[11px] font-mono font-bold bg-[#E50914] hover:bg-[#B80710] text-white px-3 py-1 rounded-[6px] shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all animate-pulse"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Ver Código Kotlin (.kt)</span>
          </button>
        </div>
      </header>

      {/* Main 16:9 Smart TV Canvas Container */}
      <main
        id="tv-main-canvas"
        className={`relative flex-1 w-full overflow-hidden transition-all duration-300 flex items-center justify-center p-0 ${
          isTvAspectLocked ? 'max-w-[1920px] aspect-video border-2 border-[#1E293B] rounded-[16px] my-2 shadow-[0_0_60px_rgba(0,0,0,0.9)]' : ''
        }`}
      >
        <div className="w-full h-full flex flex-row relative bg-[#070B14]">
          {/* 1. SIDEBAR LATERAL À ESQUERDA (250.dp) */}
          <TvSidebar
            activeTab={activeTab}
            focusedZone={focusedZone}
            focusedIndex={focusedSidebarIndex}
            tailscaleIp={settings.tailscaleIp}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setFocusedZone('CAROUSEL');
            }}
          />

          {/* 2. VIEWPORT DE CONTEÚDO À DIREITA (weight(1f)) */}
          <div
            id="tv-viewport-content"
            className="flex-1 h-full p-6 flex flex-col justify-between overflow-hidden relative gap-6"
          >
            {activeTab === 'CAMERAS' && (
              <div className="flex-1 flex flex-col justify-between h-full min-h-0 gap-6">
                {/* Hero Spotlight (selected camera 16:9) */}
                <TvHeroSpotlight
                  camera={selectedCamera}
                  isFocused={focusedZone === 'HERO'}
                  onExpandFullscreen={() => setIsFullscreenSpotlight(true)}
                  onToggleRecord={handleToggleRecord}
                />

                {/* Bottom Horizontal Camera Carousel (320.dp cards) */}
                <TvCameraCarousel
                  cameras={cameras}
                  focusedIndex={focusedCarouselIndex}
                  focusedZone={focusedZone}
                  onFocusCamera={(idx) => {
                    setFocusedCarouselIndex(idx);
                    setSelectedCameraIndex(idx);
                  }}
                  onSelectCamera={(cam) => {
                    const idx = cameras.findIndex((c) => c.id === cam.id);
                    if (idx !== -1) {
                      setFocusedCarouselIndex(idx);
                      setSelectedCameraIndex(idx);
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'CAPTURES' && <TvRecordingsView />}
            {activeTab === 'TOOLS' && <TvToolsView />}
            {activeTab === 'LOGS' && <TvLogsView />}
            {activeTab === 'SETTINGS' && (
              <TvSettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {/* PiP Floating Window Dual-Layer */}
            {pipAlert && (
              <TvPipFloatingWindow
                alert={pipAlert}
                isFocused={focusedZone === 'PIP'}
                onDismiss={() => setPipAlert(null)}
                onExpand={() => {
                  const targetIdx = cameras.findIndex((c) => c.id === pipAlert.cameraId);
                  if (targetIdx !== -1) {
                    setSelectedCameraIndex(targetIdx);
                    setFocusedCarouselIndex(targetIdx);
                    setActiveTab('CAMERAS');
                  }
                  setPipAlert(null);
                }}
              />
            )}
          </div>
        </div>

        {/* Fullscreen Spotlight Modal if toggled */}
        {isFullscreenSpotlight && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="relative flex-1 w-full h-full">
              <img
                src={selectedCamera.thumbnailUrl}
                alt={selectedCamera.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 tv-scanlines" />
              <div className="absolute top-6 left-6 z-10 bg-black/80 backdrop-blur border border-[#1E293B] p-4 rounded-[12px]">
                <div className="flex items-center gap-2">
                  <span className="bg-[#E50914] text-white text-[11px] font-black px-2 py-0.5 rounded">
                    CH0{selectedCamera.channel}
                  </span>
                  <h1 className="text-white text-[22px] font-bold font-heading">
                    {selectedCamera.name}
                  </h1>
                </div>
                <div className="text-[12px] font-mono text-[#22D3EE] mt-1">
                  {selectedCamera.telemetry.resolution} • {selectedCamera.telemetry.fps} FPS • {selectedCamera.telemetry.codec}
                </div>
              </div>

              <button
                onClick={() => setIsFullscreenSpotlight(false)}
                className="absolute top-6 right-6 z-10 bg-[#E50914] text-white px-4 py-2 rounded-[8px] font-mono text-[12px] font-bold shadow-[0_0_20px_rgba(229,9,20,0.6)]"
              >
                [VOLTAR] Fechar Tela Cheia
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Virtual TV Remote Controller Simulator */}
      <TvRemoteSimulator
        onDpadUp={handleDpadUp}
        onDpadDown={handleDpadDown}
        onDpadLeft={handleDpadLeft}
        onDpadRight={handleDpadRight}
        onDpadCenter={handleDpadCenter}
        onBack={handleBack}
        onHome={() => {
          setActiveTab('CAMERAS');
          setFocusedZone('CAROUSEL');
        }}
        onMenu={() => setFocusedZone('SIDEBAR')}
        onTriggerPipAlert={() =>
          setPipAlert({
            ...MOCK_PIP_ALERT,
            id: `pip-${Date.now()}`,
            timestamp: 'Agora • ' + new Date().toLocaleTimeString('pt-BR'),
          })
        }
        onOpenKotlinCode={() => setIsKotlinModalOpen(true)}
        isTvAspectLocked={isTvAspectLocked}
        onToggleTvAspect={() => setIsTvAspectLocked(!isTvAspectLocked)}
      />

      {/* Kotlin Source Code Inspector & Exporter Modal */}
      <KotlinCodeModal
        isOpen={isKotlinModalOpen}
        onClose={() => setIsKotlinModalOpen(false)}
      />
    </div>
  );
}
