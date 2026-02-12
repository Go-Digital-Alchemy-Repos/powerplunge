import { Router } from "express";
import customersRoutes from "./customers.routes";
import productsRoutes from "./products.routes";
import mediaRoutes from "./media.routes";
import docsRoutes from "./docs.router";
import analyticsRoutes from "./analytics.routes";

const router = Router();

router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/media", mediaRoutes);
router.use("/docs", docsRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
