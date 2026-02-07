import type { CmsTemplate, CmsTemplateBlock } from "../../../cms/templates/templateLibrary";

export interface AssemblySection {
  id: string;
  name: string;
  blocks: Array<{ type: string; data: Record<string, any>; settings?: Record<string, any> }>;
}

export interface PresetOverrides {
  themePackId?: string;
  seoDefaults?: {
    siteName?: string;
    titleSuffix?: string;
    defaultMetaDescription?: string;
    ogDefaultImage?: string;
  };
  globalCtaDefaults?: {
    primaryCtaText?: string;
    primaryCtaHref?: string;
    secondaryCtaText?: string;
    secondaryCtaHref?: string;
  };
}

export interface AssemblyInput {
  template: CmsTemplate;
  primaryProductId: string;
  secondaryProductIds: string[];
  sections: AssemblySection[];
  sectionMode: "sectionRef" | "detach";
  ctaDestination: "shop" | "product" | "quote";
  themeOverride: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  idGenerator?: () => string;
  presetOverrides?: PresetOverrides;
}

export interface AssembledBlock {
  id: string;
  type: string;
  version: number;
  data: Record<string, any>;
  settings: Record<string, any>;
}

export interface AssemblyResult {
  contentJson: {
    version: number;
    blocks: AssembledBlock[];
    themeOverride?: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
}

const BLOCK_VERSION = 1;

function defaultIdGenerator(): string {
  return crypto.randomUUID();
}

function makeBlock(
  type: string,
  data: Record<string, any>,
  idGen: () => string,
  settings: Record<string, any> = {},
): AssembledBlock {
  return {
    id: idGen(),
    type,
    version: BLOCK_VERSION,
    data: structuredClone(data),
    settings: { ...settings },
  };
}

function cloneTemplateBlocks(
  templateBlocks: CmsTemplateBlock[],
  idGen: () => string,
): AssembledBlock[] {
  return templateBlocks.map((block) =>
    makeBlock(block.type, block.data, idGen),
  );
}

function injectPrimaryProduct(
  blocks: AssembledBlock[],
  primaryProductId: string,
  idGen: () => string,
): AssembledBlock[] {
  if (!primaryProductId) return blocks;

  const hasHighlight = blocks.some((b) => b.type === "productHighlight");

  if (hasHighlight) {
    return blocks.map((b) => {
      if (b.type === "productHighlight") {
        return { ...b, data: { ...b.data, productId: primaryProductId } };
      }
      return b;
    });
  }

  const heroIndex = blocks.findIndex((b) => b.type === "hero");
  const insertAt = heroIndex >= 0 ? heroIndex + 1 : 0;

  const highlightBlock = makeBlock(
    "productHighlight",
    {
      productId: primaryProductId,
      highlightBullets: [],
      showGallery: true,
      showBuyButton: true,
    },
    idGen,
  );

  const result = [...blocks];
  result.splice(insertAt, 0, highlightBlock);
  return result;
}

function injectSecondaryProducts(
  blocks: AssembledBlock[],
  secondaryProductIds: string[],
  idGen: () => string,
): AssembledBlock[] {
  if (secondaryProductIds.length === 0) return blocks;

  const hasGrid = blocks.some((b) => b.type === "productGrid");

  if (hasGrid) {
    return blocks.map((b) => {
      if (b.type === "productGrid") {
        return {
          ...b,
          data: {
            ...b.data,
            productIds: [...secondaryProductIds],
          },
        };
      }
      return b;
    });
  }

  const gridBlock = makeBlock(
    "productGrid",
    {
      title: "More Products",
      productIds: [...secondaryProductIds],
      columns: Math.min(secondaryProductIds.length, 3),
      showPrices: true,
      showBuyButtons: true,
    },
    idGen,
  );

  const midpoint = Math.floor(blocks.length / 2);
  const insertAt = Math.max(midpoint, 1);

  const result = [...blocks];
  result.splice(insertAt, 0, gridBlock);
  return result;
}

function applyCtaOverrides(
  blocks: AssembledBlock[],
  ctaDestination: "shop" | "product" | "quote",
  primaryProductId: string,
  presetCta?: PresetOverrides["globalCtaDefaults"],
): AssembledBlock[] {
  const ctaHrefMap: Record<string, string> = {
    shop: "/shop",
    product: primaryProductId ? `/products/${primaryProductId}` : "/shop",
    quote: "/contact",
  };
  const ctaHref = presetCta?.primaryCtaHref || ctaHrefMap[ctaDestination];
  const ctaText = presetCta?.primaryCtaText;

  return blocks.map((b) => {
    if (b.type === "hero") {
      const heroData: Record<string, any> = { ...b.data, ctaHref };
      if (ctaText) {
        heroData.ctaText = ctaText;
      } else if (ctaDestination === "quote") {
        heroData.ctaText = "Get a Quote";
      }
      if (presetCta?.secondaryCtaText) heroData.secondaryCtaText = presetCta.secondaryCtaText;
      if (presetCta?.secondaryCtaHref) heroData.secondaryCtaHref = presetCta.secondaryCtaHref;
      return { ...b, data: heroData };
    }
    if (b.type === "callToAction") {
      const ctaData: Record<string, any> = { ...b.data, primaryCtaHref: ctaHref };
      if (ctaText) ctaData.primaryCtaText = ctaText;
      if (presetCta?.secondaryCtaText) ctaData.secondaryCtaText = presetCta.secondaryCtaText;
      if (presetCta?.secondaryCtaHref) ctaData.secondaryCtaHref = presetCta.secondaryCtaHref;
      return { ...b, data: ctaData };
    }
    return b;
  });
}

function appendSections(
  blocks: AssembledBlock[],
  sections: AssemblySection[],
  mode: "sectionRef" | "detach",
  idGen: () => string,
): AssembledBlock[] {
  if (sections.length === 0) return blocks;

  const result = [...blocks];

  for (const section of sections) {
    const sectionBlocks = Array.isArray(section.blocks) ? section.blocks : [];

    if (mode === "detach") {
      for (const block of sectionBlocks) {
        result.push(
          makeBlock(block.type, block.data || {}, idGen, block.settings || {}),
        );
      }
    } else {
      result.push(
        makeBlock(
          "sectionRef",
          { sectionId: section.id, sectionName: section.name },
          idGen,
        ),
      );
    }
  }

  return result;
}

function deriveSeo(input: AssemblyInput): AssemblyResult["seo"] {
  const presetSeo = input.presetOverrides?.seoDefaults;
  const titleSuffix = presetSeo?.titleSuffix;

  const rawTitle = input.metaTitle.trim() || input.title.trim();
  const metaTitle = titleSuffix && !rawTitle.includes(titleSuffix)
    ? `${rawTitle} ${titleSuffix}`
    : rawTitle;

  const metaDescription =
    input.metaDescription.trim() ||
    presetSeo?.defaultMetaDescription ||
    `${input.title.trim()} — Power Plunge cold therapy.`;

  return {
    metaTitle,
    metaDescription,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
  };
}

export function assembleLandingPage(input: AssemblyInput): AssemblyResult {
  const idGen = input.idGenerator ?? defaultIdGenerator;
  const preset = input.presetOverrides;

  let blocks = cloneTemplateBlocks(input.template.blocks, idGen);

  blocks = injectPrimaryProduct(blocks, input.primaryProductId, idGen);

  blocks = injectSecondaryProducts(blocks, input.secondaryProductIds, idGen);

  blocks = applyCtaOverrides(blocks, input.ctaDestination, input.primaryProductId, preset?.globalCtaDefaults);

  blocks = appendSections(blocks, input.sections, input.sectionMode, idGen);

  for (const block of blocks) {
    if (!block.id) block.id = idGen();
    if (block.version === undefined) block.version = BLOCK_VERSION;
  }

  const contentJson: AssemblyResult["contentJson"] = {
    version: 1,
    blocks,
  };

  const resolvedTheme = input.themeOverride || preset?.themePackId;
  if (resolvedTheme) {
    contentJson.themeOverride = resolvedTheme;
  }

  return {
    contentJson,
    seo: deriveSeo(input),
  };
}
