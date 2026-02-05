import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.middleware";
import * as productsController from "../../controllers/admin/products.controller";

const router = Router();

router.get("/", requireAdmin, productsController.listProducts);
router.post("/", requireAdmin, productsController.createProduct);
router.patch("/:id", requireAdmin, productsController.updateProduct);
router.delete("/:id", requireAdmin, productsController.deleteProduct);

export default router;
