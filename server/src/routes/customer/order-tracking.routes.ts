import { Router } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import { customerEmailService } from "../../services/customer-email.service";
import { 
  requireCustomerAuth,
  createSessionToken,
  AuthenticatedRequest 
} from "../../middleware/customer-auth.middleware";
import { db } from "../../../db";
import { supportTickets, orders } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const requestMagicLinkSchema = z.object({
  email: z.string().email(),
});

router.post("/request-magic-link", async (req, res) => {
  try {
    const { email } = requestMagicLinkSchema.parse(req.body);
    
    await customerEmailService.sendMagicLinkEmail(email);
    
    res.json({ 
      success: true, 
      message: "If an account exists with this email, you will receive a login link shortly." 
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    console.error("Magic link request error:", error);
    res.status(500).json({ message: "Failed to send magic link" });
  }
});

const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

router.post("/verify-token", async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse(req.body);
    
    const result = await customerEmailService.verifyMagicLinkToken(token);
    
    if (!result.valid) {
      return res.status(400).json({ message: result.error || "Invalid or expired link" });
    }

    const customer = await storage.getCustomer(result.customerId!);
    if (!customer) {
      return res.status(400).json({ message: "Customer not found" });
    }

    const sessionToken = createSessionToken(String(customer.id), customer.email);

    res.json({ 
      success: true, 
      sessionToken,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid token" });
    }
    console.error("Token verification error:", error);
    res.status(500).json({ message: "Failed to verify token" });
  }
});

router.get("/orders", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    const orders = await storage.getOrdersByCustomerId(customerId);
    
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await storage.getOrderItems(order.id);
        return { ...order, items };
      })
    );

    res.json(ordersWithItems);
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.get("/order/:orderId", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.customerSession!.customerId;
    
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customerId !== customerId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const items = await storage.getOrderItems(orderId);
    const customer = await storage.getCustomer(order.customerId);
    const shipments = await storage.getShipments(orderId);

    res.json({ ...order, items, customer, shipments });
  } catch (error: any) {
    console.error("Fetch order error:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

router.get("/support", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;

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
    })
    .from(supportTickets)
    .where(eq(supportTickets.customerId, customerId))
    .orderBy(desc(supportTickets.createdAt));

    res.json({ tickets });
  } catch (error: any) {
    console.error("Fetch support tickets error:", error);
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  orderId: z.string().optional(),
  type: z.enum(["general", "return", "refund", "shipping", "technical"]).default("general"),
});

router.post("/support", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const data = createTicketSchema.parse(req.body);

    if (data.orderId) {
      const order = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, data.orderId),
          eq(orders.customerId, customerId)
        ),
      });
      if (!order) {
        return res.status(400).json({ message: "Order not found or does not belong to you" });
      }
    }

    const [ticket] = await db.insert(supportTickets).values({
      customerId,
      orderId: data.orderId || null,
      subject: data.subject,
      message: data.message,
      type: data.type,
    }).returning();

    res.status(201).json({ success: true, ticket });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Create support ticket error:", error);
    res.status(500).json({ message: "Failed to create support ticket" });
  }
});

router.get("/vip-status", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const customerAny = customer as any;
    const isVip = customerAny.isVip || false;
    const vipSince = customerAny.vipSince || null;
    
    res.json({ isVip, vipSince });
  } catch (error: any) {
    console.error("Fetch VIP status error:", error);
    res.status(500).json({ message: "Failed to fetch VIP status" });
  }
});

export default router;
