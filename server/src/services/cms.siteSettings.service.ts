import { z } from "zod";
import { storage } from "../../storage";

const seoDefaultsSchema = z.object({
  siteName: z.string().optional(),
  titleSuffix: z.string().optional(),
  defaultMetaDescription: z.string().optional(),
  ogDefaultImage: z.string().optional(),
}).optional().nullable();

const globalCtaDefaultsSchema = z.object({
  primaryCtaText: z.string().optional(),
  primaryCtaHref: z.string().optional(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaHref: z.string().optional(),
}).optional().nullable();

const updateSiteSettingsSchema = z.object({
  activeThemeId: z.string().min(1).optional(),
  seoDefaults: seoDefaultsSchema,
  globalCtaDefaults: globalCtaDefaultsSchema,
});

class CmsSiteSettingsService {
  async get() {
    return storage.getSiteSettings();
  }

  async update(body: unknown, _adminEmail?: string) {
    const parsed = updateSiteSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid site settings data", details: parsed.error.flatten() };
    }

    const updated = await storage.updateSiteSettings(parsed.data);
    return { settings: updated };
  }
}

export const cmsSiteSettingsService = new CmsSiteSettingsService();
