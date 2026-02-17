import { Router, Request, Response } from "express";
import { storage } from "../../../storage";

const router = Router();

router.get("/sales", async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    const orders = await storage.getOrders();
    const filteredOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= startDate && orderDate <= endDate && (o.status === "paid" || o.status === "shipped" || o.status === "delivered");
    });
    
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (const order of filteredOrders) {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
      }
      dailyData[dateKey].revenue += order.totalAmount;
      dailyData[dateKey].orders += 1;
    }
    
    res.json({
      summary: { totalRevenue, totalOrders, averageOrderValue },
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate sales report" });
  }
});

router.get("/products", async (req: Request, res: Response) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json({ topProducts: stats.topProducts });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate product report" });
  }
});

router.get("/customers", async (req: Request, res: Response) => {
  try {
    const customers = await storage.getCustomers();
    const orders = await storage.getOrders();
    
    const customerStats = customers.map(c => {
      const customerOrders = orders.filter(o => o.customerId === c.id);
      const totalSpent = customerOrders
        .filter(o => !!o.stripePaymentIntentId)
        .reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        ...c,
        orderCount: customerOrders.length,
        totalSpent,
        lastOrderDate: customerOrders.length > 0 ? customerOrders[0].createdAt : null,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
    
    res.json({ customers: customerStats.slice(0, 50) });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate customer report" });
  }
});

router.get("/export", async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const orders = await storage.getOrders();
    const customers = await storage.getCustomers();
    
    if (type === "orders") {
      const csv = ["Order ID,Customer,Email,Status,Total,Date"];
      for (const order of orders) {
        const customer = customers.find(c => c.id === order.customerId);
        csv.push(`${order.id},${customer?.name || ""},${customer?.email || ""},${order.status},$${(order.totalAmount / 100).toFixed(2)},${new Date(order.createdAt).toISOString()}`);
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
      res.send(csv.join("\n"));
    } else if (type === "customers") {
      const csv = ["Customer ID,Name,Email,Phone,City,State,Order Count"];
      for (const customer of customers) {
        const orderCount = orders.filter(o => o.customerId === customer.id).length;
        csv.push(`${customer.id},${customer.name},${customer.email},${customer.phone || ""},${customer.city || ""},${customer.state || ""},${orderCount}`);
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=customers.csv");
      res.send(csv.join("\n"));
    } else {
      res.status(400).json({ message: "Invalid export type" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to export data" });
  }
});

export default router;
