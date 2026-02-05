import { Router } from "express";
import customersRoutes from "./customers.routes";
import productsRoutes from "./products.routes";
import mediaRoutes from "./media.routes";

const router = Router();

router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/media", mediaRoutes);

export default router;
