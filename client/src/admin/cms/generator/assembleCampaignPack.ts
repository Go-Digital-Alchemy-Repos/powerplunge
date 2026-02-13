import { getTemplate } from "../../../cms/templates/templateLibrary";
import { assembleLandingPage, type AssemblyResult, type AssemblySection } from "./assembleLandingPage";
import { CAMPAIGN_PACKS, type CampaignPack, type CampaignPageDef } from "./campaignPacks";

export interface SectionKitSource {
  name: string;
  blocks: Array<{ type: string; data: Record<string, any> }>;
}

export interface CampaignPageResult {
  pageDef: CampaignPageDef;
  assembly: AssemblyResult;
  pagePayload: {
    title: string;
    slug: string;
    pageType: "landing";
    contentJson: AssemblyResult["contentJson"];
    template: string;
    status: "draft";
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
}

export interface CampaignPackResult {
  pack: CampaignPack;
  pages: CampaignPageResult[];
}

function resolveKitsByName(
  kitNames: string[],
  availableKits: SectionKitSource[],
): AssemblySection[] {
  const resolved: AssemblySection[] = [];

  for (const name of kitNames) {
    const kit = availableKits.find((k) => k.name === name);
    if (!kit) continue;

    resolved.push({
      id: `kit-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: kit.name,
      blocks: kit.blocks.map((b) => ({
        type: b.type,
        data: b.data,
      })),
    });
  }

  return resolved;
}

function mergeKitNames(
  packDefaults: string[],
  pageRecommended: string[],
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const name of pageRecommended) {
    if (!seen.has(name)) {
      seen.add(name);
      merged.push(name);
    }
  }

  for (const name of packDefaults) {
    if (!seen.has(name)) {
      seen.add(name);
      merged.push(name);
    }
  }

  return merged;
}

export function generateCampaignPack(
  packId: string,
  availableKits: SectionKitSource[],
  options?: {
    primaryProductId?: string;
    secondaryProductIds?: string[];
    sectionMode?: "sectionRef" | "detach";
    ctaDestination?: "shop" | "product" | "quote";
    idGenerator?: () => string;
  },
): CampaignPackResult {
  const pack = CAMPAIGN_PACKS.find((p) => p.id === packId);
  if (!pack) {
    throw new Error(`Campaign pack not found: "${packId}"`);
  }

  const template = getTemplate(pack.templateId);
  if (!template) {
    throw new Error(
      `Template not found: "${pack.templateId}" (referenced by pack "${pack.name}")`,
    );
  }

  const primaryProductId = options?.primaryProductId ?? "";
  const secondaryProductIds = options?.secondaryProductIds ?? [];
  const sectionMode = options?.sectionMode ?? "detach";
  const ctaDestination = options?.ctaDestination ?? "shop";
  const idGenerator = options?.idGenerator;

  const pages: CampaignPageResult[] = [];

  for (const pageDef of pack.pages) {
    const kitNames = mergeKitNames(pack.defaultKits, pageDef.recommendedKits);
    const sections = resolveKitsByName(kitNames, availableKits);

    const assembly = assembleLandingPage({
      template,
      primaryProductId,
      secondaryProductIds,
      sections,
      sectionMode,
      ctaDestination,
      themeOverride: pack.recommendedThemePreset,
      title: pageDef.title,
      slug: pageDef.slug,
      metaTitle: pageDef.defaultSeoTitle,
      metaDescription: pageDef.defaultSeoDescription,
      ...(idGenerator ? { idGenerator } : {}),
    });

    const pagePayload: CampaignPageResult["pagePayload"] = {
      title: pageDef.title,
      slug: pageDef.slug,
      pageType: "landing",
      contentJson: assembly.contentJson,
      template: pack.templateId,
      status: "draft",
      metaTitle: assembly.seo.metaTitle,
      metaDescription: assembly.seo.metaDescription,
      ogTitle: assembly.seo.ogTitle,
      ogDescription: assembly.seo.ogDescription,
    };

    pages.push({ pageDef, assembly, pagePayload });
  }

  return { pack, pages };
}
