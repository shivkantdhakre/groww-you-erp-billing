import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==========================================
// SALES INVOICE CONTROLLERS
// ==========================================

// Fetch all sales invoices for the tenant
export const getSalesInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: req.user.companyId,
        invoiceType: "SALE"
      },
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.status(200).json(invoices);
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

      // 2. Verify Customer (must be active)
      const customer = await tx.customer.findFirst({
        where: { id: parseInt(customerId), companyId: req.user.companyId, isActive: true }
      });
      if (!customer) {
        throw new Error("Invalid or inactive customer selected");
      }

      // 3. Generate sequential invoice number
      const invoiceCount = await tx.invoice.count({
        where: { companyId: req.user.companyId, invoiceType: "SALE" }
      });
      const prefix = company.invoicePrefix || "GY-";
      const invoiceNo = `${prefix}${String(invoiceCount + 1).padStart(4, "0")}`;

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

        // Concurrency-safe check & decrement
        const updated = await tx.item.updateMany({
          where: {
            id: itemId,
            companyId: req.user.companyId,
            openingStock: { gte: qty }
          },
          data: {
            openingStock: { decrement: qty }
          }
        });

        if (updated.count === 0) {
          throw new Error(`Insufficient stock for item: ${dbItem.name}. Available: ${dbItem.openingStock}, Requested: ${qty}`);
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
          customerId: customer.id,
          transactionType: "DEBIT",
          amount: grandTotal,
          reference: `Sale Invoice ${invoiceNo}`
        }
      });

      return invoice;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in createSalesInvoice transaction:", error);
    res.status(400).json({ error: error.message });
  }
};

// ==========================================
// PURCHASE INVOICE CONTROLLERS
// ==========================================

// Fetch all purchase invoices for the tenant
export const getPurchaseInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: req.user.companyId,
        invoiceType: "PURCHASE"
      },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching purchase invoices:", error);
    res.status(500).json({ error: "Failed to fetch purchase invoices" });
  }
};

// Create an atomic Purchase Invoice
export const createPurchaseInvoice = async (req, res) => {
  const { vendorId, items: clientItems, invoiceDate, invoiceNo: customInvoiceNo } = req.body;

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
        const invoiceCount = await tx.invoice.count({
          where: { companyId: req.user.companyId, invoiceType: "PURCHASE" }
        });
        const prefix = company.invoicePrefix || "GY-";
        invoiceNo = `${prefix}PUR-${String(invoiceCount + 1).padStart(4, "0")}`;
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

        // Increment stock
        await tx.item.update({
          where: { id: itemId },
          data: {
            openingStock: { increment: qty }
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
          invoiceNo,
          invoiceType: "PURCHASE",
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          vendorId: vendor.id,
          totalItems: invoiceItemsData.length,
          totalQty,
          grandTotal,
          items: {
            create: invoiceItemsData.map(item => ({
              itemId: item.itemId,
              qty: item.qty,
              price: item.price,
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
    res.status(400).json({ error: error.message });
  }
};

// ==========================================
// SALES RETURN CONTROLLERS (Sprint 3)
// ==========================================

// Fetch sales returns
export const getSalesReturns = async (req, res) => {
  try {
    const returns = await prisma.return.findMany({
      where: {
        companyId: req.user.companyId,
        returnType: "SALE"
      },
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.status(200).json(returns);
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

      // 4. Generate return number
      const returnCount = await tx.return.count({
        where: { companyId: req.user.companyId, returnType: "SALE" }
      });
      const prefix = company.invoicePrefix || "GY-";
      const returnNo = `${prefix}SRT-${String(returnCount + 1).padStart(4, "0")}`;

      // 5. Update Inventory (Sales Return: item returned back into stock)
      await tx.item.update({
        where: { id: dbItem.id },
        data: {
          openingStock: { increment: parseInt(qty) }
        }
      });

      // 6. Log Stock Movement
      await tx.stockMovement.create({
        data: {
          companyId: req.user.companyId,
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
    const returns = await prisma.return.findMany({
      where: {
        companyId: req.user.companyId,
        returnType: "PURCHASE"
      },
      include: {
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    res.status(200).json(returns);
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

      // 4. Generate return number
      const returnCount = await tx.return.count({
        where: { companyId: req.user.companyId, returnType: "PURCHASE" }
      });
      const prefix = company.invoicePrefix || "GY-";
      const returnNo = `${prefix}PRT-${String(returnCount + 1).padStart(4, "0")}`;

      // 5. Update Inventory (Purchase Return: item leaves stock, must verify stock gte qty)
      const updated = await tx.item.updateMany({
        where: {
          id: dbItem.id,
          companyId: req.user.companyId,
          openingStock: { gte: parseInt(qty) }
        },
        data: {
          openingStock: { decrement: parseInt(qty) }
        }
      });

      if (updated.count === 0) {
        throw new Error(`Insufficient stock to return ${dbItem.name}. Available: ${dbItem.openingStock}, Requested: ${qty}`);
      }

      // 6. Log Stock Movement
      await tx.stockMovement.create({
        data: {
          companyId: req.user.companyId,
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
