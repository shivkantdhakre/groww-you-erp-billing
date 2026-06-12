import prisma from "../utils/prisma.js";
import { encrypt } from "../utils/crypto.js";

// GET /api/branches
export const getBranches = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { companyId: req.user.companyId },
    });
    
    // Mask passwords
    branches.forEach((b) => {
      if (b.nicPassword) {
        b.nicPassword = "******";
      }
    });

    res.status(200).json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};

// GET /api/branches/:id
export const getBranchById = async (req, res) => {
  const branchId = parseInt(req.params.id);
  if (isNaN(branchId)) {
    return res.status(400).json({ error: "Invalid branch ID" });
  }

  try {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId: req.user.companyId },
    });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    if (branch.nicPassword) {
      branch.nicPassword = "******";
    }

    res.status(200).json(branch);
  } catch (error) {
    console.error("Error fetching branch details:", error);
    res.status(500).json({ error: "Failed to fetch branch details" });
  }
};

// PUT /api/branches/:id
export const updateBranchSettings = async (req, res) => {
  const branchId = parseInt(req.params.id);
  const { name, address, mobileNumber, pincode, isActive, nicUsername, nicPassword } = req.body;

  if (isNaN(branchId)) {
    return res.status(400).json({ error: "Invalid branch ID" });
  }

  try {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId: req.user.companyId },
    });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const data = {
      name,
      address,
      mobileNumber,
      pincode,
      isActive,
      nicUsername,
    };

    if (nicPassword && nicPassword !== "******") {
      data.nicPassword = encrypt(nicPassword);
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: branch.id },
      data,
    });

    if (updatedBranch.nicPassword) {
      updatedBranch.nicPassword = "******";
    }

    res.status(200).json(updatedBranch);
  } catch (error) {
    console.error("Error updating branch settings:", error);
    res.status(500).json({ error: "Failed to update branch settings" });
  }
};
