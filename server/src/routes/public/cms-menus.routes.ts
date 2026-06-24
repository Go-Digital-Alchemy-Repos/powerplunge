import { Router } from "express";
import { cmsMenusService } from "../../services/cms-menus.service";

const router = Router();

router.get("/:location", async (req, res) => {
  const menu = await cmsMenusService.getActiveByLocation(req.params.location);
  res.json(menu || null);
});

export default router;
