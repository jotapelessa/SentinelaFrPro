import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ScannerModal } from "@/components/ScannerModal";
import { AlertToast } from "@/components/AlertToast";
import { WebSocketProvider } from "@/components/WebSocketProvider";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export const metadata: Metadata = {
  title: "Sentinela Frigate Pro — NVR & Monitoramento Inteligente",
  description: "Plataforma de alta performance para videomonitoramento, aceleração gráfica Intel e automação de segurança.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sentinela Pro"
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  }
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-obsidian-950 text-slate-100 min-h-screen flex flex-col antialiased">
        <WebSocketProvider>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
            {children}
          </main>
          <footer className="w-full border-t border-slate-900 bg-obsidian-950/80 backdrop-blur-sm py-3 px-4 text-center">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-300 font-bold">Sentinela Frigate Pro</span>
                <span>• NVR Inteligente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold text-[11px]">
                  SentinelaPro.001.000.000.049
                </span>
                <span className="text-slate-600">|</span>
                <span>Intel Jasper Lake N5105 QSV</span>
              </div>
            </div>
          </footer>
          <ScannerModal />
          <AlertToast />
        </WebSocketProvider>
      </body>
    </html>
  );
}
