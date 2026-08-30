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
          <ScannerModal />
          <AlertToast />
        </WebSocketProvider>
      </body>
    </html>
  );
}
