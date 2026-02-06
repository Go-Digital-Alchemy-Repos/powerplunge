import { Router } from "express";
import { cmsV2Service } from "../../services/cms-v2.service";

const router = Router();

router.get("/health", (_req, res) => {
  res.json(cmsV2Service.getHealth());
});

export default router;
