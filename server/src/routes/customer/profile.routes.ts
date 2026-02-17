import { Router } from "express";
import { storage } from "../../../storage";
import { db } from "../../../db";
import { customers, orders as ordersTable } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { passwordResetLimiter } from "../../middleware/rate-limiter";
import { customerIdentityService, normalizeEmail } from "../../services/customer-identity.service";

const router = Router();

router.get("/orders", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.json({ orders: [] });
    }
    const customer = identityResult.identity.customer;

    const customerIds = new Set<string>([customer.id]);
    if (customer.email) {
      const relatedCustomers = await db.select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, normalizeEmail(customer.email)));
      for (const rc of relatedCustomers) {
        customerIds.add(rc.id);
      }
    }
    const mergedCustomers = await db.select({ id: customers.id })
      .from(customers)
      .where(eq(customers.mergedIntoCustomerId, customer.id));
    for (const mc of mergedCustomers) {
      customerIds.add(mc.id);
    }

    let allOrders: any[] = [];
    for (const cid of customerIds) {
      const custOrders = await storage.getOrdersByCustomerId(cid);
      allOrders.push(...custOrders);
    }

    const uniqueOrders = Array.from(new Map(allOrders.map(o => [o.id, o])).values());
    uniqueOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const ordersWithItems = await Promise.all(
      uniqueOrders.map(async (order) => {
        const items = await storage.getOrderItems(order.id);
        const shipments = await storage.getShipments(order.id);
        return { ...order, items, shipments };
      })
    );
    
    res.json({ customer, orders: ordersWithItems });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.get("/orders/:id", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const customer = identityResult.identity.customer;
    
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const customerIds = new Set<string>([customer.id]);
    if (customer.email) {
      const relatedCustomers = await db.select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, normalizeEmail(customer.email)));
      for (const rc of relatedCustomers) customerIds.add(rc.id);
    }
    const mergedCustomers = await db.select({ id: customers.id })
      .from(customers)
      .where(eq(customers.mergedIntoCustomerId, customer.id));
    for (const mc of mergedCustomers) customerIds.add(mc.id);

    if (!customerIds.has(order.customerId)) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const items = await storage.getOrderItems(order.id);
    const shipments = await storage.getShipments(order.id);
    res.json({ order, items, customer, shipments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

router.post("/link", async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Platform authentication required" });
    }
    const { customerId, sessionId } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID required" });
    }

    const userEmail = normalizeEmail(req.user.claims.email || "");

    if (sessionId) {
      const order = await storage.getOrderByStripeSession(sessionId);
      if (!order || order.customerId !== customerId) {
        const customer = await storage.getCustomer(customerId);
        if (!customer || normalizeEmail(customer.email) !== userEmail) {
          return res.status(403).json({ message: "Invalid verification" });
        }
      }
    } else {
      const customer = await storage.getCustomer(customerId);
      if (!customer || normalizeEmail(customer.email) !== userEmail) {
        return res.status(403).json({ message: "Email mismatch - cannot link customer" });
      }
    }

    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.userId && customer.userId !== userId) {
      return res.status(400).json({ message: "Customer already linked to another account" });
    }

    const existingCustomer = await storage.getCustomerByUserId(userId);
    if (existingCustomer && existingCustomer.id !== customerId) {
      await db.transaction(async (tx) => {
        const guestOrders = await storage.getOrdersByCustomerId(customerId);
        for (const order of guestOrders) {
          await tx.update(ordersTable)
            .set({ customerId: existingCustomer.id })
            .where(eq(ordersTable.id, order.id));
        }
        await tx.update(customers)
          .set({ mergedIntoCustomerId: existingCustomer.id, userId: null })
          .where(eq(customers.id, customerId));
        console.log(`[MERGE] Customer ${customerId} merged into ${existingCustomer.id}, ${guestOrders.length} orders moved`);
      });
      return res.json({ 
        success: true, 
        message: "Orders merged with existing account",
        customerId: existingCustomer.id 
      });
    }

    const updated = await storage.updateCustomer(customerId, { userId });
    res.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error("Error linking customer:", error);
    res.status(500).json({ message: error.message || "Failed to link customer" });
  }
});

router.get("/profile", async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(userId);
    const customer = await storage.getCustomerByUserId(userId);
    
    res.json({
      user: user || null,
      customer: customer || null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.patch("/profile", async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { firstName, lastName, email, phone, address, city, state, zipCode, country } = req.body;
    
    const normalizedProfileEmail = email ? normalizeEmail(email) : undefined;
    
    const updatedUser = await storage.updateUser(userId, {
      firstName,
      lastName,
      email: normalizedProfileEmail,
    });
    
    let customer = await storage.getCustomerByUserId(userId);
    if (customer) {
      customer = await storage.updateCustomer(customer.id, {
        name: `${firstName || ''} ${lastName || ''}`.trim(),
        email: normalizedProfileEmail || customer.email,
        phone: phone || customer.phone,
        address: address || customer.address,
        city: city || customer.city,
        state: state || customer.state,
        zipCode: zipCode || customer.zipCode,
        country: country || customer.country,
      });
    } else {
      customer = await storage.createCustomer({
        userId,
        name: `${firstName || ''} ${lastName || ''}`.trim(),
        email: normalizedProfileEmail || updatedUser?.email || '',
        phone,
        address,
        city,
        state,
        zipCode,
        country: country || 'USA',
      });
    }
    
    res.json({
      user: updatedUser,
      customer,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.post("/change-password", passwordResetLimiter, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    
    res.status(400).json({ 
      message: "Password change is not available for accounts using Google, Apple, or email link sign-in. Please update your password through your identity provider." 
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

export default router;
