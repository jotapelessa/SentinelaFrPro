import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from app.db.session import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, index=True, nullable=False)
    friendly_name = Column(String(128), nullable=True)
    rtsp_main = Column(String(512), nullable=False)
    rtsp_sub = Column(String(512), nullable=True)
    ip_address = Column(String(64), nullable=True)
    onvif_port = Column(Integer, default=80)
    enabled = Column(Boolean, default=True)
    zones = Column(Text, nullable=True) # JSON array of zones
    objects_to_track = Column(String(256), default='["person", "car", "motorcycle", "dog"]')
    min_score = Column(Float, default=0.70)
    detect_fps = Column(Integer, default=5) # 5, 7, 10
    motion_threshold = Column(Integer, default=25) # 15 to 50
    record_mode = Column(String(32), default="motion") # all, motion
    stream_mode = Column(String(32), default="mse") # eco, mse, webrtc
    eco_fps = Column(Integer, default=10) # 5, 10, 15
    record_fps = Column(Integer, default=24) # 24, 30
    record_retain_days = Column(Integer, default=14)
    record_audio = Column(Boolean, default=False)
    notify_telegram = Column(Boolean, default=True)
    notify_tv = Column(Boolean, default=True)
    notify_audio = Column(Boolean, default=True)
    cooldown_seconds = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class EventRecord(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    frigate_event_id = Column(String(64), unique=True, index=True, nullable=False)
    camera_name = Column(String(64), index=True, nullable=False)
    label = Column(String(32), index=True, nullable=False) # person, car, motorcycle, dog, etc.
    top_score = Column(Float, default=0.0)
    zone = Column(String(64), nullable=True)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    has_snapshot = Column(Boolean, default=False)
    has_clip = Column(Boolean, default=False)
    snapshot_path = Column(String(512), nullable=True)
    clip_path = Column(String(512), nullable=True)
    telegram_notified = Column(Boolean, default=False)
    pip_dispatched = Column(Boolean, default=False)

class PairedDevice(Base):
    __tablename__ = "paired_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_identifier = Column(String(128), unique=True, index=True, nullable=False)
    friendly_name = Column(String(128), nullable=False)
    device_type = Column(String(32), default="web") # android_tv, tablet, web, kiosk
    ip_address = Column(String(64), nullable=True)
    tailscale_ip = Column(String(64), nullable=True)
    permission_status = Column(String(16), default="allowed") # allowed, blocked, paused
    allowed_cameras = Column(Text, nullable=True) # JSON list e.g. ["camera_principal"] or null for all
    allowed_events = Column(Text, nullable=True) # JSON list e.g. ["person", "car", "motorcycle", "dog"] or null for all
    allow_recordings = Column(Boolean, default=True) # Permission to access SSD/NVMe recordings
    allow_live_stream = Column(Boolean, default=True) # Permission for live streaming
    allow_pip_alerts = Column(Boolean, default=True) # Permission to receive floating PiP alarm windows
    allow_restart_containers = Column(Boolean, default=False) # Remote container restart permission
    allow_reboot_server = Column(Boolean, default=False) # Remote server reboot permission
    pip_default_size = Column(String(32), default="medium") # mini, medium, large, split
    pip_duration_seconds = Column(Integer, default=10) # 5, 10, 15, 30
    is_master_admin = Column(Boolean, default=False) # Master special permissions for smartphone
    admin_unlocked_at = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(64), index=True, nullable=False) # e.g. CONFIG_UPDATE, TELEGRAM_ALERT, FRIGATE_RETAIN, ZONE_EDIT
    module = Column(String(32), index=True, default="SYSTEM") # CAMERA, TELEGRAM, PIP, FRIGATE, SETTINGS
    severity = Column(String(16), default="INFO") # INFO, WARNING, ERROR, SUCCESS
    details = Column(Text, nullable=True)
    client_ip = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

