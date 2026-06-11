import express from "express";
import { searchAll } from "../controllers/searchController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyTokenAndTenant, searchAll);

export default router;
