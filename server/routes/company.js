import express from "express";
import { getCompanySettings, updateCompanySettings } from "../controllers/companyController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyTokenAndTenant);

router.get("/", getCompanySettings);
router.put("/", updateCompanySettings);

export default router;
