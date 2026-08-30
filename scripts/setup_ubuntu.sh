#!/usr/bin/env bash
# ==============================================================================
# 🛡️ SENTINELA FRIGATE PRO — SCRIPT DE PREPARAÇÃO E DEPLOY (UBUNTU SERVER)
# Alvo: Intel Celeron Jasper Lake N5105 / iGPU UHD Gen11 / Tailscale
# ==============================================================================

set -e

echo "========================================================"
echo "🛡️  INICIANDO PREPARAÇÃO DO SERVIDOR SENTINELA FRIGATE PRO"
echo "========================================================"

# 1. Atualização do Sistema
echo "📦 1. Atualizando pacotes do sistema Ubuntu..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Instalação de Utilitários e Drivers Intel VAAPI / QSV
echo "🚀 2. Instalando drivers Intel iHD, VAAPI e ferramentas de diagnóstico..."
sudo apt-get install -y --no-install-recommends \
    curl \
    git \
    vainfo \
    intel-media-va-driver-non-free \
    i965-va-driver-shaders \
    mesa-va-drivers \
    libva-drm2 \
    htop \
    lm-sensors \
    ufw \
    net-tools

# 3. Verificação do Dispositivo de GPU Intel (/dev/dri/renderD128)
echo "🔍 3. Verificando aceleração gráfica Intel Jasper Lake..."
if [ -e /dev/dri/renderD128 ]; then
    echo "✅ /dev/dri/renderD128 encontrado com sucesso!"
    sudo chmod 666 /dev/dri/renderD128 || true
    sudo usermod -aG render $USER || true
    sudo usermod -aG video $USER || true
else
    echo "⚠️ AVISO: /dev/dri/renderD128 não detectado. Verifique os drivers Intel no BIOS."
fi

# 4. Instalação do Docker e Docker Compose (se não existirem)
if ! command -v docker &> /dev/null; then
    echo "🐳 4. Instalando Docker Engine oficial..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker já instalado."
fi

# 5. Instalação e Configuração do Tailscale (Opcional)
if ! command -v tailscale &> /dev/null; then
    echo "🔒 5. Instalando Tailscale Mesh VPN..."
    curl -fsSL https://tailscale.com/install.sh | sh
    echo "💡 Para conectar seu servidor à rede mesh Tailscale, execute: sudo tailscale up"
else
    echo "✅ Tailscale já instalado."
fi

# 6. Criação de Pastas de Mídia e Permissões no SSD NVMe
echo "💾 6. Configurando diretórios de gravação e banco de dados..."
mkdir -p frigate/storage frigate/config mosquitto/data mosquitto/log backend/data

# 7. Configuração do Firewall UFW
echo "🛡️ 7. Configurando regras de firewall UFW..."
sudo ufw allow 80/tcp comment 'Sentinela Web UI (Nginx)'
sudo ufw allow 443/tcp comment 'Sentinela Web UI SSL'
sudo ufw allow 8554/tcp comment 'go2rtc RTSP Feed'
sudo ufw allow 8555/tcp comment 'go2rtc WebRTC TCP'
sudo ufw allow 8555/udp comment 'go2rtc WebRTC UDP'
sudo ufw allow 1984/tcp comment 'go2rtc API'
sudo ufw allow 3702/udp comment 'ONVIF Discovery'

echo "========================================================"
echo "✅ SERVIDOR PREPARADO COM SUCESSO!"
echo "Para iniciar o Sentinela Frigate Pro execute:"
echo "   docker compose up -d"
echo "========================================================"
