import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import { requireFullAccess } from "../../middleware";

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

    res.json({ ...orderWithDetails, customer, items: orderItemsList });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create order" });
  }
});

export default router;
