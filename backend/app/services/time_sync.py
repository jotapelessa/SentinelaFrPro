"""
Sentinela Frigate Pro - Time Synchronization Service
Periodically checks server time against NTP servers (a.st1.ntp.br, pool.ntp.org)
and verifies alignment with America/Sao_Paulo (UTC-3).
"""

import asyncio
import logging
import socket
import struct
import time
from datetime import datetime
import pytz

logger = logging.getLogger("sentinela.time_sync")

NTP_SERVERS = ["a.st1.ntp.br", "b.st1.ntp.br", "pool.ntp.org"]
TIMEZONE_STR = "America/Sao_Paulo"
CHECK_INTERVAL_SECONDS = 3600  # 1 hour


def query_ntp_time(server: str, timeout: float = 3.0) -> float | None:
    """Queries an NTP server and returns epoch timestamp in seconds."""
    client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    client.settimeout(timeout)
    # NTP request packet: LI=0, VN=3, Mode=3 (client) -> 0x1B followed by 47 zero bytes
    msg = b"\x1b" + 47 * b"\0"
    try:
        client.sendto(msg, (server, 123))
        data, _ = client.recvfrom(1024)
        if len(data) >= 48:
            # Unpack transmit timestamp (seconds since Jan 1 1900)
            unpacked = struct.unpack("!12I", data[:48])
            # NTP timestamp offset (seconds between 1900-01-01 and 1970-01-01)
            ntp_delta = 2208988800
            ntp_time = unpacked[10] + float(unpacked[11]) / 2**32 - ntp_delta
            return ntp_time
    except Exception as e:
        logger.debug(f"NTP query to {server} failed: {e}")
        return None
    finally:
        client.close()
    return None


async def run_time_sync_watchdog():
    """Background task running once per hour to log and monitor time synchronization."""
    logger.info("🕒 Sentinela Time Sync Watchdog iniciado (America/Sao_Paulo).")
    
    while True:
        try:
            local_epoch = time.time()
            tz = pytz.timezone(TIMEZONE_STR)
            local_dt = datetime.fromtimestamp(local_epoch, tz)
            
            ntp_epoch = None
            used_server = None
            for srv in NTP_SERVERS:
                ntp_epoch = await asyncio.to_thread(query_ntp_time, srv)
                if ntp_epoch is not None:
                    used_server = srv
                    break
            
            if ntp_epoch is not None:
                drift_ms = (local_epoch - ntp_epoch) * 1000.0
                if abs(drift_ms) > 1000.0:
                    logger.warning(
                        f"⚠️ Desvio de relógio detectado! Local: {local_dt.strftime('%Y-%m-%d %H:%M:%S %Z')} | "
                        f"NTP ({used_server}): drift de {drift_ms:.1f}ms."
                    )
                else:
                    logger.info(
                        f"✅ Sincronização de horário OK: {local_dt.strftime('%Y-%m-%d %H:%M:%S %Z')} | "
                        f"NTP drift: {drift_ms:.1f}ms ({used_server})"
                    )
            else:
                logger.warning(f"⚠️ Servidores NTP inacessíveis no momento. Hora local: {local_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}")
                
        except Exception as e:
            logger.error(f"Erro no watchdog de sincronização de horário: {e}", exc_info=True)
            
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
