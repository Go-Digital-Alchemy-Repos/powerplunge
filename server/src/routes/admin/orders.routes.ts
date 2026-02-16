import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import { requireFullAccess } from "../../middleware";
import { stripeService } from "../../integrations/stripe/StripeService";
import { normalizeAddress, validateAddress, validateEmail, validatePhone } from "@shared/validation";
import { normalizeEmail } from "../../services/customer-identity.service";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const rawPage = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const rawPageSize = parseInt(req.query.pageSize as string, 10);
    const page = rawPage !== undefined && Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : (rawPage !== undefined ? 1 : undefined);
    const pageSize = Math.min(Number.isFinite(rawPageSize) && rawPageSize >= 1 ? rawPageSize : 50, 100);
    const statusFilter = req.query.status as string | undefined;

    let orders = await storage.getOrders();

    if (statusFilter) {
      orders = orders.filter(o => o.status === statusFilter);
    }

    const total = orders.length;

    if (page !== undefined) {
      const offset = (page - 1) * pageSize;
      orders = orders.slice(offset, offset + pageSize);
    }

    const orderIds = orders.map(o => o.id);
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];

    const [allCustomers, items, orderShipments] = await Promise.all([
      customerIds.length > 0 ? storage.getCustomersByIds(customerIds) : Promise.resolve([]),
      orderIds.length > 0 ? storage.getOrderItemsByOrderIds(orderIds) : Promise.resolve([]),
      orderIds.length > 0 ? storage.getShipmentsByOrderIds(orderIds) : Promise.resolve([]),
    ]);

    const customerMap = new Map(allCustomers.map(c => [c.id, c]));
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const arr = itemsByOrder.get(item.orderId) || [];
      arr.push(item);
      itemsByOrder.set(item.orderId, arr);
    }
    const shipmentsByOrder = new Map<string, typeof orderShipments>();
    for (const s of orderShipments) {
      if (s.orderId) {
        const arr = shipmentsByOrder.get(s.orderId) || [];
        arr.push(s);
        shipmentsByOrder.set(s.orderId, arr);
      }
    }

    const enrichedOrders = orders.map(order => ({
      ...order,
      customer: customerMap.get(order.customerId) || null,
      items: itemsByOrder.get(order.id) || [],
      shipments: shipmentsByOrder.get(order.id) || [],
    }));

    if (page !== undefined) {
      res.json({ data: enrichedOrders, total, page, pageSize });
    } else {
      res.json(enrichedOrders);
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const customer = await storage.getCustomer(order.customerId);
    const items = await storage.getOrderItems(order.id);

    res.json({ ...order, customer, items });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const existingOrder = await storage.getOrder(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const previousStatus = existingOrder.status;
    const order = await storage.updateOrder(req.params.id, { status, notes });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status && status !== previousStatus && ["shipped", "delivered", "cancelled"].includes(status)) {
      const { customerEmailService } = await import("../../../src/services/customer-email.service");
      const emailResult = await customerEmailService.sendOrderStatusUpdate(order.id, status);
      if (emailResult.success) {
        console.log(`Order status update email sent for order ${order.id} (${status})`);
      } else {
        console.log(`Failed to send status update email: ${emailResult.error}`);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to update order" });
  }
});

router.delete("/bulk", requireFullAccess, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Order IDs required" });
    }
    const deletedCount = await storage.deleteOrders(ids);
    res.json({ deletedCount });
  } catch (error) {
    console.error("Failed to delete orders:", error);
    res.status(500).json({ message: "Failed to delete orders" });
  }
});

