import { Router } from "express";
import { cmsV2PostsService } from "../../services/cms-v2-posts.service";
import { insertCmsV2PostSchema } from "@shared/schema";

const router = Router();

router.get("/", async (_req, res) => {
  const posts = await cmsV2PostsService.list();
  res.json(posts);
});

router.get("/tags", async (_req, res) => {
  const tags = await cmsV2PostsService.listTags();
  res.json(tags);
});

router.get("/categories", async (_req, res) => {
  const categories = await cmsV2PostsService.listCategories();
  res.json(categories);
});

router.get("/check-slug", async (req, res) => {
  const slug = req.query.slug as string;
  if (!slug) return res.status(400).json({ error: "slug query param required" });
  const result = await cmsV2PostsService.checkSlug(slug);
  res.json(result);
});

router.get("/:id", async (req, res) => {
  const post = await cmsV2PostsService.getById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

router.post("/", async (req, res) => {
  try {
    const parsed = insertCmsV2PostSchema.parse(req.body);
    const post = await cmsV2PostsService.create(parsed);
    res.status(201).json(post);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    console.error("[CMS-V2-POSTS] Create error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const partial = insertCmsV2PostSchema.partial().parse(req.body);
    const post = await cmsV2PostsService.update(req.params.id, partial);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: err.errors });
    }
    console.error("[CMS-V2-POSTS] Update error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.post("/:id/publish", async (req, res) => {
  const post = await cmsV2PostsService.publish(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

router.post("/:id/unpublish", async (req, res) => {
  const post = await cmsV2PostsService.unpublish(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

router.delete("/:id", async (req, res) => {
  const post = await cmsV2PostsService.remove(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json({ success: true });
});

export default router;
