import { Router } from "express";
import productsRoutes from "./products.routes";
import affiliateTrackingRoutes from "./affiliate-tracking.routes";
import affiliateSignupRoutes from "./affiliate-signup.routes";
import googleReviewsRoutes from "./google-reviews.routes";
import metaCatalogRoutes from "./meta-catalog.routes";

const router = Router();

router.use("/products", productsRoutes);
router.use("/affiliate", affiliateTrackingRoutes);
router.use("/affiliate-signup", affiliateSignupRoutes);
router.use("/google-reviews", googleReviewsRoutes);
router.use("/", metaCatalogRoutes);

export default router;
