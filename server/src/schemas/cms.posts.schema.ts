import { z } from "zod";
import { blockSchema } from "./cms.schema";

export const postStatusEnum = z.enum(["draft", "scheduled", "published", "archived"]);
export type PostStatus = z.infer<typeof postStatusEnum>;

const basePostFields = {
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  excerpt: z.string().nullish(),
  contentJson: z.array(blockSchema).nullish(),
  legacyHtml: z.string().nullish(),
  status: postStatusEnum.default("draft"),
  publishedAt: z.string().datetime().nullish(),
  scheduledAt: z.string().datetime().nullish(),
  authorId: z.string().nullish(),
  coverImageId: z.string().nullish(),
  ogImageId: z.string().nullish(),
  readingTimeMinutes: z.number().int().positive().nullish(),
  canonicalUrl: z.string().url().nullish(),
  featured: z.boolean().default(false),
  allowIndex: z.boolean().default(true),
  allowFollow: z.boolean().default(true),
  sidebarId: z.string().nullish(),
  customCss: z.string().nullish(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
};

function applyStatusRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data: any, ctx: z.RefinementCtx) => {
    if (data.status === "published" && !data.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Published posts require a publishedAt date",
        path: ["publishedAt"],
      });
    }
    if (data.status === "scheduled" && !data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled posts require a scheduledAt date",
        path: ["scheduledAt"],
      });
    }
  });
}

export const createPostSchema = applyStatusRefinements(z.object(basePostFields));
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = applyStatusRefinements(z.object(basePostFields).partial());
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const createPostCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().nullish(),
});

export type CreatePostCategoryInput = z.infer<typeof createPostCategorySchema>;

export const updatePostCategorySchema = createPostCategorySchema.partial();
export type UpdatePostCategoryInput = z.infer<typeof updatePostCategorySchema>;

export const createPostTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export type CreatePostTagInput = z.infer<typeof createPostTagSchema>;

export const updatePostTagSchema = createPostTagSchema.partial();
export type UpdatePostTagInput = z.infer<typeof updatePostTagSchema>;

export const postSettingsSchema = z.object({
  postsPerPage: z.number().int().min(1).max(100).default(12),
  blogTitle: z.string().min(1).default("Blog"),
  blogDescription: z.string().nullish(),
  defaultOgImageId: z.string().nullish(),
  rssEnabled: z.boolean().default(true),
});

export type PostSettingsInput = z.infer<typeof postSettingsSchema>;

export const postStatusRules = {
  canBePublic(status: PostStatus, publishedAt: Date | null, scheduledAt: Date | null): boolean {
    if (status === "draft" || status === "archived") return false;
    if (status === "published") return publishedAt !== null;
    if (status === "scheduled") {
      return scheduledAt !== null && scheduledAt <= new Date();
    }
    return false;
  },
} as const;
