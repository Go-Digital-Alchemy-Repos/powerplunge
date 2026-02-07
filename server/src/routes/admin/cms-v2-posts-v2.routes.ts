import { Router } from "express";
import { isCmsV2Enabled } from "../../config/env";
import { postsService, SlugConflictError, ValidationError } from "../../services/cmsV2.posts.service";
import {
  createPostSchema,
  updatePostSchema,
  createPostCategorySchema,
  updatePostCategorySchema,
  createPostTagSchema,
  updatePostTagSchema,
  postSettingsSchema,
} from "../../schemas/cmsV2.posts.schema";

const router = Router();

router.use((_req, res, next) => {
  if (!isCmsV2Enabled()) {
    return res.status(403).json({ error: "CMS v2 is not enabled" });
  }
  next();
});

function handleError(res: any, err: any, context: string) {
  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation failed", details: err.errors });
  }
  if (err instanceof SlugConflictError) {
    return res.status(409).json({ error: err.message });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(`[CMS-V2-POSTS] ${context}:`, err);
  res.status(500).json({ error: `Failed to ${context.toLowerCase()}` });
}

// ── Posts CRUD ────────────────────────────────────────────────

router.get("/posts", async (req, res) => {
  try {
    const result = await postsService.list({
      status: req.query.status as string | undefined,
      q: req.query.q as string | undefined,
      tag: req.query.tag as string | undefined,
      category: req.query.category as string | undefined,
      authorId: req.query.authorId as string | undefined,
      featured: req.query.featured === "true" ? true : req.query.featured === "false" ? false : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
      sort: req.query.sort as string | undefined,
    });
    res.json(result);
  } catch (err: any) {
    handleError(res, err, "List posts");
  }
});

router.post("/posts", async (req, res) => {
  try {
    const parsed = createPostSchema.parse(req.body);
    const post = await postsService.create(parsed);
    res.status(201).json(post);
  } catch (err: any) {
    handleError(res, err, "Create post");
  }
});

router.get("/posts/:id", async (req, res) => {
  try {
    const post = await postsService.getById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    handleError(res, err, "Get post");
  }
});

router.put("/posts/:id", async (req, res) => {
  try {
    const parsed = updatePostSchema.parse(req.body);
    const post = await postsService.update(req.params.id, parsed);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    handleError(res, err, "Update post");
  }
});

router.delete("/posts/:id", async (req, res) => {
  try {
    const post = await postsService.remove(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ success: true, post });
  } catch (err: any) {
    handleError(res, err, "Delete post");
  }
});

// ── Post Status Actions ──────────────────────────────────────

router.post("/posts/:id/publish", async (req, res) => {
  try {
    const userId = (req as any).adminUser?.id;
    const post = await postsService.publish(req.params.id, userId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    handleError(res, err, "Publish post");
  }
});

router.post("/posts/:id/unpublish", async (req, res) => {
  try {
    const post = await postsService.unpublish(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    handleError(res, err, "Unpublish post");
  }
});

router.post("/posts/:id/schedule", async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt is required" });
    }
    const post = await postsService.schedule(req.params.id, scheduledAt);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    handleError(res, err, "Schedule post");
  }
});

router.post("/posts/:id/archive", async (req, res) => {
  try {
    const post = await postsService.archive(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    handleError(res, err, "Archive post");
  }
});

// ── Categories CRUD ──────────────────────────────────────────

router.get("/post-categories", async (_req, res) => {
  try {
    const categories = await postsService.listCategories();
    res.json(categories);
  } catch (err: any) {
    handleError(res, err, "List categories");
  }
});

router.post("/post-categories", async (req, res) => {
  try {
    const parsed = createPostCategorySchema.parse(req.body);
    const category = await postsService.createCategory(parsed);
    res.status(201).json(category);
  } catch (err: any) {
    handleError(res, err, "Create category");
  }
});

router.get("/post-categories/:id", async (req, res) => {
  try {
    const category = await postsService.getCategoryById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err: any) {
    handleError(res, err, "Get category");
  }
});

router.put("/post-categories/:id", async (req, res) => {
  try {
    const parsed = updatePostCategorySchema.parse(req.body);
    const category = await postsService.updateCategory(req.params.id, parsed);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err: any) {
    handleError(res, err, "Update category");
  }
});

router.delete("/post-categories/:id", async (req, res) => {
  try {
    const category = await postsService.removeCategory(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ success: true });
  } catch (err: any) {
    handleError(res, err, "Delete category");
  }
});

// ── Tags CRUD ────────────────────────────────────────────────

router.get("/post-tags", async (_req, res) => {
  try {
    const tags = await postsService.listTags();
    res.json(tags);
  } catch (err: any) {
    handleError(res, err, "List tags");
  }
});

router.post("/post-tags", async (req, res) => {
  try {
    const parsed = createPostTagSchema.parse(req.body);
    const tag = await postsService.createTag(parsed);
    res.status(201).json(tag);
  } catch (err: any) {
    handleError(res, err, "Create tag");
  }
});

router.get("/post-tags/:id", async (req, res) => {
  try {
    const tag = await postsService.getTagById(req.params.id);
    if (!tag) return res.status(404).json({ error: "Tag not found" });
    res.json(tag);
  } catch (err: any) {
    handleError(res, err, "Get tag");
  }
});

router.put("/post-tags/:id", async (req, res) => {
  try {
    const parsed = updatePostTagSchema.parse(req.body);
    const tag = await postsService.updateTag(req.params.id, parsed);
    if (!tag) return res.status(404).json({ error: "Tag not found" });
    res.json(tag);
  } catch (err: any) {
    handleError(res, err, "Update tag");
  }
});

router.delete("/post-tags/:id", async (req, res) => {
  try {
    const tag = await postsService.removeTag(req.params.id);
    if (!tag) return res.status(404).json({ error: "Tag not found" });
    res.json({ success: true });
  } catch (err: any) {
    handleError(res, err, "Delete tag");
  }
});

// ── Settings ─────────────────────────────────────────────────

router.get("/post-settings", async (_req, res) => {
  try {
    const settings = await postsService.getSettings();
    res.json(settings);
  } catch (err: any) {
    handleError(res, err, "Get settings");
  }
});

router.put("/post-settings", async (req, res) => {
  try {
    const parsed = postSettingsSchema.parse(req.body);
    const settings = await postsService.updateSettings(parsed);
    res.json(settings);
  } catch (err: any) {
    handleError(res, err, "Update settings");
  }
});

export default router;
