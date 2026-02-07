import { sitePresetsRepo } from "../repositories/cmsV2.sitePresets.repo";
import { insertSitePresetSchema } from "../schemas/cmsV2.sitePresets.schema";
import type { SitePresetDb } from "@shared/schema";
import { SITE_PRESET_SEEDS } from "../data/sitePresetSeeds";

export interface ExportedPreset {
  version: 1;
  exportedAt: string;
  preset: {
    name: string;
    description: string | null;
    tags: unknown;
    previewImage: string | null;
    config: unknown;
  };
}

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

  async seed(): Promise<{ created: number; skipped: number; skippedNames: string[] }> {
    const existing = await sitePresetsRepo.findAll();
    const existingNames = new Set(existing.map((p) => p.name));
    let created = 0;
    const skipped: string[] = [];

    for (const seed of SITE_PRESET_SEEDS) {
      if (existingNames.has(seed.name)) {
        skipped.push(seed.name);
        continue;
      }
      const { name, description, tags, previewImage, ...configFields } = seed;
      await sitePresetsRepo.create({
        name,
        description,
        tags,
        previewImage,
        config: configFields,
      });
      created++;
    }

    return { created, skipped: skipped.length, skippedNames: skipped };
  }

  async exportPreset(id: string): Promise<ExportedPreset | { error: string }> {
    const preset = await sitePresetsRepo.findById(id);
    if (!preset) return { error: "Site preset not found" };

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      preset: {
        name: preset.name,
        description: preset.description,
        tags: preset.tags,
        previewImage: preset.previewImage,
        config: preset.config,
      },
    };
  }

  async importPreset(data: unknown, adminEmail?: string): Promise<{ preset?: SitePresetDb; error?: string }> {
    const payload = data as any;
    if (!payload || payload.version !== 1 || !payload.preset) {
      return { error: "Invalid import format. Expected version 1 export." };
    }

    const { name, description, tags, previewImage, config } = payload.preset;
    if (!name || !config) {
      return { error: "Import missing required fields: name, config" };
    }

    const existing = await sitePresetsRepo.findAll();
    const existingNames = new Set(existing.map((p) => p.name));
    const finalName = existingNames.has(name) ? `${name} (Imported)` : name;

    const preset = await sitePresetsRepo.create({
      name: finalName,
      description: description ?? null,
      tags: tags ?? null,
      previewImage: previewImage ?? null,
      config,
    });

    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.imported",
      preset.id,
      { presetName: preset.name, originalName: name },
    );

    return { preset };
  }
}

export const sitePresetsService = new SitePresetsService();
