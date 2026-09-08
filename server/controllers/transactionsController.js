import prisma from "../utils/prisma.js";
import { paginate } from "../utils/pagination.js";
import { getSequenceNextValue, SEQUENCE_TYPES } from "../utils/sequence.js";
import { invalidateInsightsCache } from "../utils/cacheService.js";

// ==========================================
// SALES INVOICE CONTROLLERS
// ==========================================

// Fetch all sales invoices for the tenant
export const getSalesInvoices = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      invoiceType: "SALE"
    };
    const include = {
      customer: true,
      items: {
        include: {
          item: true
        }
      }
    };
    const result = await paginate(prisma.invoice, whereClause, req.query, include, { createdAt: "desc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching sales invoices:", error);
    res.status(500).json({ error: "Failed to fetch sales invoices" });
  }
};

// Create an atomic Sales Invoice (Sale)
export const createSalesInvoice = async (req, res) => {
  const { customerId, items: clientItems, invoiceDate } = req.body;

  if (!customerId || !clientItems || clientItems.length === 0) {
    return res.status(400).json({ error: "Customer and at least one item are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Company details for prefix
      const company = await tx.company.findUnique({
        where: { id: req.user.companyId }
      });
      if (!company) {
        throw new Error("Company not found");
      }

      // Check if Financial Year is locked
      if (company.financialYearLocked && company.currentFinancialYearStart) {
        const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
        if (invDate < new Date(company.currentFinancialYearStart)) {
          throw new Error("Transaction blocked: Financial year is locked.");
        }
      }

      // 2. Verify Customer (must be active)
      const customer = await tx.customer.findFirst({
        where: { id: parseInt(customerId), companyId: req.user.companyId, isActive: true }
      });
      if (!customer) {
        throw new Error("Invalid or inactive customer selected");
      }

      // 3. Generate sequential invoice number (concurrency-safe)
      const seqValue = await getSequenceNextValue(
        req.user.companyId,
        req.user.branchId,
        SEQUENCE_TYPES.SALE_INVOICE,
        tx
      );
      const prefix = company.invoicePrefix || "GY-";
      const invoiceNo = `${prefix}${String(seqValue).padStart(4, "0")}`;

      let totalQty = 0;
      let grandTotal = 0;
      const invoiceItemsData = [];

      // 4. Validate items and stock level, compute zero-trust totals
      for (const line of clientItems) {
        const itemId = parseInt(line.itemId);
        const qty = parseInt(line.qty);
        if (!itemId || isNaN(qty) || qty <= 0) {
          throw new Error("Invalid item or quantity specified");
        }

        const dbItem = await tx.item.findFirst({
          where: { id: itemId, companyId: req.user.companyId, isActive: true }
        });
        if (!dbItem) {
          throw new Error(`Item with ID ${itemId} not found or is inactive`);
        }

        // Ensure BranchStock record exists (concurrency-safe)
        const branchStock = await tx.branchStock.upsert({
          where: {
            branchId_itemId: {
              branchId: req.user.branchId,
              itemId
            }
          },
          create: {
            branchId: req.user.branchId,
            itemId,
            stock: 0
          },
          update: {}
        });

        // Concurrency-safe check & decrement
        const updated = await tx.branchStock.updateMany({
          where: {
            itemId,
            branchId: req.user.branchId,
            stock: { gte: qty }
          },
          data: {
            stock: { decrement: qty }
          }
        });

        if (updated.count === 0) {
          const latestBs = await tx.branchStock.findUnique({
            where: {
              branchId_itemId: {
                branchId: req.user.branchId,
                itemId
              }
            }
          });
          throw new Error(`Insufficient stock for item: ${dbItem.name}. Available: ${latestBs?.stock || 0}, Requested: ${qty}`);
        }

        // Check and log Low Stock Warning inside transaction
        const newStock = branchStock.stock - qty;
        if (newStock < dbItem.minStockAlert) {
          await tx.notification.create({
            data: {
              companyId: req.user.companyId,
              message: `Low Stock Warning: Item "${dbItem.name}" has dropped to ${newStock} units (Threshold: ${dbItem.minStockAlert})`
            }
          });
        }

        // Zero-trust math using DB values
        const price = dbItem.salePrice;
        const gstPercentage = dbItem.gstPercentage;
        const subtotal = price * qty;
        const gstAmount = Math.round((subtotal * gstPercentage / 100) * 100) / 100;
        const total = Math.round((subtotal + gstAmount) * 100) / 100;

        totalQty += qty;
        grandTotal += total;

        invoiceItemsData.push({
          itemId,
          qty,
          price,
          purchasePrice: dbItem.purchasePrice,
          gstPercentage,
          gstAmount,
          total
        });
      }

      grandTotal = Math.round(grandTotal * 100) / 100;

      // 4.5. Enforce Customer Credit Limits
      const projectedBalance = customer.outstandingBalance + grandTotal;
      if (customer.creditLimit > 0 && projectedBalance > customer.creditLimit) {
        throw new Error("Transaction blocked: Customer credit limit exceeded.");
      }

      // 5. Create Invoice Header & Items
      const invoice = await tx.invoice.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          invoiceNo,
          invoiceType: "SALE",
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          customerId: customer.id,
          totalItems: invoiceItemsData.length,
          totalQty,
          grandTotal,
          items: {
            create: invoiceItemsData.map(item => ({
              itemId: item.itemId,
              qty: item.qty,
              price: item.price,
              purchasePrice: item.purchasePrice,
              gstPercentage: item.gstPercentage,
              gstAmount: item.gstAmount,
              total: item.total
            }))
          }
        },
        include: {
          customer: true,
          items: {
            include: {
              item: true
            }
          }
        }
      });

      // 6. Create Stock Movements logs
      for (const item of invoiceItemsData) {
        await tx.stockMovement.create({
          data: {
            companyId: req.user.companyId,
            branchId: req.user.branchId,
            itemId: item.itemId,
            movementType: "OUT",
            qty: item.qty,
            reference: `Sale Invoice ${invoiceNo}`
          }
        });
      }

      // 7. Update Customer Outstanding Balance (Debit: Customer owes us more money)
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          outstandingBalance: { increment: grandTotal }
        }
      });

      // 8. Log Money Transaction
      await tx.financialTransaction.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          customerId: customer.id,
          transactionType: "DEBIT",
          amount: grandTotal,
          reference: `Sale Invoice ${invoiceNo}`
        }
      });

      return invoice;
    });

    // Invalidate AI insights cache for company tenant
    invalidateInsightsCache(req.user.companyId);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in createSalesInvoice transaction:", error);
    
    // Log credit limit breach notification outside transaction
    if (error.message.includes("credit limit exceeded")) {
      try {
        const customer = await prisma.customer.findUnique({
          where: { id: parseInt(customerId) }
        });
        await prisma.notification.create({
          data: {
            companyId: req.user.companyId,
            message: `Alert: Credit limit breach attempted for customer "${customer?.name || 'Unknown'}" (Attempted projected balance exceeded limit of ₹${customer?.creditLimit || 0})`
          }
        });
      } catch (err) {
        console.error("Failed to log credit limit breach notification:", err);
      }
    }
    
    res.status(400).json({ error: error.message });
  }
};

