# 🛡️ Sentinela Frigate Pro

> Plataforma de videomonitoramento inteligente, NVR, detecção espacial de movimento (ROI), telemetria de hardware em tempo real e automação de alertas (Telegram Cloud Vault e PiP em Smart TVs via Tailscale).

Projetada com foco em **eficiência energética extrema e latência sub-50ms** para Mini PCs baseados no processador **Intel Celeron Jasper Lake N5105 (TDP 10W)** com **Ubuntu Server**.

---

## ⚡ Principais Recursos & SLAs

* 🚀 **Aceleração por Hardware Intel VAAPI**: Decodificação H.264/H.265 pela iGPU Intel UHD Gen11 (`/dev/dri/renderD128`, driver iHD).
* 🧠 **Inferência Neural OpenVINO**: Tempo de inferência < 15ms por frame com baixo consumo de CPU (8% a 12% em standby para 4 câmeras).
* 🎥 **Streaming WebRTC de Ultra-Baixa Latência**: Transmissão nativa com latência *glass-to-glass* inferior a 50ms através do **go2rtc**.
* 🚨 **Zonas de Interesse (ROI)**: Alertas qualificados quando Pessoas, Carros, Motos ou Animais entram em perímetros específicos.
* ✈️ **Telegram Cloud Vault**:
  * Fotos em alta resolução com marca d'água HUD automática enviadas em menos de 1.2s.
  * Despacho automático do clipe `.mp4` ao término de cada evento consolidado.
  * Comandos de chat: `/status`, `/snapshot [camera]`, `/pausar [minutos]`.
* 📺 **Gateway Picture-in-Picture (PiP) & Tailscale**:
  * Disparo de janelas flutuantes em Smart TVs Android/Fire TV (PiP-Up / Notifications for Android TV) e tablets.
  * Comunicação direta via rede privada **Tailscale Mesh** sem necessidade de abrir portas no roteador.
* 🔍 **Scanner Universal de Câmeras**:
  * Sondas ONVIF WS-Discovery (UDP 3702) + Varredura concorrente de portas CFTV (554, 8554, 37777, 34567, 4747, 8080/8081).
  * Exportação de IPs e URLs RTSP em lote.
* 💻 **Interface Glassmorphism Obsidian**:
  * Dark theme imersivo (`#080D14`) construído em Next.js 14, Tailwind CSS e Zustand.
  * Header persistente com telemetria viva de CPU, Temperatura, RAM, SSD NVMe e Rede.

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

## 🚀 Como Iniciar

### 1. Preparação Rápida no Ubuntu Server (Mini PC)
```bash
# Executar script automatizado de preparação (drivers Intel, Docker, UFW)
chmod +x scripts/setup_ubuntu.sh
./scripts/setup_ubuntu.sh
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
# Edite o .env para adicionar seu TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID (se desejar)
```

### 3. Subir o Ecossistema
```bash
# Iniciar todos os serviços via Docker Compose
docker compose up -d

# Ou simplesmente:
make start
```

Acesse a interface no seu navegador: `http://localhost` ou `http://IP_DO_MINI_PC`.

---

## 🧪 Testes e Diagnósticos

```bash
# Executar testes unitários do backend
make test

# Disparar um evento simulado de intrusão para testar alertas na Web UI e Smart TV
make simulate

# Consultar telemetria de hardware via terminal
make status
```

---

## 🔒 Segurança e Acesso Remoto com Tailscale

1. No servidor Ubuntu, inicie o Tailscale: `sudo tailscale up`.
2. No seu celular, tablet ou Smart TV Android, instale o app Tailscale e conecte-se à mesma conta.
3. Acesse a interface do Sentinela diretamente pelo IP Tailscale do Mini PC (ex: `http://100.x.y.z`).
4. Cadastre o IP Tailscale das suas Smart TVs na aba **Telas Pareadas** para que o gateway PiP envie notificações em qualquer lugar do mundo com criptografia de ponta a ponta.

---

## 📄 Licença
Distribuído sob a licença MIT. Desenvolvido para máxima segurança, privacidade e controle local de videomonitoramento.
