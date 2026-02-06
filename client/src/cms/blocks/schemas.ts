import { z } from "zod";

export const heroSchema = z.object({
  headline: z.string().min(1, "Headline is required"),
  subheadline: z.string().default(""),
  ctaText: z.string().default(""),
  ctaHref: z.string().default("#"),
  secondaryCtaText: z.string().default(""),
  secondaryCtaHref: z.string().default(""),
  backgroundImage: z.string().default(""),
  heroImage: z.string().default(""),
  align: z.enum(["left", "center"]).default("center"),
  layout: z.enum(["stacked", "split-left", "split-right"]).default("stacked"),
  fullWidth: z.boolean().default(true),
  overlayOpacity: z.number().min(0).max(100).default(60),
  minHeight: z.enum(["default", "tall", "full"]).default("default"),
  themeVariant: z.string().optional(),
});
export type HeroProps = z.infer<typeof heroSchema>;

export const richTextSchema = z.object({
  title: z.string().default(""),
  bodyRichText: z.string().default(""),
  align: z.enum(["left", "center", "right"]).default("left"),
});
export type RichTextProps = z.infer<typeof richTextSchema>;

export const imageSchema = z.object({
  src: z.string().min(1, "Image source is required"),
  alt: z.string().default(""),
  caption: z.string().default(""),
  aspectRatio: z.string().optional(),
  rounded: z.boolean().default(true),
  linkHref: z.string().default(""),
});
export type ImageProps = z.infer<typeof imageSchema>;

export const imageGridItemSchema = z.object({
  src: z.string().min(1),
  alt: z.string().default(""),
  caption: z.string().default(""),
  linkHref: z.string().default(""),
});

export const imageGridSchema = z.object({
  items: z.array(imageGridItemSchema).default([]),
  columns: z.number().min(2).max(4).default(3),
  spacing: z.enum(["tight", "normal", "loose"]).default("normal"),
});
export type ImageGridProps = z.infer<typeof imageGridSchema>;

export const featureItemSchema = z.object({
  icon: z.string().default(""),
  title: z.string().min(1),
  description: z.string().default(""),
});

export const featureListSchema = z.object({
  title: z.string().default(""),
  items: z.array(featureItemSchema).default([]),
  columns: z.number().min(1).max(3).default(3),
});
export type FeatureListProps = z.infer<typeof featureListSchema>;

export const testimonialItemSchema = z.object({
  quote: z.string().min(1),
  name: z.string().min(1),
  title: z.string().default(""),
  avatar: z.string().default(""),
});

export const testimonialsSchema = z.object({
  title: z.string().default(""),
  items: z.array(testimonialItemSchema).default([]),
  layout: z.enum(["cards", "slider"]).default("cards"),
});
export type TestimonialsProps = z.infer<typeof testimonialsSchema>;

export const faqItemSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
});

export const faqSchema = z.object({
  title: z.string().default(""),
  items: z.array(faqItemSchema).default([]),
  allowMultipleOpen: z.boolean().default(false),
});
export type FAQProps = z.infer<typeof faqSchema>;

export const callToActionSchema = z.object({
  headline: z.string().min(1, "Headline is required"),
  subheadline: z.string().default(""),
  primaryCtaText: z.string().default("Get Started"),
  primaryCtaHref: z.string().default("#"),
  secondaryCtaText: z.string().default(""),
  secondaryCtaHref: z.string().default(""),
});
export type CallToActionProps = z.infer<typeof callToActionSchema>;

export const productGridSchema = z.object({
  title: z.string().default(""),
  productIds: z.array(z.string()).default([]),
  collectionTag: z.string().default(""),
  queryMode: z.enum(["ids", "tag", "all"]).default("all"),
  columns: z.number().min(2).max(4).default(3),
  showPrice: z.boolean().default(true),
});
export type ProductGridProps = z.infer<typeof productGridSchema>;

export const productHighlightSchema = z.object({
  productId: z.string().default(""),
  highlightBullets: z.array(z.string()).default([]),
  showGallery: z.boolean().default(true),
  showBuyButton: z.boolean().default(true),
});
export type ProductHighlightProps = z.infer<typeof productHighlightSchema>;

export const trustBarItemSchema = z.object({
  icon: z.string().default(""),
  label: z.string().min(1),
  sublabel: z.string().default(""),
});

export const trustBarSchema = z.object({
  items: z.array(trustBarItemSchema).default([]),
  layout: z.enum(["row", "wrap"]).default("row"),
});
export type TrustBarProps = z.infer<typeof trustBarSchema>;

export const comparisonColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
});

export const comparisonRowSchema = z.object({
  label: z.string().min(1),
  valuesByKey: z.record(z.string(), z.union([z.string(), z.boolean()])),
});

export const comparisonTableSchema = z.object({
  title: z.string().default(""),
  columns: z.array(comparisonColumnSchema).default([]),
  rows: z.array(comparisonRowSchema).default([]),
  highlightColumnKey: z.string().default(""),
});
export type ComparisonTableProps = z.infer<typeof comparisonTableSchema>;

const blockSchemaMap: Record<string, z.ZodTypeAny> = {
  hero: heroSchema,
  richText: richTextSchema,
  image: imageSchema,
  imageGrid: imageGridSchema,
  featureList: featureListSchema,
  testimonials: testimonialsSchema,
  faq: faqSchema,
  callToAction: callToActionSchema,
  productGrid: productGridSchema,
  productHighlight: productHighlightSchema,
  trustBar: trustBarSchema,
  comparisonTable: comparisonTableSchema,
};

export function validateBlockData(
  type: string,
  data: unknown
): { success: true; data: unknown } | { success: false; errors: string[] } {
  const schema = blockSchemaMap[type];
  if (!schema) {
    console.warn(`[CMS Validation] No schema for block type "${type}" — passing through.`);
    return { success: true, data };
  }
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

export function validatePageBlocks(
  blocks: { type: string; data: unknown }[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  for (const block of blocks) {
    const result = validateBlockData(block.type, block.data);
    if (!result.success) {
      warnings.push(`Block "${block.type}": ${result.errors.join("; ")}`);
    }
  }
  return { valid: warnings.length === 0, warnings };
}
