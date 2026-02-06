import { z } from "zod";

export const cmsV2HealthResponseSchema = z.object({
  ok: z.boolean(),
});

export type CmsV2HealthResponse = z.infer<typeof cmsV2HealthResponseSchema>;

export const blockSchema = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.unknown()),
  version: z.number().optional(),
});

export type Block = z.infer<typeof blockSchema>;

export const seoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
  noIndex: z.boolean().optional(),
});

export type Seo = z.infer<typeof seoSchema>;

export const pageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  html: z.string().optional(),
  contentJson: z.array(blockSchema).optional(),
  seo: seoSchema.optional(),
});

export type Page = z.infer<typeof pageSchema>;

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  blocks: z.array(blockSchema),
  category: z.string().optional(),
});

export type Section = z.infer<typeof sectionSchema>;

export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  blocks: z.array(blockSchema),
  thumbnail: z.string().optional(),
});

export type Template = z.infer<typeof templateSchema>;

export const themeSchema = z.object({
  colors: z.record(z.string()).optional(),
  fonts: z.record(z.string()).optional(),
  spacing: z.record(z.union([z.string(), z.number()])).optional(),
  custom: z.record(z.unknown()).optional(),
});

export type Theme = z.infer<typeof themeSchema>;
