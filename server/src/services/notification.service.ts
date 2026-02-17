import { db } from "../../db";
import { notifications, adminUsers, customers } from "@shared/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import type { InsertNotification, Notification } from "@shared/schema";

export class NotificationService {
  async create(data: InsertNotification): Promise<Notification | null> {
    const result = await db
      .insert(notifications)
      .values(data)
      .onConflictDoNothing({ target: notifications.dedupeKey })
      .returning();

    const created = result[0] ?? null;

    if (created) {
      this.emitNewNotification(created).catch(() => {});
    }

    return created;
  }

  async createMany(items: InsertNotification[]): Promise<Notification[]> {
    if (items.length === 0) return [];
    const result = await db
      .insert(notifications)
      .values(items)
      .onConflictDoNothing({ target: notifications.dedupeKey })
      .returning();

    for (const n of result) {
      this.emitNewNotification(n).catch(() => {});
    }

    return result;
  }

  private async emitNewNotification(notification: Notification): Promise<void> {
    try {
      const { emitNotification, emitUnreadCount } = await import("../realtime/socketServer");
      const role = notification.recipientType as "admin" | "customer";
      emitNotification(role, notification.recipientId, notification);
      await emitUnreadCount(role, notification.recipientId);
    } catch (err) {
      // Socket not available yet or emit failed — non-critical
    }
  }

  async listForRecipient(
    recipientType: "admin" | "customer",
    recipientId: string,
    limit = 50,
    offset = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where = and(
      eq(notifications.recipientType, recipientType),
      eq(notifications.recipientId, recipientId)
    );

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(where),
    ]);

    return { notifications: items, total: countResult[0]?.count ?? 0 };
  }

  async getUnreadCount(
    recipientType: "admin" | "customer",
    recipientId: string
  ): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count ?? 0;
  }

  async markRead(id: string, recipientType: string, recipientId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId)
        )
      )
      .returning({ id: notifications.id });

    if (result.length > 0) {
      this.emitUpdatedUnreadCount(recipientType as "admin" | "customer", recipientId);
    }

    return result.length > 0;
  }

  async markAllRead(recipientType: "admin" | "customer", recipientId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false)
        )
      )
      .returning({ id: notifications.id });

    if (result.length > 0) {
      this.emitUpdatedUnreadCount(recipientType, recipientId);
    }

    return result.length;
  }

  private emitUpdatedUnreadCount(role: "admin" | "customer", userId: string): void {
    import("../realtime/socketServer")
      .then(({ emitUnreadCount }) => emitUnreadCount(role, userId))
      .catch(() => {});
  }

  // --- Ticket-specific helpers ---

  async notifyAdminsOfNewTicket(ticket: {
    id: string;
    subject: string;
    message: string;
    type: string;
    customerName?: string;
  }): Promise<void> {
    const admins = await db.select({ id: adminUsers.id }).from(adminUsers);
    const items: InsertNotification[] = admins.map((admin) => ({
      recipientType: "admin",
      recipientId: admin.id,
      type: "ticket.new",
      title: `New support ticket: ${ticket.subject}`,
      body: `${ticket.customerName || "A customer"} submitted a ${ticket.type} ticket.`,
      linkUrl: `/admin/support?ticket=${ticket.id}`,
      entityType: "ticket",
      entityId: ticket.id,
      dedupeKey: `ticket.new:${ticket.id}:${admin.id}`,
      metadata: { ticketType: ticket.type },
    }));
    const created = await this.createMany(items);

    if (created.length > 0) {
      this.emitTicketUpdate("admin", admins.map(a => a.id), ticket.id);
    }
  }

  async notifyAdminsOfCustomerReply(ticket: {
    id: string;
    subject: string;
    customerName?: string;
  }): Promise<void> {
    const admins = await db.select({ id: adminUsers.id }).from(adminUsers);
    const items: InsertNotification[] = admins.map((admin) => ({
      recipientType: "admin",
      recipientId: admin.id,
      type: "ticket.message.customer",
      title: `New reply on ticket: ${ticket.subject}`,
      body: `${ticket.customerName || "Customer"} replied to their support ticket.`,
      linkUrl: `/admin/support?ticket=${ticket.id}`,
      entityType: "ticket",
      entityId: ticket.id,
      dedupeKey: `ticket.reply.customer:${ticket.id}:${admin.id}:${Date.now()}`,
      metadata: {},
    }));
    const created = await this.createMany(items);

    if (created.length > 0) {
      this.emitTicketUpdate("admin", admins.map(a => a.id), ticket.id);
    }
  }

  async notifyCustomerOfAdminReply(ticket: {
    id: string;
    subject: string;
    customerId: string;
    adminName?: string;
  }): Promise<void> {
    const created = await this.create({
      recipientType: "customer",
      recipientId: ticket.customerId,
      type: "ticket.message.admin",
      title: `Response to your ticket: ${ticket.subject}`,
      body: `${ticket.adminName || "Support team"} replied to your support ticket.`,
      linkUrl: `/my-account?tab=support`,
      entityType: "ticket",
      entityId: ticket.id,
      dedupeKey: `ticket.reply.admin:${ticket.id}:${ticket.customerId}:${Date.now()}`,
      metadata: {},
    });

    if (created) {
      this.emitTicketUpdate("customer", [ticket.customerId], ticket.id);
    }
  }

  async notifyCustomerOfStatusChange(ticket: {
    id: string;
    subject: string;
    customerId: string;
    newStatus: string;
  }): Promise<void> {
    const created = await this.create({
      recipientType: "customer",
      recipientId: ticket.customerId,
      type: "ticket.status",
      title: `Ticket updated: ${ticket.subject}`,
      body: `Your support ticket status has been changed to "${ticket.newStatus}".`,
      linkUrl: `/my-account?tab=support`,
      entityType: "ticket",
      entityId: ticket.id,
      dedupeKey: `ticket.status:${ticket.id}:${ticket.newStatus}:${Date.now()}`,
      metadata: { newStatus: ticket.newStatus },
    });

    if (created) {
      this.emitTicketUpdate("customer", [ticket.customerId], ticket.id);
    }
  }

  private emitTicketUpdate(role: "admin" | "customer", userIds: string[], ticketId: string): void {
    import("../realtime/socketServer")
      .then(({ emitTicketUpdated }) => {
        for (const uid of userIds) {
          emitTicketUpdated(role, uid, { ticketId, needsAttention: true });
        }
      })
      .catch(() => {});
  }
}

export const notificationService = new NotificationService();
