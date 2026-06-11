import express from "express";
import {
  getNotifications,
  markAsRead,
  clearNotifications
} from "../controllers/notificationsController.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyTokenAndTenant);

router.get("/", getNotifications);
router.put("/:id/read", markAsRead);
router.delete("/clear", clearNotifications);

export default router;
