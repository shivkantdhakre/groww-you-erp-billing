import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/company
export const getCompanySettings = async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.status(200).json(company);
  } catch (error) {
    console.error("Error fetching company settings:", error);
    res.status(500).json({ error: "Failed to fetch company settings" });
  }
};

// PUT /api/company
export const updateCompanySettings = async (req, res) => {
  const { name, gstNumber, address, mobileNumber, invoicePrefix, financialYear, currentFinancialYearStart, financialYearLocked } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Company Name is required" });
  }

  try {
    const updatedCompany = await prisma.company.update({
      where: { id: req.user.companyId },
      data: {
        name,
        gstNumber,
        address,
        mobileNumber,
        invoicePrefix,
        financialYear,
        currentFinancialYearStart: currentFinancialYearStart ? new Date(currentFinancialYearStart) : null,
        financialYearLocked: financialYearLocked ?? false,
      },
    });

    res.status(200).json(updatedCompany);
  } catch (error) {
    console.error("Error updating company settings:", error);
    res.status(500).json({ error: "Failed to update company settings" });
  }
};
