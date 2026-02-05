import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.middleware";
import * as customersController from "../../controllers/admin/customers.controller";

const router = Router();

router.get("/", requireAdmin, customersController.listCustomers);
router.get("/:id", requireAdmin, customersController.getCustomer);
router.post("/", requireAdmin, customersController.createCustomer);
router.delete("/:id", requireAdmin, customersController.deleteCustomer);

export default router;
