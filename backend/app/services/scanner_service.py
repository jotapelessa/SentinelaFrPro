import asyncio
import socket
import struct
import uuid
import re
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
    8554: "RTSP Alternativo (go2rtc / Xiaomi)",
    37777: "Intelbras / Dahua Nativo",
    34567: "Xiongmai / XMeye Nativo",
    4747: "DroidCam Smartphone",
    8080: "IP Webcam Android / HTTP",
    8081: "IP Webcam Stream Alternativo"
}

# Ports that could belong to TVs or generic servers rather than cameras
EXCLUDED_PORTS = {1935, 8888}

class ScannerService:
    def get_local_ip_and_subnets(self) -> List[str]:
        """Discovers local network subnets to scan."""
        ips = []
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            parts = local_ip.split(".")
            base_subnet = f"{parts[0]}.{parts[1]}.{parts[2]}"
            return [local_ip, base_subnet]
        except Exception:
            return ["192.168.1.10", "192.168.1"]

    async def scan_port(self, ip: str, port: int, timeout: float = 0.6) -> bool:
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
        """Sends WS-Discovery UDP probes on port 3702."""
        devices = []
        msg_id = str(uuid.uuid4())
        payload = ONVIF_PROBE_XML.format(msg_id=msg_id).encode("utf-8")

        loop = asyncio.get_running_loop()
        transport = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
            sock.setblocking(False)

            # Send multicast and broadcast
            multicast_group = ("239.255.255.250", 3702)
            sock.sendto(payload, multicast_group)

            local_info = self.get_local_ip_and_subnets()
            broadcast_ip = f"{local_info[1]}.255"
            sock.sendto(payload, (broadcast_ip, 3702))

            start_time = loop.time()
            seen_ips = set()

            while loop.time() - start_time < timeout:
                try:
                    data, addr = sock.recvfrom(4096)
                    ip = addr[0]
                    if ip not in seen_ips:
                        seen_ips.add(ip)
                        text_data = data.decode("utf-8", errors="ignore")
                        # Extract XAddrs or service URL
                        xaddrs_match = re.search(r"XAddrs>([^<]+)<", text_data)
                        service_url = xaddrs_match.group(1).strip() if xaddrs_match else f"http://{ip}/onvif/device_service"
                        
                        devices.append({
                            "ip": ip,
                            "protocol": "ONVIF (WS-Discovery)",
                            "port": 3702,
                            "onvif_service_url": service_url,
                            "rtsp_url_hint": f"rtsp://admin:admin@{ip}:554/live/ch0",
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
        """Concurrently scans CCTV ports across a subnet."""
        found_devices = {}

        async def check_host(host_num: int):
            ip = f"{base_subnet}.{host_num}"
            open_ports = []
            for port, desc in CCTV_PORTS.items():
                is_open = await self.scan_port(ip, port, timeout=0.4)
                if is_open:
                    open_ports.append((port, desc))
            
            if open_ports:
                found_devices[ip] = {
                    "ip": ip,
                    "open_ports": [p[0] for p in open_ports],
                    "services": [p[1] for p in open_ports],
                    "rtsp_url_hint": f"rtsp://admin:admin@{ip}:554/live/ch0",
                    "confidence": "high" if any(p[0] in [554, 37777, 34567] for p in open_ports) else "medium"
                }

        tasks = [check_host(i) for i in range(start_host, min(end_host + 1, 255))]
        await asyncio.gather(*tasks)
        return list(found_devices.values())

    async def run_full_scan(self) -> Dict[str, Any]:
        """Runs both ONVIF Discovery and Port Scan."""
        local_info = self.get_local_ip_and_subnets()
        base_subnet = local_info[1]

        onvif_results, port_results = await asyncio.gather(
            self.discover_onvif_devices(timeout=1.5),
            self.scan_subnet_cctv_ports(base_subnet=base_subnet, start_host=1, end_host=254)
        )

        merged = {}
        for dev in onvif_results:
            merged[dev["ip"]] = dev

        for dev in port_results:
            ip = dev["ip"]
            if ip in merged:
                merged[ip]["open_ports"] = dev["open_ports"]
                merged[ip]["services"] = dev["services"]
            else:
                merged[ip] = dev

        devices_list = list(merged.values())
        return {
            "subnet": f"{base_subnet}.0/24",
            "total_found": len(devices_list),
            "devices": devices_list,
            "all_ips_raw": "\n".join([d["ip"] for d in devices_list])
        }

scanner_service = ScannerService()