// Fetch a single sales invoice by ID
export const getSalesInvoiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: parseInt(id),
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        invoiceType: "SALE"
      },
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found or unauthorized" });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Error fetching sales invoice by id:", error);
    res.status(500).json({ error: "Failed to fetch sales invoice" });
  }
};

// Fetch a single purchase invoice by ID
export const getPurchaseInvoiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: parseInt(id),
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        invoiceType: "PURCHASE"
      },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found or unauthorized" });
    }

    res.status(200).json(invoice);
  } catch (error) {
    console.error("Error fetching purchase invoice by id:", error);
    res.status(500).json({ error: "Failed to fetch purchase invoice" });
  }
};

// ==========================================
// PURCHASE INVOICE CONTROLLERS
// ==========================================

// Fetch all purchase invoices for the tenant
export const getPurchaseInvoices = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      invoiceType: "PURCHASE"
    };
    const include = {
      vendor: true,
      items: {
        include: {
          item: true
        }
      }
    };
    const result = await paginate(prisma.invoice, whereClause, req.query, include, { createdAt: "desc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    res.status(500).json({ error: "Failed to fetch purchase invoices" });
  }
};

// Create an atomic Purchase Invoice
export const createPurchaseInvoice = async (req, res) => {
  const { vendorId, items: clientItems, invoiceDate, invoiceNo: customInvoiceNo, scannedFileUrl, ocrConfidenceScore } = req.body;

  if (!vendorId || !clientItems || clientItems.length === 0) {
    return res.status(400).json({ error: "Vendor and at least one item are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Company details
      const company = await tx.company.findUnique({
        where: { id: req.user.companyId }
      });
      if (!company) {
        throw new Error("Company not found");
      }

      // Check if Financial Year is locked
      if (company.financialYearLocked && company.currentFinancialYearStart) {
        const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
        if (invDate < new Date(company.currentFinancialYearStart)) {
          throw new Error("Transaction blocked: Financial year is locked.");
        }
      }

      // 2. Verify Vendor (must be active)
      const vendor = await tx.vendor.findFirst({
        where: { id: parseInt(vendorId), companyId: req.user.companyId, isActive: true }
      });
      if (!vendor) {
        throw new Error("Invalid or inactive vendor selected");
      }

      // 3. Sequential invoice number generation or use vendor custom invoice number
      let invoiceNo = customInvoiceNo;
      if (!invoiceNo) {
        const seqValue = await getSequenceNextValue(
          req.user.companyId,
          req.user.branchId,
          SEQUENCE_TYPES.PURCHASE_INVOICE,
          tx
        );
        const prefix = company.invoicePrefix || "GY-";
        invoiceNo = `${prefix}PUR-${String(seqValue).padStart(4, "0")}`;
      } else {
        const existingInvoice = await tx.invoice.findFirst({
          where: {
            companyId: req.user.companyId,
            branchId: req.user.branchId,
            invoiceType: "PURCHASE",
            invoiceNo: invoiceNo
          }
        });
        if (existingInvoice) {
          throw new Error(`Purchase Invoice number '${invoiceNo}' already exists in your branch. Please use a unique invoice number.`);
        }
      }

      let totalQty = 0;
      let grandTotal = 0;
      const invoiceItemsData = [];

      // 4. Validate items and increment stock, compute zero-trust totals
      for (const line of clientItems) {
        const itemId = parseInt(line.itemId);
        const qty = parseInt(line.qty);
        if (!itemId || isNaN(qty) || qty <= 0) {
          throw new Error("Invalid item or quantity specified");
        }

        const dbItem = await tx.item.findFirst({
          where: { id: itemId, companyId: req.user.companyId, isActive: true }
        });
        if (!dbItem) {
          throw new Error(`Item with ID ${itemId} not found or is inactive`);
        }

        // Increment branch-specific stock atomically
        await tx.branchStock.upsert({
          where: {
            branchId_itemId: {
              branchId: req.user.branchId,
              itemId
            }
          },
          create: {
            branchId: req.user.branchId,
            itemId,
            stock: qty
          },
          update: {
            stock: { increment: qty }
          }
        });

        // Zero-trust math using DB values (purchasePrice)
        const price = dbItem.purchasePrice;
        const gstPercentage = dbItem.gstPercentage;
        const subtotal = price * qty;
        const gstAmount = Math.round((subtotal * gstPercentage / 100) * 100) / 100;
        const total = Math.round((subtotal + gstAmount) * 100) / 100;

        totalQty += qty;
        grandTotal += total;

        invoiceItemsData.push({
          itemId,
          qty,
          price,
          purchasePrice: price,
          gstPercentage,
          gstAmount,
          total
        });
      }

      grandTotal = Math.round(grandTotal * 100) / 100;

      // 5. Create Invoice Header & Items
      const invoice = await tx.invoice.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          invoiceNo,
          invoiceType: "PURCHASE",
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          vendorId: vendor.id,
          totalItems: invoiceItemsData.length,
          totalQty,
          grandTotal,
          scannedFileUrl: scannedFileUrl || null,
          ocrConfidenceScore: ocrConfidenceScore ? parseInt(ocrConfidenceScore) : null,
          items: {
            create: invoiceItemsData.map(item => ({
              itemId: item.itemId,
              qty: item.qty,
              price: item.price,
              purchasePrice: item.purchasePrice,
              gstPercentage: item.gstPercentage,
              gstAmount: item.gstAmount,
              total: item.total
            }))
          }
        },
        include: {
          vendor: true,
          items: {
            include: {
              item: true
            }
          }
        }
      });

      // 6. Create Stock Movements logs
      for (const item of invoiceItemsData) {
        await tx.stockMovement.create({
          data: {
            companyId: req.user.companyId,
            branchId: req.user.branchId,
            itemId: item.itemId,
            movementType: "IN",
            qty: item.qty,
            reference: `Purchase Invoice ${invoiceNo}`
          }
        });
      }

      // 7. Update Vendor Outstanding Balance (Credit: We owe vendor more money)
      await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          outstandingBalance: { increment: grandTotal }
        }
      });

      // 8. Log Money Transaction
      await tx.financialTransaction.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          vendorId: vendor.id,
          transactionType: "CREDIT",
          amount: grandTotal,
          reference: `Purchase Invoice ${invoiceNo}`
        }
      });

      return invoice;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in createPurchaseInvoice transaction:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Purchase Invoice number already exists for this branch. Please specify a unique invoice number." });
    }
    res.status(400).json({ error: error.message });
  }
};

