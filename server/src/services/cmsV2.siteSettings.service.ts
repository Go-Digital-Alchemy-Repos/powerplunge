import { sitePresetsRepo } from "../repositories/cmsV2.sitePresets.repo";
import { z } from "zod";
import {
  navPresetSchema,
  footerPresetSchema,
  seoDefaultsSchema,
  globalCtaDefaultsSchema,
} from "../schemas/cmsV2.sitePresets.schema";

const updateSiteSettingsSchema = z.object({
  activeThemeId: z.string().min(1).optional(),
  activePresetId: z.string().nullable().optional(),
  navPreset: navPresetSchema.nullable().optional(),
  footerPreset: footerPresetSchema.nullable().optional(),
  seoDefaults: seoDefaultsSchema.nullable().optional(),
  globalCtaDefaults: globalCtaDefaultsSchema.nullable().optional(),
});

class CmsV2SiteSettingsService {
  async get() {
    const settings = await sitePresetsRepo.getCmsV2Settings();
    if (!settings) {
      return {
        activeThemeId: "arctic-default",
        activePresetId: null,
        navPreset: null,
        footerPreset: null,
        seoDefaults: null,
        globalCtaDefaults: null,
        updatedAt: new Date(),
      };
    }
    return settings;
  }

  async update(body: unknown, adminEmail?: string) {
    const parsed = updateSiteSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid site settings data", details: parsed.error.flatten() };
    }

    const updated = await sitePresetsRepo.updateCmsV2Settings(parsed.data);
    if (!updated) {
      return { error: "Site settings row not found. Ensure site_settings is initialized." };
    }

    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_settings.updated",
      "main",
      { fields: Object.keys(parsed.data) },
    );

    return { settings: updated };
  }
}

export const cmsV2SiteSettingsService = new CmsV2SiteSettingsService();
