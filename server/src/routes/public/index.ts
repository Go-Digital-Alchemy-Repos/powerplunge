import { Router } from "express";
import productsRoutes from "./products.routes";
import affiliateTrackingRoutes from "./affiliate-tracking.routes";
import affiliateSignupRoutes from "./affiliate-signup.routes";

const router = Router();

router.use("/products", productsRoutes);
router.use("/affiliate", affiliateTrackingRoutes);
router.use("/affiliate-signup", affiliateSignupRoutes);

export default router;
