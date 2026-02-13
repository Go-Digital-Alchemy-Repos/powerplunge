import { z } from "zod";

export const heroSchema = z.object({
  headline: z.string().min(1, "Headline is required"),
  subheadline: z.string().default(""),
  ctaText: z.string().default(""),
  ctaHref: z.string().default("#"),
  secondaryCtaText: z.string().default(""),
  secondaryCtaHref: z.string().default(""),
  backgroundImage: z.string().default(""),
  backgroundType: z.enum(["image", "video"]).default("image"),
  videoUrl: z.string().default(""),
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

export const benefitItemSchema = z.object({
  headline: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().optional(),
  emphasis: z.boolean().optional(),
});

export const benefitStackSchema = z.object({
  title: z.string().default(""),
  items: z.array(benefitItemSchema).default([]),
  layout: z.enum(["stack", "timeline"]).default("stack"),
});
export type BenefitStackProps = z.infer<typeof benefitStackSchema>;

export const scienceSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().default(""),
  citationLabel: z.string().optional(),
  citationUrl: z.string().optional(),
});

export const scienceExplainerSchema = z.object({
  title: z.string().default(""),
  sections: z.array(scienceSectionSchema).default([]),
  disclaimerText: z.string().default("This content is informational and not medical advice."),
});
export type ScienceExplainerProps = z.infer<typeof scienceExplainerSchema>;

export const protocolSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]),
  tempRange: z.string().default(""),
  duration: z.string().default(""),
  frequency: z.string().default(""),
  notes: z.string().default(""),
});

export const protocolBuilderSchema = z.object({
  title: z.string().default(""),
  protocols: z.array(protocolSchema).default([]),
  disclaimerText: z.string().default("Consult a healthcare professional before starting any cold exposure protocol."),
});
export type ProtocolBuilderProps = z.infer<typeof protocolBuilderSchema>;

export const useCaseSchema = z.object({
  audience: z.enum(["athletes", "busy professionals", "active aging", "first responders"]),
  headline: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const recoveryUseCasesSchema = z.object({
  title: z.string().default(""),
  cases: z.array(useCaseSchema).default([]),
});
export type RecoveryUseCasesProps = z.infer<typeof recoveryUseCasesSchema>;

export const safetyItemSchema = z.object({
  text: z.string().min(1),
  required: z.boolean().optional(),
});

export const safetyChecklistSchema = z.object({
  title: z.string().default(""),
  items: z.array(safetyItemSchema).default([]),
  disclaimerText: z.string().default("Always consult your physician before beginning cold water immersion."),
});
export type SafetyChecklistProps = z.infer<typeof safetyChecklistSchema>;

export const guaranteeAndWarrantySchema = z.object({
  title: z.string().default(""),
  guaranteeBullets: z.array(z.string()).default([]),
  warrantySummary: z.string().default(""),
  supportCtaText: z.string().default("Contact Support"),
  supportCtaHref: z.string().default("/contact"),
});
export type GuaranteeAndWarrantyProps = z.infer<typeof guaranteeAndWarrantySchema>;

export const setupStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
});

export const deliveryAndSetupSchema = z.object({
  title: z.string().default(""),
  steps: z.array(setupStepSchema).default([]),
  includesBullets: z.array(z.string()).default([]),
  shippingEstimateText: z.string().default(""),
});
export type DeliveryAndSetupProps = z.infer<typeof deliveryAndSetupSchema>;

export const financingAndPaymentSchema = z.object({
  title: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  financingProviderName: z.string().optional(),
  financingDisclaimer: z.string().optional(),
});
export type FinancingAndPaymentProps = z.infer<typeof financingAndPaymentSchema>;

export const objectionItemSchema = z.object({
  objection: z.string().min(1),
  response: z.string().default(""),
});

export const objectionBustersSchema = z.object({
  title: z.string().default(""),
  items: z.array(objectionItemSchema).default([]),
});
export type ObjectionBustersProps = z.infer<typeof objectionBustersSchema>;

export const expectationSchema = z.object({
  label: z.string().min(1),
  description: z.string().default(""),
});

export const beforeAfterExpectationsSchema = z.object({
  title: z.string().default(""),
  expectations: z.array(expectationSchema).default([]),
});
export type BeforeAfterExpectationsProps = z.infer<typeof beforeAfterExpectationsSchema>;

export const pressLogoSchema = z.object({
  src: z.string().min(1),
  alt: z.string().default(""),
  href: z.string().optional(),
});

export const pressMentionsSchema = z.object({
  title: z.string().default(""),
  logos: z.array(pressLogoSchema).default([]),
  noteText: z.string().optional(),
});
export type PressMentionsProps = z.infer<typeof pressMentionsSchema>;

export const statSchema = z.object({
  value: z.string().min(1),
  label: z.string().default(""),
});

export const socialProofStatsSchema = z.object({
  title: z.string().default(""),
  stats: z.array(statSchema).default([]),
  disclaimer: z.string().optional(),
});
export type SocialProofStatsProps = z.infer<typeof socialProofStatsSchema>;

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
  benefitStack: benefitStackSchema,
  scienceExplainer: scienceExplainerSchema,
  protocolBuilder: protocolBuilderSchema,
  recoveryUseCases: recoveryUseCasesSchema,
  safetyChecklist: safetyChecklistSchema,
  guaranteeAndWarranty: guaranteeAndWarrantySchema,
  deliveryAndSetup: deliveryAndSetupSchema,
  financingAndPayment: financingAndPaymentSchema,
  objectionBusters: objectionBustersSchema,
  beforeAfterExpectations: beforeAfterExpectationsSchema,
  pressMentions: pressMentionsSchema,
  socialProofStats: socialProofStatsSchema,
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
