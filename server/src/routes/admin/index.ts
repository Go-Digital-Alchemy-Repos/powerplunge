import { Router } from "express";
import customersRoutes from "./customers.routes";
import productsRoutes from "./products.routes";
import mediaRoutes from "./media.routes";
import docsRoutes from "./docs.router";

const router = Router();

router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/media", mediaRoutes);
router.use("/docs", docsRoutes);

export default router;