// ==========================================
// SALES RETURN CONTROLLERS (Sprint 3)
// ==========================================

// Fetch sales returns
export const getSalesReturns = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      returnType: "SALE"
    };
    const include = {
      customer: true,
      items: {
        include: {
          item: true
        }
      }
    };
    const result = await paginate(prisma.return, whereClause, req.query, include, { createdAt: "desc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching sales returns:", error);
    res.status(500).json({ error: "Failed to fetch sales returns" });
  }
};

// Create a Sales Return
export const createSalesReturn = async (req, res) => {
  const { customerId, itemId, qty, invoiceNo, reason, returnDate } = req.body;

  if (!customerId || !itemId || !qty || qty <= 0) {
    return res.status(400).json({ error: "Customer, Item, and valid Quantity are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Company details
      const company = await tx.company.findUnique({
        where: { id: req.user.companyId }
      });
      if (!company) {
        throw new Error("Company not found");
      }

      // Check if Financial Year is locked
      if (company.financialYearLocked && company.currentFinancialYearStart) {
        const retDate = returnDate ? new Date(returnDate) : new Date();
        if (retDate < new Date(company.currentFinancialYearStart)) {
          throw new Error("Transaction blocked: Financial year is locked.");
        }
      }

      // 2. Customer details (must be active)
      const customer = await tx.customer.findFirst({
        where: { id: parseInt(customerId), companyId: req.user.companyId, isActive: true }
      });
      if (!customer) {
        throw new Error("Invalid or inactive customer selected");
      }

      // 3. Item details (must be active)
      const dbItem = await tx.item.findFirst({
        where: { id: parseInt(itemId), companyId: req.user.companyId, isActive: true }
      });
      if (!dbItem) {
        throw new Error("Invalid or inactive item selected");
      }

      // 4. Generate return number (concurrency-safe)
      const seqValue = await getSequenceNextValue(
        req.user.companyId,
        req.user.branchId,
        SEQUENCE_TYPES.SALE_RETURN,
        tx
      );
      const prefix = company.invoicePrefix || "GY-";
      const returnNo = `${prefix}SRT-${String(seqValue).padStart(4, "0")}`;

      // 5. Update Inventory (Sales Return: item returned back into stock)
      await tx.branchStock.upsert({
        where: {
          branchId_itemId: {
            branchId: req.user.branchId,
            itemId: dbItem.id
          }
        },
        create: {
          branchId: req.user.branchId,
          itemId: dbItem.id,
          stock: parseInt(qty)
        },
        update: {
          stock: { increment: parseInt(qty) }
        }
      });

      // 6. Log Stock Movement
      await tx.stockMovement.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          itemId: dbItem.id,
          movementType: "IN",
          qty: parseInt(qty),
          reference: `Sales Return ${returnNo}`
        }
      });

      // 7. Math (Zero-Trust)
      const price = dbItem.salePrice;
      const gstPercentage = dbItem.gstPercentage;
      const subtotal = price * parseInt(qty);
      const gstAmount = Math.round((subtotal * gstPercentage / 100) * 100) / 100;
      const total = Math.round((subtotal + gstAmount) * 100) / 100;

      // 8. Create Return Header & Item
      const salesReturn = await tx.return.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          returnNo,
          returnType: "SALE",
          returnDate: returnDate ? new Date(returnDate) : new Date(),
          invoiceNo,
          customerId: customer.id,
          totalItems: 1,
          totalQty: parseInt(qty),
          grandTotal: total,
          reason,
          items: {
            create: [
              {
                itemId: dbItem.id,
                qty: parseInt(qty),
                price,
                gstPercentage,
                gstAmount,
                total
              }
            ]
          }
        },
        include: {
          customer: true,
          items: {
            include: {
              item: true
            }
          }
        }
      });

      // 9. Decrement Customer Outstanding Balance (Credit: Customer owes us less money now)
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          outstandingBalance: { decrement: total }
        }
      });

      // 10. Log Money Ledger
      await tx.financialTransaction.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          customerId: customer.id,
          transactionType: "CREDIT",
          amount: total,
          reference: `Sales Return ${returnNo}`
        }
      });

      return salesReturn;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in createSalesReturn transaction:", error);
    res.status(400).json({ error: error.message });
  }
};

