import { Router } from "express";
import { z } from "zod";
import { db } from "../../../db";
import { supportTickets, customers, orders, orderItems, adminUsers, emailLogs } from "@shared/schema";
import { eq, desc, and, sql, or, ilike } from "drizzle-orm";
import { requireAdmin } from "../../middleware";
import { notificationService } from "../../services/notification.service";
import { sendAdminReplyToCustomer, sendStatusChangeToCustomer } from "../../services/support-email.service";

const router = Router();

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  orderId: z.string().optional(),
  type: z.enum(["general", "return", "refund", "shipping", "technical"]).default("general"),
});

router.post("/", async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.userId, user.id),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }

    if (parsed.data.orderId) {
      const order = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, parsed.data.orderId),
          eq(orders.customerId, customer.id)
        ),
      });
      if (!order) {
        return res.status(400).json({ message: "Order not found or does not belong to you" });
      }
    }

    const [ticket] = await db.insert(supportTickets).values({
      customerId: customer.id,
      orderId: parsed.data.orderId || null,
      subject: parsed.data.subject,
      message: parsed.data.message,
      type: parsed.data.type,
    }).returning();

    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.userId, user.id),
    });

    if (!customer) {
      return res.json({ tickets: [] });
    }

    const tickets = await db.select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      message: supportTickets.message,
      type: supportTickets.type,
      status: supportTickets.status,
      priority: supportTickets.priority,
      orderId: supportTickets.orderId,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt,
    })
    .from(supportTickets)
    .where(eq(supportTickets.customerId, customer.id))
    .orderBy(desc(supportTickets.createdAt));

    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

export const adminSupportRouter = Router();

adminSupportRouter.get("/", requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    
    let whereClause = undefined;
    if (status && status !== "all") {
      whereClause = eq(supportTickets.status, status);
    }

    const tickets = await db.select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      message: supportTickets.message,
      type: supportTickets.type,
      status: supportTickets.status,
      priority: supportTickets.priority,
      orderId: supportTickets.orderId,
      adminNotes: supportTickets.adminNotes,
      customerReplies: supportTickets.customerReplies,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt,
      resolvedBy: supportTickets.resolvedBy,
      customerId: supportTickets.customerId,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(supportTickets)
    .leftJoin(customers, eq(supportTickets.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(supportTickets.createdAt));

    const stats = await db.select({
      status: supportTickets.status,
      count: sql<number>`count(*)::int`,
    })
    .from(supportTickets)
    .groupBy(supportTickets.status);

    res.json({ tickets, stats });
  } catch (error) {
    next(error);
  }
});

adminSupportRouter.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await db.select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      message: supportTickets.message,
      type: supportTickets.type,
      status: supportTickets.status,
      priority: supportTickets.priority,
      orderId: supportTickets.orderId,
      adminNotes: supportTickets.adminNotes,
      customerReplies: supportTickets.customerReplies,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt,
      resolvedBy: supportTickets.resolvedBy,
      customerId: supportTickets.customerId,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(supportTickets)
    .leftJoin(customers, eq(supportTickets.customerId, customers.id))
    .where(eq(supportTickets.id, id))
    .limit(1);

    if (!ticket.length) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ ticket: ticket[0] });
  } catch (error) {
    next(error);
  }
});

const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  noteText: z.string().min(1).max(5000).optional(),
});

