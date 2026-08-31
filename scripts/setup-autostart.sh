#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " 🛡️  SENTINELA FRIGATE PRO - AUTOSTART CONFIGURATOR"
echo "=========================================================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURRENT_USER="$(whoami)"

echo "📂 Diretório do projeto detectado: $PROJECT_DIR"
echo "👤 Executando como usuário: $CURRENT_USER"

# 1. Habilitar o Docker daemon no boot do sistema
echo "⚙️  [1/4] Habilitando Docker e Containerd no boot..."
sudo systemctl enable docker.service
sudo systemctl enable containerd.service

# 2. Criar a unidade de serviço Systemd
SERVICE_PATH="/etc/systemd/system/sentinela.service"
echo "📝 [2/4] Instalando serviço em $SERVICE_PATH..."

sudo tee "$SERVICE_PATH" > /dev/null <<SERVICE_EOF
[Unit]
Description=Sentinela Frigate Pro - Sistema CFTV & NVR Inteligente
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
User=$CURRENT_USER
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose stop
TimeoutStartSec=300
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# 3. Recarregar e ativar
echo "🔄 [3/4] Recarregando systemd daemon..."
sudo systemctl daemon-reload

echo "🚀 [4/4] Habilitando e iniciando sentinela.service..."
sudo systemctl enable sentinela.service
sudo systemctl start sentinela.service

echo ""
echo "=========================================================="
echo " ✅ SUCESSO: Inicialização automática configurada!"
echo " Todos os contêineres subirão automaticamente no boot."
echo "=========================================================="
echo ""
sudo systemctl status sentinela.service --no-pager