// ==========================================
// PURCHASE RETURN CONTROLLERS (Sprint 3)
// ==========================================

// Fetch purchase returns
export const getPurchaseReturns = async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      returnType: "PURCHASE"
    };
    const include = {
      vendor: true,
      items: {
        include: {
          item: true
        }
      }
    };
    const result = await paginate(prisma.return, whereClause, req.query, include, { createdAt: "desc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching purchase returns:", error);
    res.status(500).json({ error: "Failed to fetch purchase returns" });
  }
};

// Create a Purchase Return (ACID with stock safety check)
export const createPurchaseReturn = async (req, res) => {
  const { vendorId, itemId, qty, invoiceNo, reason, returnDate } = req.body;

  if (!vendorId || !itemId || !qty || qty <= 0) {
    return res.status(400).json({ error: "Vendor, Item, and valid Quantity are required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Company details
      const company = await tx.company.findUnique({
        where: { id: req.user.companyId }
      });
      if (!company) {
        throw new Error("Company not found");
      }

      // Check if Financial Year is locked
      if (company.financialYearLocked && company.currentFinancialYearStart) {
        const retDate = returnDate ? new Date(returnDate) : new Date();
        if (retDate < new Date(company.currentFinancialYearStart)) {
          throw new Error("Transaction blocked: Financial year is locked.");
        }
      }

      // 2. Vendor details (must be active)
      const vendor = await tx.vendor.findFirst({
        where: { id: parseInt(vendorId), companyId: req.user.companyId, isActive: true }
      });
      if (!vendor) {
        throw new Error("Invalid or inactive vendor selected");
      }

      // 3. Item details (must be active)
      const dbItem = await tx.item.findFirst({
        where: { id: parseInt(itemId), companyId: req.user.companyId, isActive: true }
      });
      if (!dbItem) {
        throw new Error("Invalid or inactive item selected");
      }

      // 4. Generate return number (concurrency-safe)
      const seqValue = await getSequenceNextValue(
        req.user.companyId,
        req.user.branchId,
        SEQUENCE_TYPES.PURCHASE_RETURN,
        tx
      );
      const prefix = company.invoicePrefix || "GY-";
      const returnNo = `${prefix}PRT-${String(seqValue).padStart(4, "0")}`;

      // Ensure BranchStock record exists (concurrency-safe)
      const branchStock = await tx.branchStock.upsert({
        where: {
          branchId_itemId: {
            branchId: req.user.branchId,
            itemId: dbItem.id
          }
        },
        create: {
          branchId: req.user.branchId,
          itemId: dbItem.id,
          stock: 0
        },
        update: {}
      });

      // 5. Update Inventory (Purchase Return: item leaves stock, must verify stock gte qty)
      const updated = await tx.branchStock.updateMany({
        where: {
          itemId: dbItem.id,
          branchId: req.user.branchId,
          stock: { gte: parseInt(qty) }
        },
        data: {
          stock: { decrement: parseInt(qty) }
        }
      });

      if (updated.count === 0) {
        const latestBs = await tx.branchStock.findUnique({
          where: {
            branchId_itemId: {
              branchId: req.user.branchId,
              itemId: dbItem.id
            }
          }
        });
        throw new Error(`Insufficient stock to return ${dbItem.name}. Available: ${latestBs?.stock || 0}, Requested: ${qty}`);
      }

      // Check and log Low Stock Warning inside transaction
      const newStock = branchStock.stock - parseInt(qty);
      if (newStock < dbItem.minStockAlert) {
        await tx.notification.create({
          data: {
            companyId: req.user.companyId,
            message: `Low Stock Warning: Item "${dbItem.name}" has dropped to ${newStock} units (Threshold: ${dbItem.minStockAlert})`
          }
        });
      }

      // 6. Log Stock Movement
      await tx.stockMovement.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          itemId: dbItem.id,
          movementType: "OUT",
          qty: parseInt(qty),
          reference: `Purchase Return ${returnNo}`
        }
      });

      // 7. Math (Zero-Trust)
      const price = dbItem.purchasePrice;
      const gstPercentage = dbItem.gstPercentage;
      const subtotal = price * parseInt(qty);
      const gstAmount = Math.round((subtotal * gstPercentage / 100) * 100) / 100;
      const total = Math.round((subtotal + gstAmount) * 100) / 100;

      // 8. Create Return Header & Item
      const purchaseReturn = await tx.return.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          returnNo,
          returnType: "PURCHASE",
          returnDate: returnDate ? new Date(returnDate) : new Date(),
          invoiceNo,
          vendorId: vendor.id,
          totalItems: 1,
          totalQty: parseInt(qty),
          grandTotal: total,
          reason,
          items: {
            create: [
              {
                itemId: dbItem.id,
                qty: parseInt(qty),
                price,
                gstPercentage,
                gstAmount,
                total
              }
            ]
          }
        },
        include: {
          vendor: true,
          items: {
            include: {
              item: true
            }
          }
        }
      });

      // 9. Decrement Vendor Outstanding Balance (Debit: We owe the vendor less money now)
      await tx.vendor.update({
        where: { id: vendor.id },
        data: {
          outstandingBalance: { decrement: total }
        }
      });

      // 10. Log Money Ledger
      await tx.financialTransaction.create({
        data: {
          companyId: req.user.companyId,
          branchId: req.user.branchId,
          vendorId: vendor.id,
          transactionType: "DEBIT",
          amount: total,
          reference: `Purchase Return ${returnNo}`
        }
      });

      return purchaseReturn;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in createPurchaseReturn transaction:", error);
    res.status(400).json({ error: error.message });
  }
};