adminSupportRouter.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).adminId;

    const parsed = updateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const existing = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, id),
    });

    if (!existing) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (parsed.data.status) {
      updateData.status = parsed.data.status;
      if (parsed.data.status === "resolved" || parsed.data.status === "closed") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = adminId;
      }
    }

    if (parsed.data.priority) {
      updateData.priority = parsed.data.priority;
    }

    if (parsed.data.noteText) {
      const admin = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, adminId),
      });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() || admin.name : "Unknown";

      const existingNotes = Array.isArray(existing.adminNotes) ? existing.adminNotes : [];
      updateData.adminNotes = [
        ...existingNotes,
        {
          text: parsed.data.noteText,
          adminId,
          adminName,
          createdAt: new Date().toISOString(),
        },
      ];

      // Automatically change status to 'In Progress' if currently 'Open'
      if (existing.status === "open" && !parsed.data.status) {
        updateData.status = "in_progress";
      }
    }

    const [updated] = await db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();

    const customer = existing.customerId
      ? await db.query.customers.findFirst({ where: eq(customers.id, existing.customerId) })
      : null;

    if (parsed.data.noteText && existing.customerId) {
      const admin = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, adminId),
      });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() || admin.name : "Support team";
      notificationService.notifyCustomerOfAdminReply({
        id: existing.id,
        subject: existing.subject,
        customerId: existing.customerId,
        adminName,
      }).catch((err) => console.error("Failed to create admin reply notification:", err));

      if (customer?.email) {
        sendAdminReplyToCustomer({
          ticketId: existing.id,
          customerId: existing.customerId,
          customerName: customer.name || "Customer",
          customerEmail: customer.email,
          subject: existing.subject,
          replyText: parsed.data.noteText,
          adminName,
        }).catch((err) => console.error("Failed to send admin reply email:", err));
      }
    }

    if (parsed.data.status && parsed.data.status !== existing.status && existing.customerId) {
      notificationService.notifyCustomerOfStatusChange({
        id: existing.id,
        subject: existing.subject,
        customerId: existing.customerId,
        newStatus: parsed.data.status,
      }).catch((err) => console.error("Failed to create status change notification:", err));

      if (customer?.email && !parsed.data.noteText) {
        sendStatusChangeToCustomer({
          ticketId: existing.id,
          customerId: existing.customerId,
          customerName: customer.name || "Customer",
          customerEmail: customer.email,
          subject: existing.subject,
          newStatus: parsed.data.status,
        }).catch((err) => console.error("Failed to send status change email:", err));
      }
    }

    res.json({ ticket: updated });
  } catch (error) {
    next(error);
  }
});

adminSupportRouter.get("/customers/search", requireAdmin, async (req, res, next) => {
  try {
    const query = (req.query.q as string || "").trim();
    if (!query || query.length < 2) {
      return res.json({ customers: [] });
    }

    const searchPattern = `%${query}%`;
    const results = await db.select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
    })
    .from(customers)
    .where(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.email, searchPattern),
        ilike(customers.phone, searchPattern)
      )
    )
    .limit(20);

    res.json({ customers: results });
  } catch (error) {
    next(error);
  }
});

const adminCreateTicketSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  type: z.enum(["general", "return", "refund", "shipping", "technical"]).default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  orderId: z.string().optional(),
});

adminSupportRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const parsed = adminCreateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, parsed.data.customerId),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (parsed.data.orderId) {
      const order = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, parsed.data.orderId),
          eq(orders.customerId, customer.id)
        ),
      });
      if (!order) {
        return res.status(400).json({ message: "Order not found or does not belong to this customer" });
      }
    }

    const [ticket] = await db.insert(supportTickets).values({
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId || null,
      subject: parsed.data.subject,
      message: parsed.data.message,
      type: parsed.data.type,
      priority: parsed.data.priority,
    }).returning();

    notificationService.notifyCustomerOfAdminReply({
      id: ticket.id,
      subject: ticket.subject,
      customerId: parsed.data.customerId,
      adminName: "Support team",
    }).catch((err) => console.error("Failed to create admin-created ticket notification:", err));

    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

adminSupportRouter.get("/email-logs/:ticketId", requireAdmin, async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const logs = await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.ticketId, ticketId))
      .orderBy(emailLogs.createdAt);

    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

adminSupportRouter.get("/customers/:customerId/orders", requireAdmin, async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerOrders = await db.select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      shippingName: orders.shippingName,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(20);

    const [aggregates] = await db.select({
      totalSpent: sql<number>`coalesce(sum(case when ${orders.status} != 'cancelled' then ${orders.totalAmount} else 0 end), 0)::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId));

    const orderIds = customerOrders.map(o => o.id);
    let items: Array<{ id: string; orderId: string; productName: string; quantity: number; unitPrice: number }> = [];
    if (orderIds.length > 0) {
      items = await db.select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
      })
      .from(orderItems)
      .where(sql`${orderItems.orderId} = ANY(${orderIds})`);
    }

    const ordersWithItems = customerOrders.map(order => ({
      ...order,
      items: items.filter(i => i.orderId === order.id),
    }));

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        createdAt: customer.createdAt,
      },
      orders: ordersWithItems,
      totalSpent: aggregates.totalSpent,
      orderCount: aggregates.orderCount,
    });
  } catch (error) {
    next(error);
  }
});

adminSupportRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, id),
    });

    if (!existing) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await db.delete(emailLogs).where(eq(emailLogs.ticketId, id));
    await db.delete(supportTickets).where(eq(supportTickets.id, id));

    res.json({ message: "Ticket deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
