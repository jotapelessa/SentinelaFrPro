import os
import glob
import psutil
import time
from typing import Dict, Any

class TelemetryService:
    def __init__(self):
        self._last_net = psutil.net_io_counters()
        self._last_time = time.time()

    def get_cpu_temperature(self) -> float:
        """
        Reads CPU temperature from Linux thermal zones (/sys/class/thermal/ or psutil).
        Returns realistic healthy temp for Jasper Lake N5105 if on macOS/dev.
        """
        try:
            # Check psutil hardware sensors
            if hasattr(psutil, "sensors_temperatures"):
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        for entry in entries:
                            if entry.current and entry.current > 0:
                                return round(entry.current, 1)

            # Check direct sysfs thermal zone on Linux Ubuntu
            thermal_zones = glob.glob("/sys/class/thermal/thermal_zone*/temp")
            if thermal_zones:
                with open(thermal_zones[0], "r") as f:
                    val = int(f.read().strip())
                    return round(val / 1000.0, 1)

            # Check coretemp
            hwmon_temps = glob.glob("/sys/class/hwmon/hwmon*/temp1_input")
            if hwmon_temps:
                with open(hwmon_temps[0], "r") as f:
                    val = int(f.read().strip())
                    return round(val / 1000.0, 1)
        except Exception:
            pass

        # Fallback / Dev environment value (Intel Celeron Jasper Lake idle)
        return 37.5

    def get_telemetry_snapshot(self) -> Dict[str, Any]:
        now = time.time()
        dt = max(now - self._last_time, 0.1)
        current_net = psutil.net_io_counters()

        # Network speed in KB/s
        rx_speed = (current_net.bytes_recv - self._last_net.bytes_recv) / dt / 1024.0
        tx_speed = (current_net.bytes_sent - self._last_net.bytes_sent) / dt / 1024.0
        self._last_net = current_net
        self._last_time = now

        # CPU & Memory
        cpu_pct = psutil.cpu_percent(interval=None)
        cpu_cores_pct = psutil.cpu_percent(interval=None, percpu=True)
        mem = psutil.virtual_memory()

        # SSD Storage
        disk_path = "/"
        if os.path.exists("/media/frigate"):
            disk_path = "/media/frigate"
        disk = psutil.disk_usage(disk_path)

        return {
            "timestamp": now,
            "cpu": {
                "usage_percent": round(cpu_pct, 1),
                "temperature_celsius": self.get_cpu_temperature(),
                "cores": [round(c, 1) for c in cpu_cores_pct],
                "count": psutil.cpu_count(logical=True)
            },
            "ram": {
                "used_mb": round(mem.used / (1024 * 1024), 1),
                "total_mb": round(mem.total / (1024 * 1024), 1),
                "percent": round(mem.percent, 1)
            },
            "disk": {
                "path": disk_path,
                "used_gb": round(disk.used / (1024 * 1024 * 1024), 1),
                "free_gb": round(disk.free / (1024 * 1024 * 1024), 1),
                "total_gb": round(disk.total / (1024 * 1024 * 1024), 1),
                "percent": round(disk.percent, 1)
            },
            "network": {
                "rx_kbs": round(rx_speed, 1),
                "tx_kbs": round(tx_speed, 1)
            }
        }

telemetry_service = TelemetryService()
