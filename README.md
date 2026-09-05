# 🛡️ Sentinela Frigate Pro

<div align="center">

![Versão](https://img.shields.io/badge/Versão-SentinelaPro.001.000.000.081-06B6D4?style=for-the-badge&logo=android&logoColor=white)
![Build](https://img.shields.io/badge/Status-Estável-emerald?style=for-the-badge)
![GitHub Releases](https://img.shields.io/badge/GitHub_Releases-v001.000.000.081-success?style=for-the-badge&logo=github)
![Frigate](https://img.shields.io/badge/Frigate_NVR-v0.17--0882103-blue?style=for-the-badge)
![go2rtc](https://img.shields.io/badge/go2rtc-v1.9.9--WebRTC-orange?style=for-the-badge)
![OpenVINO](https://img.shields.io/badge/OpenVINO-2024.5.0-purple?style=for-the-badge)
![Tailscale](https://img.shields.io/badge/Tailscale-Mesh_VPN-3B82F6?style=for-the-badge)
![Versão](https://img.shields.io/badge/Versão-SentinelaPro.001.000.000.081-06B6D4?style=for-the-badge&logo=android&logoColor=white)
![Build](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=githubactions)
![GitHub Releases](https://img.shields.io/badge/GitHub_Releases-v001.000.000.081-success?style=for-the-badge&logo=github)
![Arquitetura](https://img.shields.io/badge/Plataforma-Android%20TV%20%7C%20Smartphone%20%7C%20Web%20%7C%20Ubuntu-8A2BE2?style=for-the-badge)

</div>

---

## 🎯 Visão Geral
O **SentinelaFrigate PRO** é um sistema completo de videomonitoramento de nível empresarial desenvolvido para alta performance, baixa latência e total soberania de dados. Projetado para rodar em hardware de baixo consumo (Intel Jasper Lake Celeron N5105 com aceleração QuickSync e OpenVINO), integra o melhor do ecossistema de visão computacional em uma arquitetura de microsserviços blindada e moderna.

---

## 📥 Download dos APKs Oficiais (`v001.000.000.081`)

Baixe os aplicativos diretamente na página de [GitHub Releases](https://github.com/jotapelessa/SentinelaFrPro/releases/tag/v001.000.000.081):

* 📺 **[Download Android TV APK (v001.000.000.081)](https://github.com/jotapelessa/SentinelaFrPro/releases/download/v001.000.000.081/sentinela-android-tv-v001.000.000.081.apk)**  
  *(Ou baixe sempre a última versão: [sentinela-android-tv-latest.apk](https://github.com/jotapelessa/SentinelaFrPro/releases/download/v001.000.000.081/sentinela-android-tv-latest.apk))*
* 📱 **[Download Smartphone APK (v001.000.000.081)](https://github.com/jotapelessa/SentinelaFrPro/releases/download/v001.000.000.081/sentinela-smartphone-v001.000.000.081.apk)**  
  *(Ou baixe sempre a última versão: [sentinela-smartphone-latest.apk](https://github.com/jotapelessa/SentinelaFrPro/releases/download/v001.000.000.081/sentinela-smartphone-latest.apk))*

---

## 📱 Aplicativos Nativos Android (`v001.000.000.081`)

### 📺 1. Android TV 55" (Layout Horizontal Estilo Netflix)
* **Aba 1 • Câmeras**: Spotlight imersivo com navegação D-Pad, carrossel dinâmico e alternância para tela cheia instantânea.
* **Aba 2 • Capturas (Modo Foto HD de Baixa Memória)**: Visualização estática em Full HD via Coil (`RGB_565`), eliminando buffers de vídeo pesados e reduzindo o uso de RAM em 93% (< 12MB).
* **Aba 3 • Ferramentas & Telemetria**: Medição de ping contra o servidor Sentinela, handshake com relatório de IP, tipo de rede (Ethernet/Wi-Fi/4G), velocidade em Mbps, versão do app e logs de diagnóstico transmitidos para a interface web `/screens`.
* **Aba 4 • Logs**: Terminal com cópia rápida e diagnóstico de conectividade.
* **Aba 5 • Configurações**: Resolução de host por Tailscale ou rede local, configurações de tamanho e duração de PiP.
* **⚡ PiP Instantâneo em Hardware H.264**: Consumo do stream acelerado por GPU Intel (`camera_principal_h264`), abrindo o vídeo flutuante em menos de 180ms.
* **✅ Confirmação Real de Exibição (ACK)**: O overlay só confirma a execução após a janela ser fisicamente renderizada no `WindowManager` da TV, reportando o status ao servidor.
* **💤 Economia Total em Segundo Plano**: Observador de ciclo de vida (`LifecycleEventObserver`) que desliga decodificadores e WebSockets ao minimizar o app (0% CPU e 0% tráfego de rede em background).

### 📱 2. Android Smartphone (Layout Vertical Estilo YouTube)
* **Aba 1 • Câmeras**: Feed vertical contínuo com suporte a toque e **Zoom digital de 5x**.
* **Aba 2 • Capturas**: Galeria responsiva de detecções e eventos.
* **Aba 3 • Master Central VIP**:
  * Controle de disparos de alertas PiP individuais ou em massa para todas as Smart TVs.
  * Verificação com feedback em tempo real (`✅ Confirmado pela TV` ou `⚠️ TV não respondeu`).
  * Edição de permissões de cada dispositivo pareado (`Ativo`, `Pausado`, `Bloqueado`, tamanho e tempo do PiP) sincronizada bidirecionalmente com o painel web `/screens`.
  * Atualização automática via WebSocket para eventos de configuração e pareamento.
* **Aba 4 • Ferramentas**: Teste de velocidade de rede com gauge em tempo real.
* **Aba 5 • Logs**: Painel unificado de auditoria com exportação em um clique.
* **Aba 6 • Ajustes**: Identificação imutável de hardware (`ANDROID_ID`), nome e versão.
* **📐 Barra de Navegação Ergonômica**: Altura de `68.dp`, tipografia balanceada e rótulo "Ferramentas" perfeitamente alinhado sem quebra ou cortes de texto.
* **💤 Pausa de Streaming em Segundo Plano**: Corta tráfego de dados e poupa 100% da bateria quando a tela é bloqueada ou outro app é aberto.

---

## ⚡ Principais Recursos do Servidor & NVR

* 🚀 **Aceleração por Hardware Intel Jasper Lake (QSV/VAAPI)**: Decodificação e transcodificação por GPU Intel UHD Gen11 (`/dev/dri/renderD128`).
* 🧠 **Inferência Neural OpenVINO Calibrada**: Rastreamento de objetos (pessoas, veículos e animais) sem falsos positivos.
* 🎥 **go2rtc Streaming Engine**: Distribuição de streams MSE, WebRTC e RTSP com latência ultra-baixa.
* 📺 **Painel de Telas e Dispositivos (`/screens`)**:
  * Sincronização por ID imutável de hardware, imune a mudanças de IP (DHCP ou alternância Wi-Fi / 4G).
  * Teste individual com feedback ao vivo de renderização física de tela.
  * Disparos em lote de PiP com broadcast WebSocket e suporte a Google Cast.
* ✈️ **Telegram Cloud Vault**: Notificações instantâneas com snapshots HUD e despacho de clipes `.mp4`.
* 🤖 **CI/CD Automatizado no GitHub Actions**: Compilação e publicação automática de releases e APKs para TV e Smartphone em cada push para a branch `main`.

---

## 🚀 Como Compilar os APKs no GitHub Codespaces

1. Abra o terminal no seu GitHub Codespaces:
```bash
cd /workspaces/SentinelaFrPro

# Atualizar o código
git pull origin main

# Iniciar o compilador interativo
./compile_apk.sh
```

2. Escolha a opção desejada no menu:
   - `[1]` Android TV (`BETA.sentinela.android.tv.001.000.000.081.apk`)
   - `[2]` Android Smartphone (`BETA.sentinela.android.smartphone.001.000.000.081.apk`)
   - `[3]` Compilar Ambos (TV e Smartphone)

3. Ao final da compilação, o script permite publicar a nova versão diretamente no GitHub Releases via `gh CLI` ou baixar o arquivo pelo menu lateral do Codespaces.

---

## 🖥️ Como Atualizar o Servidor Ubuntu

No terminal do seu **Mini PC / Servidor Ubuntu**:

```bash
cd /caminho/para/SentinelaFrPro

# 1. Puxar todas as atualizações do repositório
git pull origin main

# 2. Reiniciar os serviços atualizados
docker compose restart backend
docker compose build frontend && docker compose up -d frontend
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
| **FastAPI Backend** | `8080` (TCP) | Core REST, Telegram Vault, PiP Gateway com ACK e Telemetria |
| **Next.js Web UI** | `3000` (TCP) | Interface Web Glassmorphism (`/screens`, `/events`, etc.) |
| **ONVIF Discovery** | `3702` (UDP) | Descoberta automática de câmeras na rede local |

---

## 📄 Licença
Distribuído sob a licença MIT. Desenvolvido para máxima segurança, privacidade e controle local de videomonitoramento.
