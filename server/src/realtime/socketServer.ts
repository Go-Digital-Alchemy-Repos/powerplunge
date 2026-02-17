import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import type { Notification } from "@shared/schema";

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

interface SocketData {
  userId: string;
  role: "admin" | "customer";
}

export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
    },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const auth = socket.handshake.auth;
      const role = auth?.role as string;
      const token = auth?.token as string;

      if (role === "admin") {
        const sessionCookie = socket.handshake.headers.cookie;
        if (!sessionCookie) {
          return next(new Error("Admin authentication required"));
        }
        const adminId = await resolveAdminFromCookie(sessionCookie);
        if (!adminId) {
          return next(new Error("Invalid admin session"));
        }
        (socket as any).data = { userId: adminId, role: "admin" } satisfies SocketData;
        return next();
      }

      if (role === "customer" && token) {
        const { verifySessionToken } = await import("../middleware/customer-auth.middleware");
        const result = verifySessionToken(token);
        if (!result.valid || !result.customerId) {
          return next(new Error("Invalid customer session"));
        }
        (socket as any).data = { userId: result.customerId, role: "customer" } satisfies SocketData;
        return next();
      }

      return next(new Error("Authentication required"));
    } catch (err) {
      console.error("[SOCKET] Auth error:", err);
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const data = (socket as any).data as SocketData;
    if (!data?.userId || !data?.role) {
      socket.disconnect(true);
      return;
    }

    const userRoom = `${data.role}:${data.userId}`;
    socket.join(userRoom);

    if (data.role === "admin") {
      socket.join("role:admin");
    }

    console.log(`[SOCKET] Connected: ${data.role}:${data.userId.slice(0, 8)} (${socket.id})`);

    socket.on("disconnect", (reason) => {
      console.log(`[SOCKET] Disconnected: ${data.role}:${data.userId.slice(0, 8)} (${reason})`);
    });
  });

  console.log("[SOCKET] Socket.IO server initialized");
  return io;
}

async function resolveAdminFromCookie(cookieHeader: string): Promise<string | null> {
  try {
    const cookies = parseCookies(cookieHeader);
    const sid = cookies["connect.sid"];
    if (!sid) return null;

    const unsignedSid = extractSessionId(sid);
    if (!unsignedSid) return null;

    const { pool } = await import("../../db");
    const result = await pool.query(
      `SELECT sess FROM "sessions" WHERE sid = $1 AND expire > NOW()`,
      [unsignedSid]
    );

    if (!result.rows.length) return null;

    const sess = result.rows[0].sess;
    const adminId = typeof sess === "string" ? JSON.parse(sess).adminId : sess?.adminId;
    return adminId || null;
  } catch (err) {
    console.error("[SOCKET] Cookie parse error:", err);
    return null;
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [key, ...rest] = cookie.trim().split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(rest.join("="));
    }
  });
  return cookies;
}

function extractSessionId(signedCookie: string): string | null {
  if (signedCookie.startsWith("s:")) {
    const dotIndex = signedCookie.indexOf(".", 2);
    return dotIndex > 0 ? signedCookie.slice(2, dotIndex) : signedCookie.slice(2);
  }
  return signedCookie;
}

export function emitToUser(role: "admin" | "customer", userId: string, event: string, payload: any): void {
  if (!io) return;
  io.to(`${role}:${userId}`).emit(event, payload);
}

export function emitToAllAdmins(event: string, payload: any): void {
  if (!io) return;
  io.to("role:admin").emit(event, payload);
}

export function emitNotification(role: "admin" | "customer", userId: string, notification: Notification): void {
  emitToUser(role, userId, "notif:new", { notification });
}

export async function emitUnreadCount(role: "admin" | "customer", userId: string): Promise<void> {
  if (!io) return;
  try {
    const { notificationService } = await import("../services/notification.service");
    const count = await notificationService.getUnreadCount(role, userId);
    emitToUser(role, userId, "notif:unread_count", { unreadCount: count });
  } catch (err) {
    console.error("[SOCKET] Failed to emit unread count:", err);
  }
}

export function emitTicketUpdated(
  role: "admin" | "customer",
  userId: string,
  payload: { ticketId: string; needsAttention?: boolean }
): void {
  emitToUser(role, userId, "ticket:updated", payload);
}
