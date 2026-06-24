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
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const sessionCustomer = identityResult.identity.customer;
    const { customerId, sessionId } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID required" });
    }

    const userEmail = normalizeEmail(sessionCustomer.email || "");

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

    if (customer.id === sessionCustomer.id) {
      return res.json({ success: true, customer: sessionCustomer, customerId: sessionCustomer.id });
    }

    await db.transaction(async (tx) => {
      const guestOrders = await storage.getOrdersByCustomerId(customer.id);
      for (const order of guestOrders) {
        await tx.update(ordersTable)
          .set({ customerId: sessionCustomer.id })
          .where(eq(ordersTable.id, order.id));
      }
      await tx.update(customers)
        .set({ mergedIntoCustomerId: sessionCustomer.id, userId: null })
        .where(eq(customers.id, customer.id));
      console.log(`[MERGE] Customer ${customer.id} merged into ${sessionCustomer.id}, ${guestOrders.length} orders moved`);
    });

    res.json({
      success: true,
      message: "Orders merged with existing account",
      customerId: sessionCustomer.id,
    });
  } catch (error: any) {
    console.error("Error linking customer:", error);
    res.status(500).json({ message: error.message || "Failed to link customer" });
  }
});

router.get("/profile", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }

    const customer = identityResult.identity.customer;
    
    res.json({
      user: null,
      customer: customer || null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.patch("/profile", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const customerId = identityResult.identity.customerId;
    const { firstName, lastName, email, phone, address, city, state, zipCode, country } = req.body;
    
    const requestedEmail = email ? normalizeEmail(email) : undefined;
    if (
      requestedEmail &&
      requestedEmail !== normalizeEmail(identityResult.identity.customer.email || "")
    ) {
      return res.status(400).json({ message: "Email changes require the customer auth email to match" });
    }
    const normalizedProfileEmail = requestedEmail;
    
    let customer = await storage.getCustomer(customerId);
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
        userId: null,
        name: `${firstName || ''} ${lastName || ''}`.trim(),
        email: normalizedProfileEmail || identityResult.identity.customer.email || '',
        phone,
        address,
        city,
        state,
        zipCode,
        country: country || 'USA',
      });
    }
    
    res.json({
      user: null,
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
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
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
