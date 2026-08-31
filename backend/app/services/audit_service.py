import logging
import datetime
from typing import Optional
from app.db.session import AsyncSessionLocal
from app.db.models import AuditLog

logger = logging.getLogger("sentinela.audit")

class AuditService:
    async def log(
        self,
        action: str,
        module: str = "SYSTEM",
        severity: str = "INFO",
        details: Optional[str] = None,
        client_ip: Optional[str] = None
    ):
        """Records an audit log entry in SQLite asynchronously."""
        try:
            async with AsyncSessionLocal() as session:
                entry = AuditLog(
                    action=action,
                    module=module,
                    severity=severity,
                    details=details,
                    client_ip=client_ip,
                    created_at=datetime.datetime.utcnow()
                )
                session.add(entry)
                await session.commit()
                logger.info(f"🛡️ [AUDIT] {module} | {action} [{severity}] - {details or ''}")
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")

audit_service = AuditService()
