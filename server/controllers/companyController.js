import prisma from "../utils/prisma.js";
import { encrypt } from "../utils/crypto.js";

// GET /api/company
export const getCompanySettings = async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    if (company.nicPassword) {
      company.nicPassword = "******";
    }
    res.status(200).json(company);
  } catch (error) {
    console.error("Error fetching company settings:", error);
    res.status(500).json({ error: "Failed to fetch company settings" });
  }
};

// PUT /api/company
export const updateCompanySettings = async (req, res) => {
  const { 
    name, gstNumber, address, mobileNumber, invoicePrefix, 
    financialYear, currentFinancialYearStart, financialYearLocked,
    nicUsername, nicPassword 
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Company Name is required" });
  }

  try {
    const data = {
      name,
      gstNumber,
      address,
      mobileNumber,
      invoicePrefix,
      financialYear,
      currentFinancialYearStart: currentFinancialYearStart ? new Date(currentFinancialYearStart) : null,
      financialYearLocked: financialYearLocked ?? false,
      nicUsername,
    };

    if (nicPassword && nicPassword !== "******") {
      data.nicPassword = encrypt(nicPassword);
    }

    const updatedCompany = await prisma.company.update({
      where: { id: req.user.companyId },
      data,
    });

    // Create system notification for company configuration changes
    await prisma.notification.create({
      data: {
        companyId: req.user.companyId,
        message: `Company Settings updated: ${updatedCompany.name}`,
      },
    });

    if (updatedCompany.nicPassword) {
      updatedCompany.nicPassword = "******";
    }

    res.status(200).json(updatedCompany);
  } catch (error) {
    console.error("Error updating company settings:", error);
    res.status(500).json({ error: "Failed to update company settings" });
  }
};
