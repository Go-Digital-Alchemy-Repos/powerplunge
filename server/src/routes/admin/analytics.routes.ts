import { Router } from "express";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const router = Router();

function getAnalyticsClient(): BetaAnalyticsDataClient | null {
  const email = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) return null;

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
  });
}

function getPropertyId(): string | null {
  return process.env.GA4_PROPERTY_ID || null;
}

router.get("/status", async (_req, res) => {
  const client = getAnalyticsClient();
  const propertyId = getPropertyId();
  res.json({
    configured: !!(client && propertyId),
    hasCredentials: !!client,
    hasPropertyId: !!propertyId,
  });
});

router.get("/overview", async (req, res) => {
  try {
    const client = getAnalyticsClient();
    const propertyId = getPropertyId();
    if (!client || !propertyId) {
      return res.status(400).json({ error: "Google Analytics not configured. Set GA_SERVICE_ACCOUNT_EMAIL, GA_SERVICE_ACCOUNT_PRIVATE_KEY, and GA4_PROPERTY_ID." });
    }

    const startDate = (req.query.startDate as string) || "30daysAgo";
    const endDate = (req.query.endDate as string) || "today";

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "newUsers" },
        { name: "totalRevenue" },
        { name: "ecommercePurchases" },
      ],
    });

    const row = response.rows?.[0];
    const metrics = {
      activeUsers: Number(row?.metricValues?.[0]?.value || 0),
      sessions: Number(row?.metricValues?.[1]?.value || 0),
      pageViews: Number(row?.metricValues?.[2]?.value || 0),
      avgSessionDuration: Number(row?.metricValues?.[3]?.value || 0),
      bounceRate: Number(row?.metricValues?.[4]?.value || 0),
      newUsers: Number(row?.metricValues?.[5]?.value || 0),
      totalRevenue: Number(row?.metricValues?.[6]?.value || 0),
      purchases: Number(row?.metricValues?.[7]?.value || 0),
    };

    res.json(metrics);
  } catch (err: any) {
    console.error("[GA4 API] Overview error:", err.message);
    res.status(500).json({ error: "Failed to fetch analytics overview", details: err.message });
  }
});

router.get("/traffic-over-time", async (req, res) => {
  try {
    const client = getAnalyticsClient();
    const propertyId = getPropertyId();
    if (!client || !propertyId) {
      return res.status(400).json({ error: "Google Analytics not configured" });
    }

    const startDate = (req.query.startDate as string) || "30daysAgo";
    const endDate = (req.query.endDate as string) || "today";

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    });

    const data = (response.rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || "",
      activeUsers: Number(row.metricValues?.[0]?.value || 0),
      sessions: Number(row.metricValues?.[1]?.value || 0),
      pageViews: Number(row.metricValues?.[2]?.value || 0),
    }));

    res.json(data);
  } catch (err: any) {
    console.error("[GA4 API] Traffic over time error:", err.message);
    res.status(500).json({ error: "Failed to fetch traffic data", details: err.message });
  }
});

router.get("/top-pages", async (req, res) => {
  try {
    const client = getAnalyticsClient();
    const propertyId = getPropertyId();
    if (!client || !propertyId) {
      return res.status(400).json({ error: "Google Analytics not configured" });
    }

    const startDate = (req.query.startDate as string) || "30daysAgo";
    const endDate = (req.query.endDate as string) || "today";

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    });

    const data = (response.rows || []).map((row) => ({
      page: row.dimensionValues?.[0]?.value || "",
      pageViews: Number(row.metricValues?.[0]?.value || 0),
      users: Number(row.metricValues?.[1]?.value || 0),
      avgDuration: Number(row.metricValues?.[2]?.value || 0),
    }));

    res.json(data);
  } catch (err: any) {
    console.error("[GA4 API] Top pages error:", err.message);
    res.status(500).json({ error: "Failed to fetch top pages", details: err.message });
  }
});

router.get("/devices", async (req, res) => {
  try {
    const client = getAnalyticsClient();
    const propertyId = getPropertyId();
    if (!client || !propertyId) {
      return res.status(400).json({ error: "Google Analytics not configured" });
    }

    const startDate = (req.query.startDate as string) || "30daysAgo";
    const endDate = (req.query.endDate as string) || "today";

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    });

    const data = (response.rows || []).map((row) => ({
      device: row.dimensionValues?.[0]?.value || "",
      users: Number(row.metricValues?.[0]?.value || 0),
      sessions: Number(row.metricValues?.[1]?.value || 0),
    }));

    res.json(data);
  } catch (err: any) {
    console.error("[GA4 API] Devices error:", err.message);
    res.status(500).json({ error: "Failed to fetch device data", details: err.message });
  }
});

router.get("/traffic-sources", async (req, res) => {
  try {
    const client = getAnalyticsClient();
    const propertyId = getPropertyId();
    if (!client || !propertyId) {
      return res.status(400).json({ error: "Google Analytics not configured" });
    }

    const startDate = (req.query.startDate as string) || "30daysAgo";
    const endDate = (req.query.endDate as string) || "today";

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "totalRevenue" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    });

    const data = (response.rows || []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value || "",
      sessions: Number(row.metricValues?.[0]?.value || 0),
      users: Number(row.metricValues?.[1]?.value || 0),
      revenue: Number(row.metricValues?.[2]?.value || 0),
    }));

    res.json(data);
  } catch (err: any) {
    console.error("[GA4 API] Traffic sources error:", err.message);
    res.status(500).json({ error: "Failed to fetch traffic sources", details: err.message });
  }
});

router.get("/ecommerce", async (req, res) => {
  try {
    const client = getAnalyticsClient();
    const propertyId = getPropertyId();
    if (!client || !propertyId) {
      return res.status(400).json({ error: "Google Analytics not configured" });
    }

    const startDate = (req.query.startDate as string) || "30daysAgo";
    const endDate = (req.query.endDate as string) || "today";

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "totalRevenue" },
        { name: "ecommercePurchases" },
        { name: "addToCarts" },
        { name: "cartToViewRate" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    });

    const data = (response.rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || "",
      revenue: Number(row.metricValues?.[0]?.value || 0),
      purchases: Number(row.metricValues?.[1]?.value || 0),
      addToCarts: Number(row.metricValues?.[2]?.value || 0),
      cartToViewRate: Number(row.metricValues?.[3]?.value || 0),
    }));

    res.json(data);
  } catch (err: any) {
    console.error("[GA4 API] Ecommerce error:", err.message);
    res.status(500).json({ error: "Failed to fetch ecommerce data", details: err.message });
  }
});

export default router;