router.delete("/:id", requireFullAccess, async (req: Request, res: Response) => {
  try {
    const deleted = await storage.deleteOrder(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

router.post("/", requireFullAccess, async (req: Request, res: Response) => {
  try {
    const { customerId, items, notes, status = "pending" } = req.body;

    if (!customerId || !items || !items.length) {
      return res.status(400).json({ message: "Customer ID and items required" });
    }

    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    let totalAmount = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    const order = await storage.createOrder({
      customerId,
      status,
      totalAmount,
      isManualOrder: true,
      notes,
    });

    for (const item of orderItems) {
      await storage.createOrderItem({
        orderId: order.id,
        ...item,
      });
    }

    const orderWithDetails = await storage.getOrder(order.id);
    const orderItemsList = await storage.getOrderItems(order.id);

    try {
      const { sendOrderNotification } = await import("../public/payments.routes");
      await sendOrderNotification(order.id);
    } catch (emailError: any) {
      console.error("Failed to send manual order notification emails:", emailError.message);
    }

    res.json({ ...orderWithDetails, customer, items: orderItemsList });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create order" });
  }
});

router.post("/checkout", requireFullAccess, async (req: Request, res: Response) => {
  try {
    const { customerId, items, shipping, billing, billingSameAsShipping } = req.body;

    if (!customerId || !items || !items.length) {
      return res.status(400).json({ message: "Customer ID and items required" });
    }
    if (!shipping) {
      return res.status(400).json({ message: "Shipping address required" });
    }

    const stripeClient = await stripeService.getClient();
    if (!stripeClient) {
      return res.status(400).json({ message: "Stripe is not configured. Please add your Stripe keys in Settings." });
    }

    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const shippingAddr = {
      name: shipping.name || customer.name || "",
      company: (shipping.company || "").trim(),
      line1: shipping.line1 || "",
      line2: (shipping.line2 || "").trim(),
      city: shipping.city || "",
      state: shipping.state || "",
      postalCode: shipping.postalCode || "",
      country: "US",
    };
    const shippingErrors = validateAddress(shippingAddr);
    if (shippingErrors.length > 0) {
      return res.status(400).json({ errors: shippingErrors });
    }

    const normalizedShipping = normalizeAddress(shippingAddr);

    const isBillingSame = billingSameAsShipping !== false;
    let validatedBilling: { name: string; company?: string; address: string; line2?: string; city: string; state: string; zipCode: string } | null = null;
    if (!isBillingSame && billing) {
      const billingAddr = {
        name: billing.name || "",
        company: (billing.company || "").trim(),
        line1: billing.line1 || "",
        line2: (billing.line2 || "").trim(),
        city: billing.city || "",
        state: billing.state || "",
        postalCode: billing.postalCode || "",
        country: "US",
      };
      const billingErrors = validateAddress(billingAddr, "billing");
      if (billingErrors.length > 0) {
        return res.status(400).json({ errors: billingErrors });
      }
      const normalizedBilling = normalizeAddress(billingAddr);
      validatedBilling = {
        name: normalizedBilling.name,
        company: normalizedBilling.company,
        address: normalizedBilling.line1,
        line2: normalizedBilling.line2,
        city: normalizedBilling.city,
        state: normalizedBilling.state,
        zipCode: normalizedBilling.postalCode,
      };
    }

    let subtotalAmount = 0;
    const orderItems: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }> = [];

    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }
      subtotalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    let taxAmount = 0;
    let taxCalculationId: string | null = null;

    try {
      const taxLineItems = orderItems.map((item) => ({
        amount: item.unitPrice * item.quantity,
        reference: item.productId,
        tax_behavior: "exclusive" as const,
        tax_code: "txcd_99999999",
      }));

      const taxCalculation = await stripeClient.tax.calculations.create({
        currency: "usd",
        line_items: taxLineItems,
        customer_details: {
          address: {
            line1: normalizedShipping.line1 || "",
            city: normalizedShipping.city || "",
            state: normalizedShipping.state,
            postal_code: (normalizedShipping.postalCode || "").split("-")[0],
            country: "US",
          },
          address_source: "shipping",
        },
      });

      taxAmount = taxCalculation.tax_amount_exclusive;
      taxCalculationId = taxCalculation.id;
    } catch (taxError: any) {
      console.error(`[ADMIN-CHECKOUT][TAX] Calculation failed:`, taxError.message);
      return res.status(422).json({
        message: "Unable to calculate tax. Please verify the shipping address.",
      });
    }

    const totalAmount = subtotalAmount + taxAmount;

    const order = await storage.createOrder({
      customerId,
      status: "pending",
      totalAmount,
      subtotalAmount,
      taxAmount: taxAmount > 0 ? taxAmount : null,
      stripeTaxCalculationId: taxCalculationId,
      isManualOrder: true,
      shippingName: normalizedShipping.name,
      shippingCompany: shippingAddr.company || null,
      shippingAddress: normalizedShipping.line1,
      shippingLine2: shippingAddr.line2 || null,
      shippingCity: normalizedShipping.city,
      shippingState: normalizedShipping.state,
      shippingZip: normalizedShipping.postalCode,
      shippingCountry: "US",
      billingSameAsShipping: isBillingSame,
      billingName: validatedBilling?.name || null,
      billingCompany: validatedBilling?.company || null,
      billingAddress: validatedBilling?.address || null,
      billingLine2: validatedBilling?.line2 || null,
      billingCity: validatedBilling?.city || null,
      billingState: validatedBilling?.state || null,
      billingZip: validatedBilling?.zipCode || null,
      billingCountry: validatedBilling ? "US" : null,
      notes: "Manual order created by admin via phone checkout",
    });

    for (const item of orderItems) {
      await storage.createOrderItem({ orderId: order.id, ...item });
    }

    let paymentIntent;
    try {
      paymentIntent = await stripeClient.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        metadata: {
          orderId: order.id,
          customerId,
          isManualOrder: "true",
          taxAmount: taxAmount.toString(),
          taxCalculationId: taxCalculationId || "",
        },
      });
    } catch (stripeError: any) {
      console.error("[ADMIN-CHECKOUT] PaymentIntent creation failed, cleaning up order:", stripeError.message);
      await storage.updateOrder(order.id, { status: "cancelled" });
      return res.status(500).json({ message: "Failed to create payment. Order has been cancelled." });
    }

    await storage.updateOrder(order.id, {
      stripePaymentIntentId: paymentIntent.id,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      subtotal: subtotalAmount,
      taxAmount,
      total: totalAmount,
    });
  } catch (error: any) {
    console.error("[ADMIN-CHECKOUT] Error:", error);
    res.status(500).json({ message: error.message || "Failed to create checkout" });
  }
});

export default router;
