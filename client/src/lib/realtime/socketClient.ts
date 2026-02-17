import { io, Socket } from "socket.io-client";

type EventHandler = (payload: any) => void;

class RealtimeClient {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private role: "admin" | "customer" | null = null;
  private token: string | null = null;
  private seenIds = new Set<string>();

  connect(role: "admin" | "customer", token?: string) {
    if (this.socket?.connected && this.role === role) {
      return;
    }

    this.disconnect();
    this.role = role;
    this.token = token || null;

    const auth: Record<string, string> = { role };
    if (role === "customer" && token) {
      auth.token = token;
    }

    this.socket = io({
      path: "/socket.io",
      auth,
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on("connect", () => {
      console.log(`[RT] Connected as ${role}`);
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`[RT] Disconnected: ${reason}`);
    });

    this.socket.on("connect_error", (err) => {
      console.warn(`[RT] Connection error: ${err.message}`);
    });

    const events = ["notif:new", "notif:unread_count", "ticket:updated"];
    for (const event of events) {
      this.socket.on(event, (payload: any) => {
        if (event === "notif:new" && payload?.notification?.id) {
          if (this.seenIds.has(payload.notification.id)) return;
          this.seenIds.add(payload.notification.id);
          if (this.seenIds.size > 500) {
            const iter = this.seenIds.values();
            for (let i = 0; i < 250; i++) iter.next();
            const keep = new Set<string>();
            for (const v of iter) keep.add(v);
            this.seenIds = keep;
          }
        }
        const fns = this.handlers.get(event);
        if (fns) {
          for (const fn of fns) {
            try { fn(payload); } catch (e) { console.error(`[RT] Handler error for ${event}:`, e); }
          }
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.role = null;
    this.token = null;
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getRole(): string | null {
    return this.role;
  }
}

export const realtimeClient = new RealtimeClient();
