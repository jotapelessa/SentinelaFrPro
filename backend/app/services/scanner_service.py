import asyncio
import socket
import struct
import uuid
import re
import time
import psutil
from typing import List, Dict, Any, Optional

ONVIF_PROBE_XML = """<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns:dn="http://www.onvif.org/ver10/network/wsdl" xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">uuid:{msg_id}</wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </Header>
  <Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <Types>dn:NetworkVideoTransmitter</Types>
    </Probe>
  </Body>
</Envelope>"""

PRIMARY_CCTV_PORTS = {
    554: "RTSP Padrão (H.264 / H.265)",
    8554: "RTSP Alternativo (go2rtc / Stream)",
    37777: "Intelbras / Dahua Nativo",
    34567: "Xiongmai / XMeye Nativo",
    4747: "DroidCam Smartphone",
    8000: "Hikvision / Intelbras Media Port"
}

SECONDARY_WEB_PORTS = {
    80: "HTTP / ONVIF Web",
    8080: "IP Webcam / HTTP Alt",
    8081: "Stream Web Alternativo"
}

class ScannerService:
    def get_local_subnets(self) -> List[str]:
        """Discovers all local subnets, always prioritizing 192.168.1."""
        subnets = set()
        subnets.add("192.168.1") # Default primary LAN

        try:
            for iface, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET and not addr.address.startswith("127.") and not addr.address.startswith("172."):
                        parts = addr.address.split(".")
                        if len(parts) == 4:
                            subnets.add(f"{parts[0]}.{parts[1]}.{parts[2]}")
        except Exception:
            pass

        return list(subnets)

    async def scan_port(self, ip: str, port: int, timeout: float = 0.5) -> bool:
        """Tries to connect to a specific port on an IP address."""
        try:
            fut = asyncio.open_connection(ip, port)
            reader, writer = await asyncio.wait_for(fut, timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return True
        except Exception:
            return False

    async def verify_rtsp_stream(self, ip: str, port: int = 554, timeout: float = 0.8) -> bool:
        """Sends an authentic RTSP OPTIONS probe to verify real video stream capability."""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, port),
                timeout=timeout
            )
            req = f"OPTIONS rtsp://{ip}:{port}/ RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: SentinelaFrigatePro/1.0\r\n\r\n"
            writer.write(req.encode())
            await writer.drain()
            data = await asyncio.wait_for(reader.read(512), timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return b"RTSP" in data or b"200 OK" in data or b"401" in data or b"Public:" in data
        except Exception:
            return False

    async def discover_onvif_devices(self, timeout: float = 2.0) -> List[Dict[str, Any]]:
        """Sends WS-Discovery UDP probes on port 3702 to all subnets."""
        devices = []
        msg_id = str(uuid.uuid4())
        payload = ONVIF_PROBE_XML.format(msg_id=msg_id).encode("utf-8")

        loop = asyncio.get_running_loop()
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 4)
            sock.setblocking(False)

            # Send multicast and broadcast on all subnets
            sock.sendto(payload, ("239.255.255.250", 3702))
            for sub in self.get_local_subnets():
                try:
                    sock.sendto(payload, (f"{sub}.255", 3702))
                except Exception:
                    pass

            start_time = loop.time()
            seen_ips = set()

            while loop.time() - start_time < timeout:
                try:
                    data, addr = sock.recvfrom(4096)
                    ip = addr[0]
                    if ip not in seen_ips:
                        seen_ips.add(ip)
                        text_data = data.decode("utf-8", errors="ignore")
                        xaddrs_match = re.search(r"XAddrs>([^<]+)<", text_data)
                        service_url = xaddrs_match.group(1).strip() if xaddrs_match else f"http://{ip}/onvif/device_service"
                        
                        devices.append({
                            "ip": ip,
                            "friendly_name": f"Câmera ONVIF ({ip})",
                            "protocol": "ONVIF (WS-Discovery)",
                            "port": 3702,
                            "open_ports": [554, 3702],
                            "services": ["ONVIF Device", "RTSP Stream"],
                            "onvif_service_url": service_url,
                            "rtsp_url_hint": f"rtsp://{ip}:554/live/ch0",
                            "confidence": "high"
                        })
                except (BlockingIOError, InterruptedError):
                    await asyncio.sleep(0.05)
                except Exception:
                    break
        except Exception:
            pass
        finally:
            if sock:
                sock.close()

        return devices

    async def scan_subnet_cctv_ports(self, base_subnet: str = "192.168.1", start_host: int = 1, end_host: int = 254) -> List[Dict[str, Any]]:
        """Concurrently scans CCTV ports with semaphore control and real stream verification."""
        found_devices = {}
        sem = asyncio.Semaphore(35) # Safe concurrency limit

        # Prioritize known camera IPs (6, 100, etc.)
        priority_hosts = [6, 10, 20, 50, 60, 100, 101, 102, 105, 108, 110, 120, 150, 200]
        other_hosts = [h for h in range(start_host, min(end_host + 1, 255)) if h not in priority_hosts]
        target_hosts = [h for h in priority_hosts if start_host <= h <= end_host] + other_hosts

        async def check_host(host_num: int):
            ip = f"{base_subnet}.{host_num}"
            async with sem:
                # 1. First probe primary CCTV video ports
                open_primary = []
                for port, desc in PRIMARY_CCTV_PORTS.items():
                    is_open = await self.scan_port(ip, port, timeout=0.45)
                    if is_open:
                        open_primary.append((port, desc))

                # 2. Check if verified RTSP
                is_real_rtsp = False
                if any(p[0] in [554, 8554] for p in open_primary):
                    rtsp_port = 554 if any(p[0] == 554 for p in open_primary) else 8554
                    is_real_rtsp = await self.verify_rtsp_stream(ip, port=rtsp_port, timeout=0.6)

                # 3. If primary CCTV port open (or verified RTSP)
                if open_primary or is_real_rtsp:
                    # Also probe secondary web port for ONVIF
                    open_sec = []
                    for port, desc in SECONDARY_WEB_PORTS.items():
                        if await self.scan_port(ip, port, timeout=0.3):
                            open_sec.append((port, desc))

                    all_ports = open_primary + open_sec
                    port_nums = [p[0] for p in all_ports]
                    service_names = [p[1] for p in all_ports]

                    # Pick appropriate RTSP hint
                    if 37777 in port_nums:
                        protocol_name = "Intelbras / Dahua CFTV"
                        rtsp_hint = f"rtsp://admin:admin@{ip}:554/cam/realmonitor?channel=1&subtype=0"
                    elif 34567 in port_nums:
                        protocol_name = "Xiongmai / XMeye CFTV"
                        rtsp_hint = f"rtsp://admin:admin@{ip}:554/live/ch0"
                    elif 4747 in port_nums:
                        protocol_name = "DroidCam IP"
                        rtsp_hint = f"http://{ip}:4747/video"
                    elif 8554 in port_nums and 554 not in port_nums:
                        protocol_name = "RTSP Stream (Porta 8554)"
                        rtsp_hint = f"rtsp://{ip}:8554/stream"
                    else:
                        protocol_name = "Câmera RTSP IP"
                        rtsp_hint = f"rtsp://{ip}:554/live/ch0"

                    found_devices[ip] = {
                        "ip": ip,
                        "friendly_name": f"{protocol_name} ({ip})",
                        "protocol": protocol_name,
                        "open_ports": port_nums,
                        "services": service_names,
                        "rtsp_url_hint": rtsp_hint,
                        "confidence": "high" if (is_real_rtsp or 554 in port_nums or 37777 in port_nums) else "medium"
                    }

        tasks = [check_host(h) for h in target_hosts]
        await asyncio.gather(*tasks)
        return list(found_devices.values())

    async def run_full_scan(self, subnet: Optional[str] = None) -> Dict[str, Any]:
        """Runs verified scan on specified or detected subnets without fake devices."""
        start_time = time.time()
        subnets_to_scan = [subnet.strip()] if subnet and subnet.strip() else self.get_local_subnets()
        if "192.168.1" not in subnets_to_scan and not subnet:
            subnets_to_scan.insert(0, "192.168.1")

        onvif_task = self.discover_onvif_devices(timeout=1.8)
        port_tasks = [self.scan_subnet_cctv_ports(base_subnet=sub, start_host=1, end_host=254) for sub in subnets_to_scan]

        results = await asyncio.gather(onvif_task, *port_tasks)
        onvif_results = results[0]
        port_results = []
        for r in results[1:]:
            port_results.extend(r)

        merged: Dict[str, Dict[str, Any]] = {}
        for dev in onvif_results:
            merged[dev["ip"]] = dev

        for dev in port_results:
            ip = dev["ip"]
            if ip in merged:
                merged[ip]["open_ports"] = sorted(list(set(merged[ip].get("open_ports", []) + dev["open_ports"])))
                merged[ip]["services"] = list(set(merged[ip].get("services", []) + dev["services"]))
                if dev.get("confidence") == "high":
                    merged[ip]["confidence"] = "high"
            else:
                merged[ip] = dev

        duration = round(time.time() - start_time, 2)
        device_list = list(merged.values())
        device_list.sort(key=lambda d: [int(x) if x.isdigit() else 0 for x in d["ip"].split(".")])

        return {
            "status": "ok",
            "devices": device_list,
            "count": len(device_list),
            "subnets": subnets_to_scan,
            "duration_seconds": duration
        }

    async def discover_smart_tvs(self, base_subnet: str = "192.168.1") -> List[Dict[str, Any]]:
        """Scans the local network for Smart TVs (Google Cast, TCL, Samsung, LG, Android TV)."""
        tv_ports = {
            8009: "Google Cast / TCL / Android TV",
            8001: "Samsung Smart TV (Tizen)",
            8002: "Samsung Smart TV (SSL)",
            3000: "LG Smart TV (webOS)",
            7986: "PiP-Up Android TV",
            5463: "Notifications for Android TV",
            9197: "Samsung DLNA Media",
            49152: "UPnP / DLNA Smart TV"
        }

        found_tvs = []
        target_hosts = list(range(1, 255))

        async def check_tv(host_num: int):
            ip = f"{base_subnet}.{host_num}"
            # Quick check if any TV port is open
            open_tv_ports = []
            for port, desc in tv_ports.items():
                is_open = await self.scan_port(ip, port, timeout=0.25)
                if is_open:
                    open_tv_ports.append((port, desc))

            if open_tv_ports:
                # Classify TV
                port_nums = [p[0] for p in open_tv_ports]
                if 8009 in port_nums or 7986 in port_nums or 5463 in port_nums:
                    tv_type = "android_tv"
                    friendly_name = f"TCL / Google TV ({ip})"
                elif 8001 in port_nums or 8002 in port_nums or 9197 in port_nums:
                    tv_type = "samsung_tizen"
                    friendly_name = f"Samsung Smart TV ({ip})"
                elif 3000 in port_nums:
                    tv_type = "lg_webos"
                    friendly_name = f"LG Smart TV ({ip})"
                else:
                    tv_type = "chromecast"
                    friendly_name = f"Smart TV DLNA ({ip})"

                found_tvs.append({
                    "ip": ip,
                    "friendly_name": friendly_name,
                    "device_type": tv_type,
                    "open_ports": port_nums,
                    "services": [p[1] for p in open_tv_ports]
                })

        tasks = [check_tv(h) for h in target_hosts]
        await asyncio.gather(*tasks)
        return found_tvs

scanner_service = ScannerService()

