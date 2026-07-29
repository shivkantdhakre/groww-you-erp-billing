import express from "express";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addLeadInteraction,
  analyzeLead,
  deleteLead
} from "../controllers/leadController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply security & tenant isolation middleware
router.use(verifyTokenAndTenant);

router.get("/", getLeads);
router.get("/:id", getLeadById);
router.post("/", createLead);
router.put("/:id", updateLead);
router.post("/:id/interactions", addLeadInteraction);
router.put("/:id/ai-analyze", analyzeLead);
router.delete("/:id", deleteLead);

export default router;
