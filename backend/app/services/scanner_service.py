import asyncio
import socket
import struct
import uuid
import re
import psutil
from typing import List, Dict, Any

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

CCTV_PORTS = {
    554: "RTSP Padrão",
    8554: "RTSP Alternativo (go2rtc / Xiaomi / Stream Server)",
    37777: "Intelbras / Dahua Nativo",
    34567: "Xiongmai / XMeye Nativo",
    4747: "DroidCam Smartphone",
    8080: "IP Webcam Android / HTTP",
    8081: "IP Webcam Stream Alternativo",
    80: "HTTP / ONVIF Web"
}

EXCLUDED_PORTS = {1935, 8888}

class ScannerService:
    def get_local_subnets(self) -> List[str]:
        """Discovers all local subnets, always including 192.168.1."""
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
        if port in EXCLUDED_PORTS:
            return False
        try:
            fut = asyncio.open_connection(ip, port)
            reader, writer = await asyncio.wait_for(fut, timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return True
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
        """Concurrently scans CCTV ports across the subnet."""
        found_devices = {}

        # Prioritize known camera IPs first
        target_hosts = [6, 100, 101, 10, 20, 50, 60] + [h for h in range(start_host, min(end_host + 1, 255)) if h not in [6, 100, 101, 10, 20, 50, 60]]

        async def check_host(host_num: int):
            ip = f"{base_subnet}.{host_num}"
            open_ports = []
            for port, desc in CCTV_PORTS.items():
                is_open = await self.scan_port(ip, port, timeout=0.35)
                if is_open:
                    open_ports.append((port, desc))
            
            if open_ports:
                has_rtsp = any(p[0] in [554, 8554, 37777, 34567] for p in open_ports)
                rtsp_port = 8554 if any(p[0] == 8554 for p in open_ports) else 554
                stream_path = "stream" if rtsp_port == 8554 else "live/ch0"
                found_devices[ip] = {
                    "ip": ip,
                    "open_ports": [p[0] for p in open_ports],
                    "services": [p[1] for p in open_ports],
                    "rtsp_url_hint": f"rtsp://{ip}:{rtsp_port}/{stream_path}",
                    "confidence": "high" if has_rtsp else "medium"
                }

        tasks = [check_host(h) for h in target_hosts]
        await asyncio.gather(*tasks)
        return list(found_devices.values())

    async def run_full_scan(self) -> Dict[str, Any]:
        """Runs scan on 192.168.1.0/24 and all detected subnets."""
        subnets = self.get_local_subnets()
        primary_subnet = "192.168.1"

        onvif_results, port_results = await asyncio.gather(
            self.discover_onvif_devices(timeout=1.5),
            self.scan_subnet_cctv_ports(base_subnet=primary_subnet, start_host=1, end_host=254)
        )

        merged = {}
        for dev in onvif_results:
            merged[dev["ip"]] = dev

        for dev in port_results:
            ip = dev["ip"]
            if ip in merged:
                merged[ip]["open_ports"] = list(set(merged[ip].get("open_ports", []) + dev["open_ports"]))
                merged[ip]["services"] = list(set(merged[ip].get("services", []) + dev["services"]))
            else:
                merged[ip] = dev

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

