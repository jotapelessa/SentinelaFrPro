/**
 * Web Client Operational Telemetry & Error Logger.
 * Buffers browser events, navigation, player actions and window errors,
 * dispatching them in batch to POST /api/telemetry/client-logs.
 */

export interface WebLogEvent {
  category: "PLAYER" | "NAVIGATION" | "TOOLS" | "NETWORK" | "SYSTEM" | "PIP";
  action: string;
  severity: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  message: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

class WebClientLogger {
  private queue: WebLogEvent[] = [];
  private maxQueueSize = 150;
  private batchSize = 40;
  private isFlushing = false;
  private flushTimer: any = null;
  private initialized = false;

  public init() {
    if (typeof window === "undefined" || this.initialized) return;
    this.initialized = true;

    // Periodic flush every 4 seconds
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 4000);

    // Global Uncaught Error protection
    window.addEventListener("error", (event) => {
      this.log({
        category: "SYSTEM",
        action: "WINDOW_UNCAUGHT_ERROR",
        severity: "ERROR",
        message: `${event.message} at ${event.filename || "unknown"}:${event.lineno || 0}`,
        metadata: {
          colno: event.colno,
          stack: event.error?.stack?.slice(0, 500)
        }
      });
    });

    // Unhandled Promise Rejection
    window.addEventListener("unhandledrejection", (event) => {
      this.log({
        category: "SYSTEM",
        action: "UNHANDLED_PROMISE_REJECTION",
        severity: "ERROR",
        message: String(event.reason?.message || event.reason || "Unknown promise rejection"),
        metadata: {
          stack: event.reason?.stack?.slice(0, 500)
        }
      });
    });

    // Initial session start log
    this.log({
      category: "NAVIGATION",
      action: "WEB_SESSION_STARTED",
      severity: "INFO",
      message: `Sessão Web iniciada: ${window.location.pathname}`,
      metadata: {
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight}`
      }
    });
  }

  public getDeviceIdentifier(): string {
    if (typeof window === "undefined") return "web_ssr";
    let id = localStorage.getItem("sentinela_web_client_id");
    if (!id) {
      id = "web-" + Math.random().toString(36).substring(2, 10);
      try {
        localStorage.setItem("sentinela_web_client_id", id);
      } catch {
        // Storage restricted
      }
    }
    return id;
  }

  public getDeviceName(): string {
    if (typeof window === "undefined") return "Web Dashboard";
    const ua = navigator.userAgent;
    let browser = "Navegador";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    return `Web Dashboard (${browser})`;
  }

  public log(event: WebLogEvent) {
    if (typeof window === "undefined") return;

    while (this.queue.length >= this.maxQueueSize) {
      this.queue.shift(); // Drop oldest FIFO
    }

    this.queue.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });

    // Immediate flush for critical errors
    if (event.severity === "ERROR") {
      this.flush();
    }
  }

  public async flush() {
    if (typeof window === "undefined" || this.queue.length === 0 || this.isFlushing) return;
    this.isFlushing = true;

    const batch = this.queue.splice(0, this.batchSize);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

    try {
      await fetch(`${apiUrl}/telemetry/client-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_identifier: this.getDeviceIdentifier(),
          device_name: this.getDeviceName(),
          device_type: "web_browser",
          events: batch
        })
      });
    } catch {
      // Re-insert on network error without growing indefinitely
      for (let i = batch.length - 1; i >= 0; i--) {
        if (this.queue.length < this.maxQueueSize) {
          this.queue.unshift(batch[i]);
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }
}

export const webClientLogger = new WebClientLogger();
if (typeof window !== "undefined") {
  webClientLogger.init();
}
