import { Router, Request, Response } from "express";
import { revenueAnalyticsService, RevenueFilters } from "../services/revenue-analytics.service";

const router = Router();

function parseFilters(query: any): RevenueFilters {
  const filters: RevenueFilters = {};
  
  if (query.startDate && query.endDate) {
    filters.dateRange = {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    };
  } else if (query.preset) {
    const now = new Date();
    const start = new Date();
    
    switch (query.preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "mtd":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case "ytd":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    filters.dateRange = { start, end: now };
  }
  
  if (query.channel && ["affiliate", "direct"].includes(query.channel)) {
    filters.channel = query.channel as "affiliate" | "direct";
  }
  
  if (query.productId) {
    filters.productId = query.productId;
  }
  
  if (query.couponCode) {
    filters.couponCode = query.couponCode;
  }
  
  return filters;
}

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const metrics = await revenueAnalyticsService.getMetrics(filters);
    res.json(metrics);
  } catch (error: any) {
    console.error("Failed to get revenue metrics:", error);
    res.status(500).json({ error: { code: "METRICS_ERROR", message: "Failed to fetch revenue metrics" } });
  }
});

router.get("/timeseries/revenue", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const data = await revenueAnalyticsService.getRevenueTimeSeries(filters);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get revenue time series:", error);
    res.status(500).json({ error: { code: "TIMESERIES_ERROR", message: "Failed to fetch revenue time series" } });
  }
});

router.get("/timeseries/orders", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const data = await revenueAnalyticsService.getOrdersTimeSeries(filters);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get orders time series:", error);
    res.status(500).json({ error: { code: "TIMESERIES_ERROR", message: "Failed to fetch orders time series" } });
  }
});

router.get("/timeseries/aov", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const data = await revenueAnalyticsService.getAOVTimeSeries(filters);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get AOV time series:", error);
    res.status(500).json({ error: { code: "TIMESERIES_ERROR", message: "Failed to fetch AOV time series" } });
  }
});

router.get("/timeseries/refunds", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const data = await revenueAnalyticsService.getRefundsTimeSeries(filters);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get refunds time series:", error);
    res.status(500).json({ error: { code: "TIMESERIES_ERROR", message: "Failed to fetch refunds time series" } });
  }
});

router.get("/affiliate-vs-direct", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const data = await revenueAnalyticsService.getAffiliateVsDirectRevenue(filters);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get affiliate vs direct:", error);
    res.status(500).json({ error: { code: "COMPARISON_ERROR", message: "Failed to fetch affiliate comparison" } });
  }
});

router.get("/top-products", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await revenueAnalyticsService.getTopProductsByRevenue(filters, limit);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get top products:", error);
    res.status(500).json({ error: { code: "PRODUCTS_ERROR", message: "Failed to fetch top products" } });
  }
});

router.get("/top-affiliates", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await revenueAnalyticsService.getTopAffiliatesByRevenue(filters, limit);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get top affiliates:", error);
    res.status(500).json({ error: { code: "AFFILIATES_ERROR", message: "Failed to fetch top affiliates" } });
  }
});

router.get("/top-customers", async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query);
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await revenueAnalyticsService.getTopCustomersByLTV(filters, limit);
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get top customers:", error);
    res.status(500).json({ error: { code: "CUSTOMERS_ERROR", message: "Failed to fetch top customers" } });
  }
});

router.get("/products", async (req: Request, res: Response) => {
  try {
    const data = await revenueAnalyticsService.getAvailableProducts();
    res.json(data);
  } catch (error: any) {
    console.error("Failed to get products:", error);
    res.status(500).json({ error: { code: "PRODUCTS_ERROR", message: "Failed to fetch products list" } });
  }
});

export default router;
