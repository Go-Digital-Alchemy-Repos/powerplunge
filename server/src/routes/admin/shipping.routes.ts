import { Router, Request, Response } from "express";
import { storage } from "../../../storage";

const router = Router();

router.get("/zones", async (req: Request, res: Response) => {
  try {
    const zones = await storage.getShippingZones();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shipping zones" });
  }
});

router.post("/zones", async (req: Request, res: Response) => {
  try {
    const zone = await storage.createShippingZone(req.body);
    res.json(zone);
  } catch (error) {
    res.status(500).json({ message: "Failed to create shipping zone" });
  }
});

router.patch("/zones/:id", async (req: Request, res: Response) => {
  try {
    const zone = await storage.updateShippingZone(req.params.id, req.body);
    if (!zone) {
      return res.status(404).json({ message: "Shipping zone not found" });
    }
    res.json(zone);
  } catch (error) {
    res.status(500).json({ message: "Failed to update shipping zone" });
  }
});

router.delete("/zones/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteShippingZone(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete shipping zone" });
  }
});

router.get("/rates", async (req: Request, res: Response) => {
  try {
    const zoneId = req.query.zoneId as string | undefined;
    const rates = await storage.getShippingRates(zoneId);
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shipping rates" });
  }
});

router.post("/rates", async (req: Request, res: Response) => {
  try {
    const rate = await storage.createShippingRate(req.body);
    res.json(rate);
  } catch (error) {
    res.status(500).json({ message: "Failed to create shipping rate" });
  }
});

router.patch("/rates/:id", async (req: Request, res: Response) => {
  try {
    const rate = await storage.updateShippingRate(req.params.id, req.body);
    if (!rate) {
      return res.status(404).json({ message: "Shipping rate not found" });
    }
    res.json(rate);
  } catch (error) {
    res.status(500).json({ message: "Failed to update shipping rate" });
  }
});

router.delete("/rates/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteShippingRate(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete shipping rate" });
  }
});

const shipmentRoutes = Router({ mergeParams: true });

shipmentRoutes.get("/:orderId/shipments", async (req: Request, res: Response) => {
  try {
    const shipments = await storage.getShipments(req.params.orderId);
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shipments" });
  }
});

shipmentRoutes.post("/:orderId/shipments", async (req: Request, res: Response) => {
  try {
    const order = await storage.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const adminId = req.adminUser?.id;
    
    const shipment = await storage.createShipment({
      orderId: req.params.orderId,
      shippedByAdminId: adminId,
      shippedAt: new Date(),
      status: "shipped",
      ...req.body,
    });
    
    if (order.status === "paid" || order.status === "processing") {
      await storage.updateOrder(req.params.orderId, { status: "shipped" });
    }
    
    const { sendShippingNotification } = await import("../../../email");
    const customer = await storage.getCustomer(order.customerId);
    const items = await storage.getOrderItems(order.id);
    
    if (customer && req.body.sendEmail !== false) {
      const emailResult = await sendShippingNotification(order, items, customer, shipment, adminId);
      return res.json({ ...shipment, emailSent: emailResult.success, emailError: emailResult.error });
    }
    
    res.json(shipment);
  } catch (error) {
    console.error("Failed to create shipment:", error);
    res.status(500).json({ message: "Failed to create shipment" });
  }
});

const shipmentManagementRoutes = Router();

shipmentManagementRoutes.patch("/:id", async (req: Request, res: Response) => {
  try {
    const shipment = await storage.updateShipment(req.params.id, req.body);
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ message: "Failed to update shipment" });
  }
});

shipmentManagementRoutes.post("/:id/resend-email", async (req: Request, res: Response) => {
  try {
    const shipment = await storage.getShipment(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    const order = await storage.getOrder(shipment.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    const customer = await storage.getCustomer(order.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const items = await storage.getOrderItems(order.id);
    const adminId = req.adminUser?.id;
    
    await storage.updateShipment(shipment.id, { shippedEmailSentAt: null });
    
    const { sendShippingNotification } = await import("../../../email");
    const result = await sendShippingNotification(order, items, customer, shipment, adminId);
    
    res.json({ success: result.success, error: result.error });
  } catch (error) {
    console.error("Failed to resend shipping email:", error);
    res.status(500).json({ message: "Failed to resend shipping email" });
  }
});

export default router;
export { shipmentRoutes, shipmentManagementRoutes };
