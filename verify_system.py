#!/usr/bin/env python3
import asyncio
import httpx
import os
import sys
import json
import subprocess

async def verify_system():
    print("\n" + "="*60)
    print("🛡️ SENTINELA FRIGATE PRO — AUDITORIA DE INTEGRAÇÃO DO SISTEMA")
    print("="*60 + "\n")

    results = []

    # 1. Frigate NVR REST API
    frigate_url = os.getenv("FRIGATE_API_URL", "http://localhost:5000")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{frigate_url}/api/version")
            if res.status_code == 200:
                results.append(("Frigate NVR REST API", "ONLINE", f"Versão {res.text.strip()} em {frigate_url}"))
            else:
                results.append(("Frigate NVR REST API", "AVISO", f"HTTP {res.status_code}"))
    except Exception as e:
        results.append(("Frigate NVR REST API", "OFFLINE", f"Não foi possível conectar em {frigate_url}: {e}"))

    # 2. go2rtc WebRTC Hub
    go2rtc_url = os.getenv("GO2RTC_API_URL", "http://localhost:1984")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{go2rtc_url}/api/streams")
            if res.status_code == 200:
                streams = list(res.json().keys())
                results.append(("go2rtc WebRTC Hub", "ONLINE", f"{len(streams)} streams ativos: {', '.join(streams)}"))
            else:
                results.append(("go2rtc WebRTC Hub", "AVISO", f"HTTP {res.status_code}"))
    except Exception as e:
        results.append(("go2rtc WebRTC Hub", "OFFLINE", f"Não foi possível conectar em {go2rtc_url}: {e}"))

    # 3. Sentinela Backend API
    backend_url = "http://localhost:8080"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{backend_url}/api/telemetry/frigate-status")
            if res.status_code == 200:
                data = res.json()
                results.append(("Sentinela Backend API", "ONLINE", f"Ponte Frigate Bridge Ativa (HTTP={data.get('frigate_http')}, go2rtc={data.get('go2rtc_http')})"))
            else:
                results.append(("Sentinela Backend API", "AVISO", f"HTTP {res.status_code}"))
    except Exception as e:
        results.append(("Sentinela Backend API", "OFFLINE", f"Não foi possível conectar em {backend_url}: {e}"))

    # 4. Telegram Bot API
    token = os.getenv("TELEGRAM_BOT_TOKEN", "8857963953:AAFsPQ965S6IgoEaWPkTghMbf6Qv6YCWu0E")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "-1003995215102")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            if res.status_code == 200:
                bot_info = res.json().get("result", {})
                results.append(("Telegram Cloud Vault", "ONLINE", f"Bot @{bot_info.get('username')} autenticado com sucesso"))
            else:
                results.append(("Telegram Cloud Vault", "ERRO", f"Token inválido ou rejeitado pela API do Telegram: {res.text}"))
    except Exception as e:
        results.append(("Telegram Cloud Vault", "OFFLINE", f"Erro de rede ao contatar Telegram: {e}"))

    # 5. FFmpeg Binary
    try:
        proc = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=3)
        if proc.returncode == 0:
            first_line = proc.stdout.decode('utf-8').split('\n')[0]
            results.append(("FFmpeg Vídeo Engine", "ONLINE", first_line[:50]))
        else:
            results.append(("FFmpeg Vídeo Engine", "ERRO", "FFmpeg retornou código de erro"))
    except Exception as e:
        results.append(("FFmpeg Vídeo Engine", "AUSENTE", f"FFmpeg não encontrado no PATH: {e}"))

    # Print Table
    for name, status, detail in results:
        icon = "🟢" if status == "ONLINE" else "⚠️" if status == "AVISO" else "🔴"
        print(f"{icon} [{status:^7}] {name:<26} -> {detail}")

    print("\n" + "="*60)
    print("📋 CONCLUSÃO DA AUDITORIA:")
    all_ok = all(s == "ONLINE" for _, s, _ in results)
    if all_ok:
        print("✅ TODOS OS SUBSISTEMAS ESTÃO INTEGRADOS E EM OPERAÇÃO!")
    else:
        print("⚠️ ALGUNS SERVIÇOS REQUEREM ATENÇÃO (RECONSTRUA OS CONTÊINERES).")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(verify_system())
