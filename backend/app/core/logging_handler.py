import logging
import collections
import re
from typing import List

# Ring buffer storing last 1500 logs
log_buffer = collections.deque(maxlen=1500)

SENSITIVE_PATTERNS = [
    (re.compile(r'bot(\d{6,}:[A-Za-z0-9_-]{20,})'), r'bot***[MASKED_TOKEN]***'),
    (re.compile(r'rtsp://([^:]+):([^@]+)@'), r'rtsp://\1:***@'),
]

def mask_sensitive_data(message: str) -> str:
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message

class MemoryRingBufferHandler(logging.Handler):
    """Captures all logging records in memory for real-time API streaming."""
    def emit(self, record: logging.LogRecord):
        try:
            msg = self.format(record)
            msg = mask_sensitive_data(msg)
            log_buffer.append(msg)
        except Exception:
            self.handleError(record)

def get_backend_logs(lines: int = 150) -> List[str]:
    """Returns the most recent lines from the in-memory ring buffer."""
    buf_list = list(log_buffer)
    if lines > 0:
        return buf_list[-lines:]
    return buf_list
