import { Router } from "express";
import { z } from "zod";
import { db } from "../../../db";
import { supportTickets, customers, orders, adminUsers } from "@shared/schema";
import { eq, desc, and, sql, or, ilike } from "drizzle-orm";
import { requireAdmin } from "../../middleware";

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
    }

    const [updated] = await db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, id))
      .returning();

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

    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

export default router;
