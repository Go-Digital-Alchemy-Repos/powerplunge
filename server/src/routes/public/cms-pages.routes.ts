import { Router, Request, Response } from "express";
import { storage } from "../../../storage";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const pages = await storage.getPublishedPages();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pages" });
  }
});

router.get("/home", async (_req: Request, res: Response) => {
  try {
    const page = await storage.getHomePage();
    if (!page || page.status !== "published") {
      return res.status(404).json({ message: "Home page not found" });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch home page" });
  }
});

router.get("/shop", async (_req: Request, res: Response) => {
  try {
    const page = await storage.getShopPage();
    if (!page || page.status !== "published") {
      return res.status(404).json({ message: "Shop page not found" });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shop page" });
  }
});

router.get("/by-id/:id", async (req: Request, res: Response) => {
  try {
    const page = await storage.getPage(req.params.id);
    if (!page || page.status !== "published") {
      return res.status(404).json({ message: "Page not found" });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch page" });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const page = await storage.getPageBySlug(req.params.slug);
    if (!page || page.status !== "published") {
      return res.status(404).json({ message: "Page not found" });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch page" });
  }
});

export default router;
