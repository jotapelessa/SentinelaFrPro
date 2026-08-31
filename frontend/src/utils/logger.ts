/**
 * Sentinela Pro — Frontend Observability & Structured Console Logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const COLORS = {
  webrtc: '#06b6d4', // Cyan
  api: '#3b82f6',    // Blue
  store: '#a855f7',  // Purple
  zone: '#eab308',   // Amber
  ws: '#10b981',     // Emerald
  error: '#ef4444'   // Red
};

function formatTimestamp(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

export const logger = {
  webrtc: (message: string, ...args: any[]) => {
    console.log(
      `%c[Sentinela WebRTC %c${formatTimestamp()}%c]%c ${message}`,
      `color: ${COLORS.webrtc}; font-weight: bold;`,
      'color: #64748b; font-size: 10px;',
      `color: ${COLORS.webrtc}; font-weight: bold;`,
      'color: #e2e8f0;',
      ...args
    );
  },
  api: (method: string, url: string, status?: number, latencyMs?: number) => {
    const isError = status && status >= 400;
    const color = isError ? COLORS.error : COLORS.api;
    console.log(
      `%c[Sentinela API %c${formatTimestamp()}%c]%c ${method} ${url} ${status ? `-> ${status}` : ''} ${latencyMs ? `(${latencyMs.toFixed(1)}ms)` : ''}`,
      `color: ${color}; font-weight: bold;`,
      'color: #64748b; font-size: 10px;',
      `color: ${color}; font-weight: bold;`,
      'color: #e2e8f0;'
    );
  },
  ws: (event: string, payload?: any) => {
    console.log(
      `%c[Sentinela WS %c${formatTimestamp()}%c]%c Event: ${event}`,
      `color: ${COLORS.ws}; font-weight: bold;`,
      'color: #64748b; font-size: 10px;',
      `color: ${COLORS.ws}; font-weight: bold;`,
      'color: #e2e8f0;',
      payload || ''
    );
  },
  zone: (message: string, ...args: any[]) => {
    console.log(
      `%c[Sentinela Zones %c${formatTimestamp()}%c]%c ${message}`,
      `color: ${COLORS.zone}; font-weight: bold;`,
      'color: #64748b; font-size: 10px;',
      `color: ${COLORS.zone}; font-weight: bold;`,
      'color: #e2e8f0;',
      ...args
    );
  },
  error: (module: string, error: any) => {
    console.error(
      `%c[Sentinela ERROR | ${module} %c${formatTimestamp()}%c]%c`,
      `color: ${COLORS.error}; font-weight: bold;`,
      'color: #64748b; font-size: 10px;',
      `color: ${COLORS.error}; font-weight: bold;`,
      'color: #f87171;',
      error
    );
  }
};
