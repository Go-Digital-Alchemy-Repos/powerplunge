import { Router } from "express";
import * as productsController from "../../controllers/public/products.controller";

const router = Router();

router.get("/", productsController.listActiveProducts);
router.get("/:id", productsController.getProduct);

export default router;
