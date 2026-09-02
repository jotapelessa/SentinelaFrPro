# 🛡️ Sentinela Frigate Pro

<div align="center">

![Versão](https://img.shields.io/badge/Versão-SentinelaPro.001.000.000.005-06B6D4?style=for-the-badge&logo=android&logoColor=white)
![Build](https://img.shields.io/badge/Compilador_Codespaces-Gradle_8.5_Java_17-emerald?style=for-the-badge)
![Aceleração](https://img.shields.io/badge/Intel_VAAPI-Jasper_Lake_N5105-blue?style=for-the-badge)
![IA](https://img.shields.io/badge/Inferência-OpenVINO_NPU/GPU-violet?style=for-the-badge)
![Rede](https://img.shields.io/badge/Rede_Segura-Tailscale_VPN-darkblue?style=for-the-badge)

</div>

> **Plataforma de videomonitoramento inteligente, NVR, detecção espacial de movimento (ROI), telemetria de hardware em tempo real, automação de alertas (Telegram Cloud Vault) e aplicativos nativos Android (TV 55" estilo Netflix e Smartphone estilo YouTube).**

Projetada com foco em **eficiência energética extrema e latência sub-50ms** para Mini PCs baseados no processador **Intel Celeron Jasper Lake N5105 (TDP 10W)** com **Ubuntu Server**.

---

## 📱 Aplicativos Nativos Android (`v001.000.000.005`)

O ecossistema conta com compilação interativa automatizada de APKs nativos em Jetpack Compose com Material Design 3 e suporte a D-Pad / Leanback:

### 📺 1. Android TV 55" (Layout Horizontal Estilo Netflix)
* **Aba 1 • Câmeras**: Spotlight imersivo em 5 FPS com foco D-Pad, carrossel horizontal de câmeras permitidas e alternância instantânea para tela cheia.
* **Aba 2 • Capturas**: Catálogo estilo streaming com vídeos e snapshots gravados no SSD NVMe, filtrados por permissão de tela.
* **Aba 3 • Ferramentas**: Testes de velocidade de download (Mbps), medição de ping com o servidor Sentinela e alerta de presença em tempo real.
* **Aba 4 • Logs & Telemetria**: 5 cards de status (Servidor, Tailscale, Uso de CPU, Temperatura e RAM) + Terminal de logs unificados com tags (`SERVIDOR`, `TAILSCALE`, `FRIGATE`, `SENTINELA`, `TELEGRAM`) e botão **"Copiar Todos os Logs"**.
* **Aba 5 • Configurações**: 8 tamanhos de tela PiP, 8 posições de tela PiP, 8 tempos de exibição e seletor rápido de host (`Tailscale`, `Local mDNS` ou `IP Direto`).

### 📱 2. Android Smartphone (Layout Vertical Estilo YouTube)
* **Aba 1 • Câmeras**: Feed vertical contínuo com suporte a gestos de pinça para **Zoom até 5x**.
* **Aba 2 • Capturas**: Linha do tempo de vídeos gravados com badges de detecção (Pessoa, Veículo, Animal) e reprodução rápida.
* **Aba 3 • Ferramentas**: Ferramenta de Speedtest e verificação de rota de rede.
* **Aba 4 • Logs**: Painel de auditoria completo com cópia em um clique para compartilhamento e suporte.
* **Aba 5 • Configurações**: Seletor de servidor ativo e informações de pareamento da tela.

---

## ⚡ Principais Recursos do Servidor & NVR

* 🚀 **Aceleração por Hardware Intel VAAPI**: Decodificação H.264/H.265 pela iGPU Intel UHD Gen11 (`/dev/dri/renderD128`, driver iHD).
* 🧠 **Inferência Neural OpenVINO Calibrada**: Filtros calibrados (Pessoa > 0.72, Veículo > 0.80, Animais > 0.80) com área mínima para eliminar falsos positivos de vegetação e sombras.
* 🎥 **Streaming WebRTC de Ultra-Baixa Latência**: Transmissão nativa com latência *glass-to-glass* inferior a 50ms através do **go2rtc**.
* ⏰ **Linha do Tempo 24h Vertical (/events)**: Visualização responsiva por períodos do dia (*Madrugada, Manhã, Tarde, Noite*) com cartões horários detalhados e filtros imediatos.
* ✈️ **Telegram Cloud Vault com Retry Worker**:
  * Fotos em alta resolução com marca d'água HUD enviadas em menos de 1.2s.
  * Despacho resiliente de vídeos `.mp4` com worker assíncrono de retentativas inteligentes (2s, 3s, 5s, 8s, 10s, 12s) aguardando a finalização da gravação no disco NVMe.
  * Comandos de chat: `/status`, `/snapshot [camera]`, `/pausar [minutos]`.
* 📺 **Gestão de Telas Pareadas (/screens)**:
  * Registro automático de dispositivos com heartbeat a cada 25s.
  * Botão **"Limpar Telas Inativas"** para expurgar dispositivos legados/fictícios com um clique.
  * Auto-migração transparente de colunas no banco de dados SQLite.
* 🔍 **Scanner Universal de Câmeras**:
  * Sondas ONVIF WS-Discovery (UDP 3702) + Varredura concorrente de portas CFTV (554, 8554, 37777, 34567, 4747, 8080/8081).
* 💻 **Interface Glassmorphism Obsidian**:
  * Identificador visual **`SentinelaPro.001.000.000.005`** no Header, Banner e Rodapé Global.

---

## 🚀 Como Compilar os APKs no GitHub Codespaces

1. Acesse o seu Codespaces e abra o terminal:
```bash
cd /workspaces/SentinelaFrPro

# Puxar as últimas atualizações
git pull origin main

# Iniciar o compilador interativo
./compile_apk.sh
```

2. Selecione a opção no menu interativo:
   - `[1]` Android TV (`sentinela.android.tv.001.000.000.005.apk`)
   - `[2]` Android Smartphone (`sentinela.android.smartphone.001.000.000.005.apk`)
   - `[3]` Compilar Ambos

3. Faça o download direto clicando com o botão direito no arquivo gerado no painel de arquivos do Codespaces e selecionando **"Download..."**.

---

## 🖥️ Como Atualizar o Servidor Ubuntu

No terminal do seu **Mini PC / Servidor Ubuntu**:

```bash
cd /caminho/para/SentinelaFrigate

# 1. Puxar todas as atualizações do repositório
git pull origin main

# 2. Reiniciar e reconstruir os containers Docker
docker compose down && docker compose up -d --build
```

Acesse a interface no seu navegador: `http://sentinela.local` ou `http://IP_DO_MINI_PC`.

---

## 🗺️ Mapa de Portas e Serviços

| Serviço | Porta / Protocolo | Finalidade |
| :--- | :--- | :--- |
| **Nginx** | `80` / `443` (TCP) | Ponto de entrada unificado para UI, APIs REST e WebSockets |
| **Frigate NVR** | `5000` (TCP) | API interna e console do Frigate |
| **go2rtc** | `1984` (TCP) / `8555` (TCP/UDP) | Hub WebRTC, MSE e negociação ICE/STUN |
| **RTSP Relay** | `8554` (TCP) | Servidor RTSP local de retransmissão ultrarrápida |
| **Mosquitto** | `1883` (TCP) | Barramento de mensagens MQTT |
| **FastAPI Backend** | `8080` (TCP) | Orchestrator Core, Telegram Vault, PiP Gateway e Telemetria |
| **Next.js Web UI** | `3000` (TCP) | Interface de usuário Glassmorphism |
| **ONVIF Discovery** | `3702` (UDP) | Descoberta automática de câmeras na rede |

---

## 📄 Licença
Distribuído sob a licença MIT. Desenvolvido para máxima segurança, privacidade e controle local de videomonitoramento.
