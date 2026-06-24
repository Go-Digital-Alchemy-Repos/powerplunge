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

      if (role === "admin") {
        const { getAdminAuthContext } = await import("../auth/adminBetterAuth");
        const context = await getAdminAuthContext({ headers: socket.handshake.headers } as any);
        if (!context) {
          return next(new Error("Invalid admin session"));
        }
        (socket as any).data = { userId: context.admin.id, role: "admin" } satisfies SocketData;
        return next();
      }

      if (role === "customer") {
        const { getCustomerAuthContext } = await import("../auth/customerBetterAuth");
        const context = await getCustomerAuthContext({ headers: socket.handshake.headers } as any);
        if (!context) {
          return next(new Error("Invalid customer session"));
        }
        (socket as any).data = { userId: context.customer.id, role: "customer" } satisfies SocketData;
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
