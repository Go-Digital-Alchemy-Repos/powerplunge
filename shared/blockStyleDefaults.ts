import { z } from "zod";

export interface BlockStyleDefault {
  [key: string]: string | number | boolean;
}

export interface BlockStyleDefaultsMap {
  [blockType: string]: BlockStyleDefault;
}

export const BLOCK_STYLE_DEFAULTS: BlockStyleDefaultsMap = {
  hero: {
    defaultAlign: "center",
    defaultOverlay: "60",
    defaultHeight: "default",
    defaultLayout: "stacked",
    fullWidth: true,
  },

  featureList: {
    cardStyle: "elevated",
    iconPosition: "top",
    columns: 3,
  },

  callToAction: {
    centeredLayout: true,
    showSecondaryButton: true,
    backgroundStyle: "gradient",
  },

  richText: {
    defaultAlign: "left",
    maxWidth: "prose",
  },

  image: {
    defaultAspectRatio: "16:9",
    rounded: true,
  },

  imageGrid: {
    columns: 3,
    spacing: "normal",
  },

  testimonials: {
    layout: "cards",
    showAvatar: true,
    cardStyle: "elevated",
  },

  faq: {
    allowMultipleOpen: false,
    iconStyle: "chevron",
  },

  productGrid: {
    columns: 3,
    showPrice: true,
    cardStyle: "standard",
  },

  productHighlight: {
    showGallery: true,
    showBuyButton: true,
    layout: "split",
  },

  trustBar: {
    layout: "row",
    iconSize: "md",
  },

  comparisonTable: {
    striped: true,
    highlightWinner: true,
  },

  benefitStack: {
    layout: "stack",
    showIcons: true,
  },

  scienceExplainer: {
    showCitations: true,
    showDisclaimer: true,
  },

  protocolBuilder: {
    showDisclaimer: true,
    highlightLevel: "intermediate",
  },

  recoveryUseCases: {
    layout: "grid",
    showBullets: true,
  },

  safetyChecklist: {
    showDisclaimer: true,
    groupByRequired: true,
  },

  guaranteeAndWarranty: {
    layout: "cards",
    showIcons: true,
  },

  deliveryAndSetup: {
    showTimeline: true,
    showIcons: true,
  },

  financingAndPayment: {
    showCalculator: true,
    highlightPrimary: true,
  },

  objectionBusters: {
    layout: "accordion",
    showIcons: true,
  },

  beforeAfterExpectations: {
    layout: "columns",
    showTimeline: true,
  },

  pressMentions: {
    layout: "row",
    showLogos: true,
    grayscaleLogos: true,
  },

  socialProofStats: {
    layout: "row",
    animateNumbers: true,
  },

  divider: {
    style: "subtle",
  },
};

export const blockStyleDefaultValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

export const blockStyleDefaultsMapSchema = z.record(
  z.string(),
  z.record(z.string(), blockStyleDefaultValueSchema),
);

export type BlockStyleDefaultsMapType = z.infer<typeof blockStyleDefaultsMapSchema>;

export function getBlockDefaults(blockType: string): BlockStyleDefault {
  return BLOCK_STYLE_DEFAULTS[blockType] ?? {};
}

export function resolveBlockDefaults(
  blockType: string,
  themePackOverrides?: BlockStyleDefault,
): BlockStyleDefault {
  const base = getBlockDefaults(blockType);
  if (!themePackOverrides) return { ...base };
  return { ...base, ...themePackOverrides };
}

export function resolveAllBlockDefaults(
  themePackOverrides?: BlockStyleDefaultsMap,
): BlockStyleDefaultsMap {
  const result: BlockStyleDefaultsMap = {};

  for (const blockType of Object.keys(BLOCK_STYLE_DEFAULTS)) {
    result[blockType] = resolveBlockDefaults(
      blockType,
      themePackOverrides?.[blockType],
    );
  }

  if (themePackOverrides) {
    for (const blockType of Object.keys(themePackOverrides)) {
      if (!result[blockType]) {
        result[blockType] = { ...themePackOverrides[blockType] };
      }
    }
  }

  return result;
}

export function getSupportedBlockTypes(): string[] {
  return Object.keys(BLOCK_STYLE_DEFAULTS);
}
