import { Router } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import { customerEmailService } from "../../services/customer-email.service";
import { 
  requireCustomerAuth,
  createSessionToken,
  AuthenticatedRequest 
} from "../../middleware/customer-auth.middleware";

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
    res.json({ tickets: [] });
  } catch (error: any) {
    console.error("Fetch support tickets error:", error);
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  orderId: z.string().optional(),
  type: z.string().optional(),
});

router.post("/support", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const data = createTicketSchema.parse(req.body);
    res.json({ success: true, message: "Support request submitted" });
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
