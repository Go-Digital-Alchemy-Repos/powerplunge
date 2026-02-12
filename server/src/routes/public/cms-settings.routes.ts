import { Router, Request, Response } from "express";
import { storage } from "../../../storage";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const settings = await storage.getSiteSettings();
    const themeSettings = await storage.getThemeSettings();
    res.json({
      featuredProductId: settings?.featuredProductId || null,
      blogPageId: settings?.blogPageId || null,
      heroTitle: themeSettings?.heroTitle || null,
      heroSubtitle: themeSettings?.heroSubtitle || null,
      heroImage: themeSettings?.heroImage || null,
      ctaText: null,
      ctaLink: null,
      gaMeasurementId: settings?.gaMeasurementId || null,
      logoUrl: settings?.logoUrl || null,
      companyName: settings?.companyName || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch site settings" });
  }
});

router.get("/legal/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (type !== "privacy-policy" && type !== "terms-and-conditions") {
      return res.status(404).json({ message: "Page not found" });
    }
    const settings = await storage.getSiteSettings();
    const field = type === "privacy-policy" ? "privacyPolicy" : "termsAndConditions";
    res.json({
      content: settings?.[field] || null,
      companyName: settings?.companyName || "Power Plunge",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch legal content" });
  }
});

export default router;
