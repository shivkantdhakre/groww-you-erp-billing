import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from "../controllers/usersController.js";
import { verifyTokenAndTenant, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to ALL routes in this router
router.use(verifyTokenAndTenant);

// User Profile & Password routes (accessible by any authenticated user)
router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);
router.put("/change-password", changePassword);

// User Management CRUD routes (restricted to Admin users)
router.get("/", requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]), getUsers);
router.post("/", requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]), createUser);
router.put("/:id", requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]), updateUser);
router.delete("/:id", requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]), deleteUser);

export default router;
