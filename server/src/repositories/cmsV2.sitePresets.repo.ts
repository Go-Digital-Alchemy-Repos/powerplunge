import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
  sitePresets,
  siteSettings,
  presetApplyHistory,
  auditLogs,
  pages,
  type SitePresetDb,
  type PresetApplyHistory,
} from "@shared/schema";

export interface SiteSettingsSnapshot {
  activeThemeId: string | null;
  activePresetId: string | null;
  navPreset: unknown;
  footerPreset: unknown;
  seoDefaults: unknown;
  globalCtaDefaults: unknown;
  homePageId: string | null;
  homePageSlug: string | null;
  homePageTemplate: string | null;
}

class SitePresetsRepository {
  async findAll(): Promise<SitePresetDb[]> {
    return db.select().from(sitePresets).orderBy(desc(sitePresets.createdAt));
  }

  async findById(id: string): Promise<SitePresetDb | undefined> {
    const [preset] = await db.select().from(sitePresets).where(eq(sitePresets.id, id));
    return preset || undefined;
  }

  async create(data: { name: string; description?: string | null; tags?: unknown; previewImage?: string | null; config: unknown }): Promise<SitePresetDb> {
    const [preset] = await db.insert(sitePresets).values({
      name: data.name,
      description: data.description ?? null,
      tags: data.tags ?? null,
      previewImage: data.previewImage ?? null,
      config: data.config,
    }).returning();
    return preset;
  }

  async update(id: string, data: { name: string; description?: string | null; tags?: unknown; previewImage?: string | null; config: unknown }): Promise<SitePresetDb | undefined> {
    const [preset] = await db.update(sitePresets)
      .set({
        name: data.name,
        description: data.description ?? null,
        tags: data.tags ?? null,
        previewImage: data.previewImage ?? null,
        config: data.config,
        updatedAt: new Date(),
      })
      .where(eq(sitePresets.id, id))
      .returning();
    return preset || undefined;
  }

  async remove(id: string): Promise<SitePresetDb | undefined> {
    const [deleted] = await db.delete(sitePresets).where(eq(sitePresets.id, id)).returning();
    return deleted || undefined;
  }

  async getCmsV2Settings() {
    const [settings] = await db.select({
      activeThemeId: siteSettings.activeThemeId,
      activePresetId: siteSettings.activePresetId,
      navPreset: siteSettings.navPreset,
      footerPreset: siteSettings.footerPreset,
      seoDefaults: siteSettings.seoDefaults,
      globalCtaDefaults: siteSettings.globalCtaDefaults,
      updatedAt: siteSettings.updatedAt,
    }).from(siteSettings).where(eq(siteSettings.id, "main"));
    return settings || null;
  }

  async updateCmsV2Settings(values: {
    activeThemeId?: string;
    activePresetId?: string | null;
    navPreset?: unknown;
    footerPreset?: unknown;
    seoDefaults?: unknown;
    globalCtaDefaults?: unknown;
  }) {
    const [updated] = await db.update(siteSettings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(siteSettings.id, "main"))
      .returning({
        activeThemeId: siteSettings.activeThemeId,
        activePresetId: siteSettings.activePresetId,
        navPreset: siteSettings.navPreset,
        footerPreset: siteSettings.footerPreset,
        seoDefaults: siteSettings.seoDefaults,
        globalCtaDefaults: siteSettings.globalCtaDefaults,
        updatedAt: siteSettings.updatedAt,
      });
    return updated || null;
  }

  async getCurrentSettings(): Promise<SiteSettingsSnapshot> {
    const [settings] = await db.select({
      activeThemeId: siteSettings.activeThemeId,
      activePresetId: siteSettings.activePresetId,
      navPreset: siteSettings.navPreset,
      footerPreset: siteSettings.footerPreset,
      seoDefaults: siteSettings.seoDefaults,
      globalCtaDefaults: siteSettings.globalCtaDefaults,
    }).from(siteSettings).where(eq(siteSettings.id, "main"));

    const [homePage] = await db.select({
      id: pages.id,
      slug: pages.slug,
      template: pages.template,
    }).from(pages).where(eq(pages.isHome, true)).limit(1);

    return {
      activeThemeId: settings?.activeThemeId ?? null,
      activePresetId: settings?.activePresetId ?? null,
      navPreset: settings?.navPreset ?? null,
      footerPreset: settings?.footerPreset ?? null,
      seoDefaults: settings?.seoDefaults ?? null,
      globalCtaDefaults: settings?.globalCtaDefaults ?? null,
      homePageId: homePage?.id ?? null,
      homePageSlug: homePage?.slug ?? null,
      homePageTemplate: homePage?.template ?? null,
    };
  }

  async applySiteSettings(values: {
    activeThemeId?: string;
    activePresetId?: string | null;
    navPreset?: unknown;
    footerPreset?: unknown;
    seoDefaults?: unknown;
    globalCtaDefaults?: unknown;
  }): Promise<void> {
    await db.update(siteSettings).set({ ...values, updatedAt: new Date() }).where(eq(siteSettings.id, "main"));
  }

  async saveSnapshot(data: {
    presetId: string;
    presetName: string;
    snapshot: SiteSettingsSnapshot;
    appliedBy?: string;
    notes?: string;
  }): Promise<PresetApplyHistory> {
    const [entry] = await db.insert(presetApplyHistory).values({
      presetId: data.presetId,
      presetName: data.presetName,
      snapshot: data.snapshot,
      appliedBy: data.appliedBy ?? null,
      notes: data.notes ?? null,
    }).returning();
    return entry;
  }

  async getLatestSnapshot(): Promise<PresetApplyHistory | undefined> {
    const [entry] = await db.select()
      .from(presetApplyHistory)
      .where(eq(presetApplyHistory.rolledBack, false))
      .orderBy(desc(presetApplyHistory.appliedAt))
      .limit(1);
    return entry || undefined;
  }

  async findSnapshotById(id: string): Promise<PresetApplyHistory | undefined> {
    const [entry] = await db.select()
      .from(presetApplyHistory)
      .where(eq(presetApplyHistory.id, id));
    return entry || undefined;
  }

  async markSnapshotRolledBack(id: string): Promise<void> {
    await db.update(presetApplyHistory)
      .set({ rolledBack: true, rolledBackAt: new Date() })
      .where(eq(presetApplyHistory.id, id));
  }

  async getApplyHistory(): Promise<PresetApplyHistory[]> {
    return db.select()
      .from(presetApplyHistory)
      .orderBy(desc(presetApplyHistory.appliedAt))
      .limit(50);
  }

  async logAudit(actor: string, action: string, entityId: string, metadata?: unknown): Promise<void> {
    await db.insert(auditLogs).values({
      actor,
      action,
      entityType: "site_preset",
      entityId,
      metadata: metadata ?? null,
    });
  }
}

export const sitePresetsRepo = new SitePresetsRepository();
