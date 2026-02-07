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
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch site settings" });
  }
});

export default router;
