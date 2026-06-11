import prisma from "../utils/prisma.js";
import { comparePassword, hashPassword } from "../utils/password.js";

// GET /api/users/profile - Get current user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subRole: true,
        isActive: true,
        branchId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// PUT /api/users/profile - Update current user profile
export const updateUserProfile = async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subRole: true,
      },
    });

    // Create system notification for settings modification
    await prisma.notification.create({
      data: {
        companyId: req.user.companyId,
        message: `User Profile updated for ${updatedUser.name} (${updatedUser.email})`,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// PUT /api/users/change-password - Change current user's password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password matches
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid current password" });
    }

    // Hash new password and update
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    // Create system notification for security modification
    await prisma.notification.create({
      data: {
        companyId: req.user.companyId,
        message: `Security: Password changed for user ${user.name}`,
      },
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Failed to update password" });
  }
};

// GET /api/users - List active users for the current company
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subRole: true,
        isActive: true,
        branchId: true,
      },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// POST /api/users - Add a new user
export const createUser = async (req, res) => {
  const { name, email, password, role, subRole, branchId } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Name, email, password, and role are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  try {
    // Check if email already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Resolve branchId (use HQ - Main Branch as default if not specified)
    let assignedBranchId = branchId ? parseInt(branchId) : null;
    if (!assignedBranchId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { companyId: req.user.companyId, name: "HQ - Main Branch" }
      });
      if (defaultBranch) {
        assignedBranchId = defaultBranch.id;
      }
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        companyId: req.user.companyId,
        branchId: assignedBranchId,
        name,
        email,
        password: hashed,
        role,
        subRole: subRole || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subRole: true,
        isActive: true,
        branchId: true,
      },
    });

    // Create system notification for user addition
    await prisma.notification.create({
      data: {
        companyId: req.user.companyId,
        message: `New User Added: ${user.name} (${role}${user.subRole ? ' - ' + user.subRole : ''})`,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// PUT /api/users/:id - Update user details
export const updateUser = async (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email, password, role, subRole, branchId } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid User ID" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser || existingUser.companyId !== req.user.companyId) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      if (email !== existingUser.email) {
        const emailCheck = await prisma.user.findUnique({ where: { email } });
        if (emailCheck) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      updateData.email = email;
    }
    if (role !== undefined) updateData.role = role;
    if (subRole !== undefined) updateData.subRole = subRole || null;
    if (branchId !== undefined) updateData.branchId = branchId ? parseInt(branchId) : null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subRole: true,
        isActive: true,
        branchId: true,
      },
    });

    // Create system notification for user role/settings modifications
    await prisma.notification.create({
      data: {
        companyId: req.user.companyId,
        message: `User Settings Modified: ${updatedUser.name} (${updatedUser.email})`,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// DELETE /api/users/:id - Soft delete user
export const deleteUser = async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid User ID" });
  }

  // Prevent user from soft-deleting themselves
  if (userId === req.user.id) {
    return res.status(400).json({ error: "You cannot deactivate your own account" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== req.user.companyId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Create system notification for user deactivation
    await prisma.notification.create({
      data: {
        companyId: req.user.companyId,
        message: `Security: User account deactivated for ${user.name} (${user.email})`,
      },
    });

    res.status(200).json({ message: "User account deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
};
