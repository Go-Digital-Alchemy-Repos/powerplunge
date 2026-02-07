import { sitePresetsRepo } from "../repositories/cmsV2.sitePresets.repo";
import { insertSitePresetSchema } from "../schemas/cmsV2.sitePresets.schema";
import type { SitePresetDb } from "@shared/schema";

class SitePresetsService {
  async list(): Promise<SitePresetDb[]> {
    return sitePresetsRepo.findAll();
  }

  async getById(id: string): Promise<SitePresetDb | undefined> {
    return sitePresetsRepo.findById(id);
  }

  async create(body: unknown, adminEmail?: string): Promise<{ preset?: SitePresetDb; error?: string; details?: unknown }> {
    const parsed = insertSitePresetSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid site preset data", details: parsed.error.flatten() };
    }
    const { name, description, tags, previewImage, ...configFields } = parsed.data;
    const preset = await sitePresetsRepo.create({
      name,
      description,
      tags,
      previewImage,
      config: configFields,
    });
    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.created",
      preset.id,
      { presetName: preset.name },
    );
    return { preset };
  }

  async update(id: string, body: unknown, adminEmail?: string): Promise<{ preset?: SitePresetDb; error?: string; details?: unknown }> {
    const parsed = insertSitePresetSchema.safeParse(body);
    if (!parsed.success) {
      return { error: "Invalid site preset data", details: parsed.error.flatten() };
    }
    const { name, description, tags, previewImage, ...configFields } = parsed.data;
    const preset = await sitePresetsRepo.update(id, {
      name,
      description,
      tags,
      previewImage,
      config: configFields,
    });
    if (!preset) return { error: "Site preset not found" };
    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.updated",
      preset.id,
      { presetName: preset.name },
    );
    return { preset };
  }

  async remove(id: string, adminEmail?: string): Promise<{ success: boolean; error?: string }> {
    const existing = await sitePresetsRepo.findById(id);
    if (!existing) return { success: false, error: "Site preset not found" };
    await sitePresetsRepo.remove(id);
    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.deleted",
      id,
      { presetName: existing.name },
    );
    return { success: true };
  }

  async duplicate(id: string, adminEmail?: string): Promise<{ preset?: SitePresetDb; error?: string }> {
    const source = await sitePresetsRepo.findById(id);
    if (!source) return { error: "Site preset not found" };
    const preset = await sitePresetsRepo.create({
      name: `${source.name} (Copy)`,
      description: source.description,
      tags: source.tags,
      previewImage: source.previewImage,
      config: source.config,
    });
    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.duplicated",
      preset.id,
      { sourcePresetId: id, presetName: preset.name },
    );
    return { preset };
  }
}

export const sitePresetsService = new SitePresetsService();
