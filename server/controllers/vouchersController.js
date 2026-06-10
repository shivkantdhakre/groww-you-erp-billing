import prisma from "../utils/prisma.js";

// Get vouchers with optional filters and date bounding
export const getVouchers = async (req, res) => {
  const { type, customerId, vendorId, fromDate, toDate } = req.query;

  try {
    let dateFilter = {};
    if (fromDate || toDate) {
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        dateFilter.lte = to;
      }
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      dateFilter.gte = thirtyDaysAgo;
    }

    const whereClause = {
      companyId: req.user.companyId,
      voucherDate: dateFilter,
    };

    if (type) whereClause.type = type;
    if (customerId) whereClause.customerId = parseInt(customerId);
    if (vendorId) whereClause.vendorId = parseInt(vendorId);

    const vouchers = await prisma.voucher.findMany({
      where: whereClause,
      include: {
        customer: true,
        vendor: true,
      },
      orderBy: {
        voucherDate: "desc",
      },
    });

    res.status(200).json(vouchers);
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
};

// Create a voucher (ACID transaction with concurrency-safe auto-increment prefix)
export const createVoucher = async (req, res) => {
  const {
    type,
    customerId,
    vendorId,
    debitAccount,
    creditAccount,
    amount,
    paymentMode,
    referenceNo,
    remarks,
    voucherDate,
  } = req.body;

  if (!type || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Voucher Type and a valid amount greater than 0 are required" });
  }

  try {
    // Check if Financial Year is locked for the company
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    if (company.financialYearLocked && company.currentFinancialYearStart) {
      const vDate = voucherDate ? new Date(voucherDate) : new Date();
      if (vDate < new Date(company.currentFinancialYearStart)) {
        return res.status(400).json({ error: "Transaction blocked: Financial year is locked." });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify customer/vendor active status if selected
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: parseInt(customerId), companyId: req.user.companyId, isActive: true },
        });
        if (!customer) {
          throw new Error("Selected Customer is invalid or inactive");
        }
      }

      if (vendorId) {
        const vendor = await tx.vendor.findFirst({
          where: { id: parseInt(vendorId), companyId: req.user.companyId, isActive: true },
        });
        if (!vendor) {
          throw new Error("Selected Vendor is invalid or inactive");
        }
      }

      // 2. Generate sequential voucher number inside transaction block
      const count = await tx.voucher.count({
        where: { companyId: req.user.companyId, type },
      });

      const prefixes = {
        PAYMENT: "PV",
        RECEIPT: "RV",
        CONTRA: "CV",
        JOURNAL: "JV",
      };
      const prefix = prefixes[type] || "VCH";
      const voucherNo = `${prefix}-${String(count + 1).padStart(4, "0")}`;

      // 3. Create the Voucher
      const voucher = await tx.voucher.create({
        data: {
          companyId: req.user.companyId,
          voucherNo,
          voucherDate: voucherDate ? new Date(voucherDate) : new Date(),
          type,
          customerId: customerId ? parseInt(customerId) : null,
          vendorId: vendorId ? parseInt(vendorId) : null,
          debitAccount,
          creditAccount,
          amount: parseFloat(amount),
          paymentMode,
          referenceNo,
          remarks,
        },
      });

      // 4. Update ledger balance and log financial transaction
      if (type === "RECEIPT" && customerId) {
        await tx.customer.update({
          where: { id: parseInt(customerId) },
          data: {
            outstandingBalance: { decrement: parseFloat(amount) },
          },
        });

        await tx.financialTransaction.create({
          data: {
            companyId: req.user.companyId,
            customerId: parseInt(customerId),
            transactionType: "CREDIT",
            amount: parseFloat(amount),
            reference: `Receipt Voucher ${voucherNo}`,
            voucherId: voucher.id,
          },
        });
      } else if (type === "PAYMENT" && vendorId) {
        await tx.vendor.update({
          where: { id: parseInt(vendorId) },
          data: {
            outstandingBalance: { decrement: parseFloat(amount) },
          },
        });

        await tx.financialTransaction.create({
          data: {
            companyId: req.user.companyId,
            vendorId: parseInt(vendorId),
            transactionType: "DEBIT",
            amount: parseFloat(amount),
            reference: `Payment Voucher ${voucherNo}`,
            voucherId: voucher.id,
          },
        });
      }

      return voucher;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating voucher:", error);
    res.status(400).json({ error: error.message || "Failed to create voucher" });
  }
};

// Cancel (Void) a voucher and reverse outstanding adjustments/ledger records
export const cancelVoucher = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch Voucher and check cancellation status and company ownership first
    const voucher = await prisma.voucher.findUnique({
      where: { id: parseInt(id) },
    });

    if (!voucher || voucher.companyId !== req.user.companyId) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    if (voucher.isCancelled) {
      return res.status(400).json({ error: "Voucher is already cancelled." });
    }

    // 2. Check if Financial Year is locked
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    if (company.financialYearLocked && company.currentFinancialYearStart) {
      if (new Date(voucher.voucherDate) < new Date(company.currentFinancialYearStart)) {
        return res.status(400).json({ error: "Transaction blocked: Financial year is locked." });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch inside transaction for concurrency safety
      const txVoucher = await tx.voucher.findUnique({
        where: { id: parseInt(id) },
      });
      if (txVoucher.isCancelled) {
        throw new Error("Voucher is already cancelled.");
      }

      // Perform reversals based on type
      if (voucher.type === "RECEIPT" && voucher.customerId) {
        // Reverse customer outstanding decrement (increase it back)
        await tx.customer.update({
          where: { id: voucher.customerId },
          data: {
            outstandingBalance: { increment: voucher.amount },
          },
        });

        // Log reversing DEBIT transaction
        await tx.financialTransaction.create({
          data: {
            companyId: req.user.companyId,
            customerId: voucher.customerId,
            transactionType: "DEBIT",
            amount: voucher.amount,
            reference: `Reversal of Cancelled Receipt ${voucher.voucherNo}`,
            voucherId: voucher.id,
          },
        });
      } else if (voucher.type === "PAYMENT" && voucher.vendorId) {
        // Reverse vendor outstanding decrement (increase it back)
        await tx.vendor.update({
          where: { id: voucher.vendorId },
          data: {
            outstandingBalance: { increment: voucher.amount },
          },
        });

        // Log reversing CREDIT transaction
        await tx.financialTransaction.create({
          data: {
            companyId: req.user.companyId,
            vendorId: voucher.vendorId,
            transactionType: "CREDIT",
            amount: voucher.amount,
            reference: `Reversal of Cancelled Payment ${voucher.voucherNo}`,
            voucherId: voucher.id,
          },
        });
      }

      // 3. Mark Voucher as cancelled
      const updatedVoucher = await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          isCancelled: true,
        },
      });

      return updatedVoucher;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error cancelling voucher:", error);
    res.status(400).json({ error: error.message || "Failed to cancel voucher" });
  }
};
