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

router.get("/consent", async (_req: Request, res: Response) => {
  try {
    const settings = await storage.getSiteSettings();
    const consent = (settings?.consentSettings as any) || null;
    if (!consent || !consent.enabled) {
      return res.json({ enabled: false });
    }
    res.json({
      enabled: true,
      mode: consent.mode || "opt_in",
      position: consent.position || "bottom",
      style: consent.style || "banner",
      overlay: consent.overlay || false,
      theme: consent.theme || "site",
      showOnFirstVisit: consent.showOnFirstVisit !== false,
      rePromptDays: consent.rePromptDays || 0,
      title: consent.title || "Your Privacy Choices",
      messageHtml: consent.messageHtml || "",
      acceptAllText: consent.acceptAllText || "Accept All",
      rejectAllText: consent.rejectAllText || "Reject Non-Essential",
      manageText: consent.manageText || "Manage Preferences",
      savePreferencesText: consent.savePreferencesText || "Save Preferences",
      policyLinks: consent.policyLinks || { privacyPolicyPath: "/privacy-policy" },
      categories: consent.categories || {
        necessary: { enabled: true, locked: true, label: "Necessary", description: "Required for the website to function." },
        analytics: { enabled: true, defaultOn: false, label: "Analytics", description: "Helps us understand site usage." },
        marketing: { enabled: false, defaultOn: false, label: "Marketing", description: "Used to personalize offers." },
        functional: { enabled: false, defaultOn: false, label: "Functional", description: "Remembers preferences." },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch consent settings" });
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
