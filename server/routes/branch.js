import express from "express";
import { getBranches, getBranchById, updateBranchSettings } from "../controllers/branchController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyTokenAndTenant);

router.get("/", getBranches);
router.get("/:id", getBranchById);
router.put("/:id", updateBranchSettings);

export default router;
