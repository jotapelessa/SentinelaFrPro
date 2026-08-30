#!/usr/bin/env bash
# Dispara um evento simulado de detecção via API do Sentinela
CAMERA=${1:-"portao_principal"}
LABEL=${2:-"person"}

echo "🚨 Disparando evento de teste para a câmera '$CAMERA' com objeto '$LABEL'..."

curl -s -X POST http://localhost:8080/api/devices/test-pip \
  -H "Content-Type: application/json" \
  -d "{\"camera_name\": \"$CAMERA\", \"label\": \"$LABEL\"}" | python3 -m json.tool

echo ""
echo "✅ Evento disparado! Verifique a interface web e as Smart TVs pareadas."
