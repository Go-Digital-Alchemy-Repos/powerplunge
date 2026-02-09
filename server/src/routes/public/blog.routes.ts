import { Router } from "express";
import { cmsV2PostsService } from "../../services/cms-v2-posts.service";
import { cmsV2MenusService } from "../../services/cms-v2-menus.service";

const router = Router();

router.get("/posts", async (_req, res) => {
  const posts = await cmsV2PostsService.listPublished();
  res.json(posts);
});

router.get("/posts/:slug", async (req, res) => {
  const post = await cmsV2PostsService.getPublishedBySlug(req.params.slug);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

router.get("/tags", async (_req, res) => {
  const tags = await cmsV2PostsService.listTags();
  res.json(tags);
});

router.get("/categories", async (_req, res) => {
  const categories = await cmsV2PostsService.listCategories();
  res.json(categories);
});

export default router;

export const publicMenuRoutes = Router();

publicMenuRoutes.get("/:location", async (req, res) => {
  const menu = await cmsV2MenusService.getActiveByLocation(req.params.location);
  res.json(menu || null);
});
