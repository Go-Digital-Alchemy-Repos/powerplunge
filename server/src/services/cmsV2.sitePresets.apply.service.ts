import { sitePresetsRepo, type SiteSettingsSnapshot } from "../repositories/cmsV2.sitePresets.repo";
import { cmsV2Repository } from "../repositories/cms-v2.repository";
import type { SitePresetDb, PresetApplyHistory } from "@shared/schema";

interface PresetConfig {
  themePackId: string;
  defaultThemePresetId?: string;
  homepageTemplateId?: string;
  defaultKitsSectionIds?: string[];
  defaultInsertMode?: string;
  navPreset?: unknown;
  footerPreset?: unknown;
  globalCtaDefaults?: unknown;
  seoDefaults?: unknown;
  homePageSeedMode?: string;
  applyScope?: string;
}

export interface PreviewResult {
  presetId: string;
  presetName: string;
  themePackId: string;
  navPreset: unknown;
  footerPreset: unknown;
  seoDefaults: unknown;
  globalCtaDefaults: unknown;
  homePageSeedMode: string;
  currentSettings: SiteSettingsSnapshot;
  diff: {
    themeWillChange: boolean;
    navWillChange: boolean;
    footerWillChange: boolean;
    seoWillChange: boolean;
    ctaWillChange: boolean;
    homePageAction: string;
  };
}

export interface ActivateResult {
  success: boolean;
  presetId: string;
  presetName: string;
  snapshotId: string;
  changes: string[];
}

export interface RollbackResult {
  success: boolean;
  snapshotId: string;
  restoredSettings: SiteSettingsSnapshot;
}

function getConfig(preset: SitePresetDb): PresetConfig {
  return (preset.config || {}) as PresetConfig;
}

class SitePresetApplyService {
  async preview(presetId: string): Promise<PreviewResult | { error: string }> {
    const preset = await sitePresetsRepo.findById(presetId);
    if (!preset) return { error: "Site preset not found" };

    const config = getConfig(preset);
    const currentSettings = await sitePresetsRepo.getCurrentSettings();

    const diff = {
      themeWillChange: currentSettings.activeThemeId !== config.themePackId,
      navWillChange: !!config.navPreset && JSON.stringify(currentSettings.navPreset) !== JSON.stringify(config.navPreset),
      footerWillChange: !!config.footerPreset && JSON.stringify(currentSettings.footerPreset) !== JSON.stringify(config.footerPreset),
      seoWillChange: !!config.seoDefaults && JSON.stringify(currentSettings.seoDefaults) !== JSON.stringify(config.seoDefaults),
      ctaWillChange: !!config.globalCtaDefaults && JSON.stringify(currentSettings.globalCtaDefaults) !== JSON.stringify(config.globalCtaDefaults),
      homePageAction: config.homePageSeedMode || "doNothing",
    };

    return {
      presetId: preset.id,
      presetName: preset.name,
      themePackId: config.themePackId,
      navPreset: config.navPreset || null,
      footerPreset: config.footerPreset || null,
      seoDefaults: config.seoDefaults || null,
      globalCtaDefaults: config.globalCtaDefaults || null,
      homePageSeedMode: config.homePageSeedMode || "doNothing",
      currentSettings,
      diff,
    };
  }

  async activate(presetId: string, adminEmail?: string, notes?: string): Promise<ActivateResult | { error: string }> {
    const preset = await sitePresetsRepo.findById(presetId);
    if (!preset) return { error: "Site preset not found" };

    const config = getConfig(preset);
    const changes: string[] = [];

    const currentSettings = await sitePresetsRepo.getCurrentSettings();
    const snapshot = await sitePresetsRepo.saveSnapshot({
      presetId: preset.id,
      presetName: preset.name,
      snapshot: currentSettings,
      appliedBy: adminEmail,
      notes,
    });

    const settingsUpdate: Record<string, unknown> = {
      activePresetId: preset.id,
    };

    if (config.themePackId) {
      settingsUpdate.activeThemeId = config.themePackId;
      changes.push(`Theme set to: ${config.themePackId}`);
    }

    if (config.navPreset) {
      settingsUpdate.navPreset = config.navPreset;
      changes.push("Navigation preset applied");
    }

    if (config.footerPreset) {
      settingsUpdate.footerPreset = config.footerPreset;
      changes.push("Footer preset applied");
    }

    if (config.seoDefaults) {
      settingsUpdate.seoDefaults = config.seoDefaults;
      changes.push("SEO defaults applied");
    }

    if (config.globalCtaDefaults) {
      settingsUpdate.globalCtaDefaults = config.globalCtaDefaults;
      changes.push("Global CTA defaults applied");
    }

    await sitePresetsRepo.applySiteSettings(settingsUpdate);

    const seedMode = config.homePageSeedMode || "doNothing";
    if (seedMode === "createFromTemplate" && config.homepageTemplateId) {
      const newPage = await cmsV2Repository.create({
        title: `${preset.name} Home`,
        slug: `home-${Date.now()}`,
        pageType: "home",
        isHome: true,
        status: "draft",
        template: config.homepageTemplateId,
        contentJson: { version: 1, blocks: [] },
      });
      changes.push(`New home page created (draft): ${newPage.title}`);
    } else if (seedMode === "applyToExistingHome" && config.homepageTemplateId) {
      const existingHome = await cmsV2Repository.findHome();
      if (existingHome) {
        await cmsV2Repository.update(existingHome.id, {
          template: config.homepageTemplateId,
        });
        changes.push(`Existing home page template updated to: ${config.homepageTemplateId}`);
      } else {
        changes.push("No existing home page found; skipped template update");
      }
    } else {
      changes.push("Home page: no changes (doNothing)");
    }

    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.activated",
      preset.id,
      { presetName: preset.name, snapshotId: snapshot.id, changes },
    );

    return {
      success: true,
      presetId: preset.id,
      presetName: preset.name,
      snapshotId: snapshot.id,
      changes,
    };
  }

  async rollback(adminEmail?: string): Promise<RollbackResult | { error: string }> {
    const snapshot = await sitePresetsRepo.getLatestSnapshot();
    if (!snapshot) return { error: "No activation history found to rollback" };

    const previousSettings = snapshot.snapshot as SiteSettingsSnapshot;

    await sitePresetsRepo.applySiteSettings({
      activeThemeId: previousSettings.activeThemeId || "arctic-default",
      activePresetId: previousSettings.activePresetId,
      navPreset: previousSettings.navPreset,
      footerPreset: previousSettings.footerPreset,
      seoDefaults: previousSettings.seoDefaults,
      globalCtaDefaults: previousSettings.globalCtaDefaults,
    });

    await sitePresetsRepo.markSnapshotRolledBack(snapshot.id);

    await sitePresetsRepo.logAudit(
      adminEmail || "system",
      "site_preset.rolled_back",
      snapshot.presetId,
      { snapshotId: snapshot.id, presetName: snapshot.presetName },
    );

    return {
      success: true,
      snapshotId: snapshot.id,
      restoredSettings: previousSettings,
    };
  }

  async getHistory(): Promise<PresetApplyHistory[]> {
    return sitePresetsRepo.getApplyHistory();
  }

  async getHistoryEntry(id: string): Promise<PresetApplyHistory | undefined> {
    return sitePresetsRepo.findSnapshotById(id);
  }
}

export const sitePresetApplyService = new SitePresetApplyService();
