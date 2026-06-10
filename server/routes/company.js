import express from "express";
import { getCompanySettings, updateCompanySettings } from "../controllers/companyController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";
import { validate, companySettingsSchema } from "../middleware/validateMiddleware.js";

const router = express.Router();

router.use(verifyTokenAndTenant);

router.get("/", getCompanySettings);
router.put("/", validate(companySettingsSchema), updateCompanySettings);

export default router;
