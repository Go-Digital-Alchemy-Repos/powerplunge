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
    return result[0] ?? null;
  }

  async createMany(items: InsertNotification[]): Promise<void> {
    if (items.length === 0) return;
    await db
      .insert(notifications)
      .values(items)
      .onConflictDoNothing({ target: notifications.dedupeKey });
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
    return result.length;
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
    await this.createMany(items);
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
    await this.createMany(items);
  }

  async notifyCustomerOfAdminReply(ticket: {
    id: string;
    subject: string;
    customerId: string;
    adminName?: string;
  }): Promise<void> {
    await this.create({
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
  }

  async notifyCustomerOfStatusChange(ticket: {
    id: string;
    subject: string;
    customerId: string;
    newStatus: string;
  }): Promise<void> {
    await this.create({
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
  }
}

export const notificationService = new NotificationService();
