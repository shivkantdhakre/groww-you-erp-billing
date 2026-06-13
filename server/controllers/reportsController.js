import prisma from "../utils/prisma.js";

// Helper to get date filters with 30-day bounding default
const parseDateFilter = (fromDate, toDate) => {
  let dateFilter = {};
  if (fromDate || toDate) {
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
  } else {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    dateFilter.gte = thirtyDaysAgo;
  }
  return dateFilter;
};

// Sales Report Endpoint
export const getSalesReport = async (req, res) => {
  const { customerId, fromDate, toDate } = req.query;

  try {
    const dateFilter = parseDateFilter(fromDate, toDate);
    const whereClause = {
      companyId: req.user.companyId,
      invoiceType: "SALE",
      invoiceDate: dateFilter,
    };

    if (customerId) whereClause.customerId = parseInt(customerId);

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
    });

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ error: "Failed to fetch sales report" });
  }
};

// Purchase Report Endpoint
export const getPurchaseReport = async (req, res) => {
  const { vendorId, fromDate, toDate } = req.query;

  try {
    const dateFilter = parseDateFilter(fromDate, toDate);
    const whereClause = {
      companyId: req.user.companyId,
      invoiceType: "PURCHASE",
      invoiceDate: dateFilter,
    };

    if (vendorId) whereClause.vendorId = parseInt(vendorId);

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        vendor: true,
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        invoiceDate: "desc",
      },
    });

    res.status(200).json(invoices);
  } catch (error) {
    console.error("Error fetching purchase report:", error);
    res.status(500).json({ error: "Failed to fetch purchase report" });
  }
};

// Stock Report Endpoint
export const getStockReport = async (req, res) => {
  const { category, itemId, stockStatus } = req.query;

  try {
    const whereClause = {
      companyId: req.user.companyId,
      isActive: true,
    };

    if (category) whereClause.category = category;
    if (itemId) whereClause.id = parseInt(itemId);

    const dbItems = await prisma.item.findMany({
      where: whereClause,
      include: {
        branchStocks: {
          where: req.user.branchId ? { branchId: req.user.branchId } : {}
        }
      },
      orderBy: {
        name: "asc",
      },
    });

    let itemsData = dbItems.map((item) => {
      let currentStock = 0;
      if (req.user.branchId) {
        const bs = item.branchStocks.find((b) => b.branchId === req.user.branchId);
        currentStock = bs ? bs.stock : 0;
      } else {
        currentStock = item.branchStocks.reduce((sum, bs) => sum + bs.stock, 0);
      }

      return {
        id: item.id,
        itemName: item.name,
        category: item.category || "General",
        currentStock: currentStock,
        purchaseRate: item.purchasePrice,
        saleRate: item.salePrice,
      };
    });

    if (stockStatus) {
      if (stockStatus === "Low Stock") {
        itemsData = itemsData.filter((item) => item.currentStock < 10);
      } else if (stockStatus === "In Stock") {
        itemsData = itemsData.filter((item) => item.currentStock >= 10);
      }
    }

    res.status(200).json(itemsData);
  } catch (error) {
    console.error("Error fetching stock report:", error);
    res.status(500).json({ error: "Failed to fetch stock report" });
  }
};

// Outstanding Report Endpoint
export const getOutstandingReport = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        outstandingBalance: { not: 0 },
      },
      select: {
        name: true,
        mobile: true,
        outstandingBalance: true,
      },
    });

    const vendors = await prisma.vendor.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        outstandingBalance: { not: 0 },
      },
      select: {
        name: true,
        mobile: true,
        outstandingBalance: true,
      },
    });

    res.status(200).json({
      customers: customers.map((c) => ({
        name: c.name,
        mobile: c.mobile,
        outstanding: c.outstandingBalance,
      })),
      vendors: vendors.map((v) => ({
        name: v.name,
        mobile: v.mobile,
        outstanding: v.outstandingBalance,
      })),
    });
  } catch (error) {
    console.error("Error fetching outstanding report:", error);
    res.status(500).json({ error: "Failed to fetch outstanding report" });
  }
};

// Customer/Vendor Ledger Endpoint with computed running balance
export const getLedger = async (req, res) => {
  const { customerId, vendorId, fromDate, toDate } = req.query;

  if (!customerId && !vendorId) {
    return res.status(400).json({ error: "Customer ID or Vendor ID is required" });
  }

  try {
    // 30-day default bounds
    let startDate;
    let endDate;
    if (fromDate) startDate = new Date(fromDate);
    if (toDate) {
      endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
    }
    if (!fromDate && !toDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    let openingBalance = 0;
    let partyName = "";

    // 1. Calculate opening balance up to startDate
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: parseInt(customerId), companyId: req.user.companyId },
      });
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      partyName = customer.name;
      openingBalance = customer.openingBalance;

      if (startDate) {
        const prevTxs = await prisma.financialTransaction.findMany({
          where: {
            companyId: req.user.companyId,
            customerId: parseInt(customerId),
            createdAt: { lt: startDate },
          },
        });
        for (const tx of prevTxs) {
          if (tx.transactionType === "DEBIT") {
            openingBalance += tx.amount;
          } else {
            openingBalance -= tx.amount;
          }
        }
      }
    } else if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: parseInt(vendorId), companyId: req.user.companyId },
      });
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      partyName = vendor.name;
      openingBalance = vendor.openingBalance;

      if (startDate) {
        const prevTxs = await prisma.financialTransaction.findMany({
          where: {
            companyId: req.user.companyId,
            vendorId: parseInt(vendorId),
            createdAt: { lt: startDate },
          },
        });
        for (const tx of prevTxs) {
          if (tx.transactionType === "CREDIT") {
            openingBalance += tx.amount;
          } else {
            openingBalance -= tx.amount;
          }
        }
      }
    }

    // 2. Query transactions in current range
    const rangeWhere = {
      companyId: req.user.companyId,
      createdAt: {},
    };
    if (customerId) rangeWhere.customerId = parseInt(customerId);
    if (vendorId) rangeWhere.vendorId = parseInt(vendorId);

    if (startDate) rangeWhere.createdAt.gte = startDate;
    if (endDate) rangeWhere.createdAt.lte = endDate;

    const transactions = await prisma.financialTransaction.findMany({
      where: rangeWhere,
      include: {
        voucher: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 3. Map transactions and build running balance
    let runningBalance = openingBalance;
    const mappedTxs = transactions.map((tx) => {
      let debit = 0;
      let credit = 0;
      if (customerId) {
        if (tx.transactionType === "DEBIT") {
          debit = tx.amount;
          runningBalance += tx.amount;
        } else {
          credit = tx.amount;
          runningBalance -= tx.amount;
        }
      } else {
        if (tx.transactionType === "CREDIT") {
          credit = tx.amount;
          runningBalance += tx.amount;
        } else {
          debit = tx.amount;
          runningBalance -= tx.amount;
        }
      }

      return {
        id: tx.id,
        date: tx.createdAt.toISOString().split("T")[0],
        reference: tx.reference,
        type: tx.voucher ? tx.voucher.type : (tx.reference.toLowerCase().includes("invoice") ? "Invoice" : "Return"),
        debit,
        credit,
        balance: runningBalance,
        isCancelled: tx.voucher ? tx.voucher.isCancelled : false,
      };
    });

    res.status(200).json({
      partyName,
      openingBalance,
      transactions: mappedTxs,
    });
  } catch (error) {
    console.error("Error generating ledger:", error);
    res.status(500).json({ error: "Failed to generate ledger" });
  }
};

// Cash Book Endpoint (Opening balance = 10000)
export const getCashBook = async (req, res) => {
  const { fromDate, toDate } = req.query;

  try {
    const dateFilter = parseDateFilter(fromDate, toDate);

    // 1. Calculate opening cash before filter start
    let openingCash = 10000;
    if (dateFilter.gte) {
      const prevVouchers = await prisma.voucher.findMany({
        where: {
          companyId: req.user.companyId,
          voucherDate: { lt: dateFilter.gte },
          isCancelled: false,
          OR: [
            { paymentMode: "Cash" },
            { debitAccount: "Cash" },
            { creditAccount: "Cash" },
          ],
        },
      });
      for (const v of prevVouchers) {
        if (v.type === "RECEIPT") {
          openingCash += v.amount;
        } else if (v.type === "PAYMENT") {
          openingCash -= v.amount;
        } else if (v.type === "CONTRA") {
          if (v.creditAccount === "Cash") {
            openingCash -= v.amount;
          } else if (v.debitAccount === "Cash") {
            openingCash += v.amount;
          }
        }
      }
    }

    // 2. Fetch Cash Vouchers in range
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId: req.user.companyId,
        voucherDate: dateFilter,
        isCancelled: false,
        OR: [
          { paymentMode: "Cash" },
          { debitAccount: "Cash" },
          { creditAccount: "Cash" },
        ],
      },
      include: {
        customer: true,
        vendor: true,
      },
      orderBy: {
        voucherDate: "asc",
      },
    });

    // 3. Map into Cash Book table structure
    let runningBalance = openingCash;
    const cashEntries = vouchers.map((v) => {
      let receipt = 0;
      let payment = 0;
      let particulars = "";

      if (v.type === "RECEIPT") {
        particulars = v.customer ? `Receipt - ${v.customer.name}` : "Cash Receipt";
        receipt = v.amount;
        runningBalance += v.amount;
      } else if (v.type === "PAYMENT") {
        particulars = v.vendor ? `Payment - ${v.vendor.name}` : "Cash Payment";
        payment = v.amount;
        runningBalance -= v.amount;
      } else if (v.type === "CONTRA") {
        if (v.creditAccount === "Cash") {
          particulars = `Deposit to ${v.debitAccount}`;
          payment = v.amount;
          runningBalance -= v.amount;
        } else {
          particulars = `Withdraw from ${v.creditAccount}`;
          receipt = v.amount;
          runningBalance += v.amount;
        }
      }

      return {
        date: v.voucherDate.toISOString().split("T")[0],
        voucherNo: v.voucherNo,
        particulars,
        receipt,
        payment,
        balance: runningBalance,
      };
    });

    res.status(200).json({
      openingCash,
      cashEntries,
    });
  } catch (error) {
    console.error("Error fetching cash book:", error);
    res.status(500).json({ error: "Failed to fetch cash book" });
  }
};

// Bank Book Endpoint (Opening balance = 50000)
export const getBankBook = async (req, res) => {
  const { fromDate, toDate } = req.query;

  try {
    const dateFilter = parseDateFilter(fromDate, toDate);

    // 1. Calculate opening bank before filter start
    let openingBank = 50000;
    if (dateFilter.gte) {
      const prevVouchers = await prisma.voucher.findMany({
        where: {
          companyId: req.user.companyId,
          voucherDate: { lt: dateFilter.gte },
          isCancelled: false,
          OR: [
            { paymentMode: "Bank" },
            { paymentMode: "UPI" },
            { debitAccount: { not: "Cash", not: null } },
            { creditAccount: { not: "Cash", not: null } },
          ],
        },
      });
      for (const v of prevVouchers) {
        if (v.type === "RECEIPT" && (v.paymentMode === "Bank" || v.paymentMode === "UPI")) {
          openingBank += v.amount;
        } else if (v.type === "PAYMENT" && (v.paymentMode === "Bank" || v.paymentMode === "UPI")) {
          openingBank -= v.amount;
        } else if (v.type === "CONTRA") {
          if (v.creditAccount && v.creditAccount !== "Cash") {
            openingBank -= v.amount;
          }
          if (v.debitAccount && v.debitAccount !== "Cash") {
            openingBank += v.amount;
          }
        }
      }
    }

    // 2. Fetch Bank Vouchers in range
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId: req.user.companyId,
        voucherDate: dateFilter,
        isCancelled: false,
        OR: [
          { paymentMode: "Bank" },
          { paymentMode: "UPI" },
          { debitAccount: { not: "Cash", not: null } },
          { creditAccount: { not: "Cash", not: null } },
        ],
      },
      include: {
        customer: true,
        vendor: true,
      },
      orderBy: {
        voucherDate: "asc",
      },
    });

    // 3. Map into Bank Book table structure
    let runningBalance = openingBank;
    const bankEntries = vouchers.map((v) => {
      let receipt = 0;
      let payment = 0;
      let particulars = "";

      if (v.type === "RECEIPT") {
        particulars = v.customer ? `Receipt - ${v.customer.name}` : `Bank Receipt (${v.paymentMode})`;
        receipt = v.amount;
        runningBalance += v.amount;
      } else if (v.type === "PAYMENT") {
        particulars = v.vendor ? `Payment - ${v.vendor.name}` : `Bank Payment (${v.paymentMode})`;
        payment = v.amount;
        runningBalance -= v.amount;
      } else if (v.type === "CONTRA") {
        if (v.creditAccount && v.creditAccount !== "Cash") {
          particulars = `Transfer to ${v.debitAccount}`;
          payment = v.amount;
          runningBalance -= v.amount;
        } else if (v.debitAccount && v.debitAccount !== "Cash") {
          particulars = `Deposit from ${v.creditAccount}`;
          receipt = v.amount;
          runningBalance += v.amount;
        }
      }

      return {
        date: v.voucherDate.toISOString().split("T")[0],
        voucherNo: v.voucherNo,
        particulars,
        receipt,
        payment,
        balance: runningBalance,
      };
    });

    res.status(200).json({
      openingBank,
      bankEntries,
    });
  } catch (error) {
    console.error("Error fetching bank book:", error);
    res.status(500).json({ error: "Failed to fetch bank book" });
  }
};

// Day Book Endpoint
export const getDayBook = async (req, res) => {
  const { fromDate, toDate } = req.query;

  try {
    const dateFilter = parseDateFilter(fromDate, toDate);

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: req.user.companyId,
        invoiceDate: dateFilter,
      },
      include: { customer: true, vendor: true },
    });

    const returns = await prisma.return.findMany({
      where: {
        companyId: req.user.companyId,
        returnDate: dateFilter,
      },
      include: { customer: true, vendor: true },
    });

    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId: req.user.companyId,
        voucherDate: dateFilter,
      },
      include: { customer: true, vendor: true },
    });

    const dayBookEntries = [];

    for (const inv of invoices) {
      dayBookEntries.push({
        date: inv.invoiceDate.toISOString().split("T")[0],
        voucherNo: inv.invoiceNo,
        particulars: inv.invoiceType === "SALE" ? `Sale - ${inv.customer?.name || "Customer"}` : `Purchase - ${inv.vendor?.name || "Vendor"}`,
        type: inv.invoiceType === "SALE" ? "Sales" : "Purchase",
        debit: inv.invoiceType === "SALE" ? inv.grandTotal : 0,
        credit: inv.invoiceType === "PURCHASE" ? inv.grandTotal : 0,
        createdAt: inv.createdAt,
      });
    }

    for (const ret of returns) {
      dayBookEntries.push({
        date: ret.returnDate.toISOString().split("T")[0],
        voucherNo: ret.returnNo,
        particulars: ret.returnType === "SALE" ? `Sales Return - ${ret.customer?.name || "Customer"}` : `Purchase Return - ${ret.vendor?.name || "Vendor"}`,
        type: ret.returnType === "SALE" ? "Sales Return" : "Purchase Return",
        debit: ret.returnType === "PURCHASE" ? ret.grandTotal : 0,
        credit: ret.returnType === "SALE" ? ret.grandTotal : 0,
        createdAt: ret.createdAt,
      });
    }

    for (const v of vouchers) {
      let debit = 0;
      let credit = 0;
      let particulars = "";

      if (v.type === "RECEIPT") {
        particulars = `Receipt - ${v.customer?.name || "Customer"}`;
        credit = v.amount;
      } else if (v.type === "PAYMENT") {
        particulars = `Payment - ${v.vendor?.name || "Vendor"}`;
        debit = v.amount;
      } else if (v.type === "CONTRA") {
        particulars = `Contra: ${v.creditAccount} -> ${v.debitAccount}`;
        debit = v.amount;
      } else if (v.type === "JOURNAL") {
        particulars = `Journal: Debit ${v.debitAccount} / Credit ${v.creditAccount}`;
        debit = v.amount;
      }

      dayBookEntries.push({
        date: v.voucherDate.toISOString().split("T")[0],
        voucherNo: v.voucherNo,
        particulars,
        type: v.type,
        debit,
        credit,
        createdAt: v.createdAt,
        isCancelled: v.isCancelled,
      });
    }

    dayBookEntries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.status(200).json(dayBookEntries);
  } catch (error) {
    console.error("Error fetching day book:", error);
    res.status(500).json({ error: "Failed to fetch day book" });
  }
};

// Summary / Dashboard stats endpoint (fully functional with concurrent Promise.all)
export const getSummary = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      salesSum,
      purchaseSum,
      activeCustomersCount,
      activeVendorsCount,
      itemsList,
      recentCustomers,
      recentVendors,
      recentInvoices,
      topCustTx,
      topVendTx,
      todaySalesSum,
      todayPurchaseSum,
      todayInvoiceCount,
      monthlySalesSum,
      monthlyPurchaseSum,
      customerOutstandingSum,
    ] = await Promise.all([
      // Total Sales / Purchases
      prisma.invoice.aggregate({
        where: { companyId: req.user.companyId, invoiceType: "SALE" },
        _sum: { grandTotal: true },
      }),
      prisma.invoice.aggregate({
        where: { companyId: req.user.companyId, invoiceType: "PURCHASE" },
        _sum: { grandTotal: true },
      }),
      // Counts
      prisma.customer.count({
        where: { companyId: req.user.companyId, isActive: true },
      }),
      prisma.vendor.count({
        where: { companyId: req.user.companyId, isActive: true },
      }),
      // Items for low stock check
      prisma.item.findMany({
        where: { companyId: req.user.companyId, isActive: true },
        select: { id: true, name: true, openingStock: true, minStockAlert: true, branchStocks: true },
      }),
      // Recent Activities queries
      prisma.customer.findMany({
        where: { companyId: req.user.companyId, isActive: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prisma.vendor.findMany({
        where: { companyId: req.user.companyId, isActive: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.findMany({
        where: { companyId: req.user.companyId },
        take: 3,
        orderBy: { createdAt: "desc" },
      }),
      // Top Customers Group By DEBIT
      prisma.financialTransaction.groupBy({
        by: ['customerId'],
        where: {
          companyId: req.user.companyId,
          transactionType: "DEBIT",
          customerId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
      }),
      // Top Vendors Group By CREDIT
      prisma.financialTransaction.groupBy({
        by: ['vendorId'],
        where: {
          companyId: req.user.companyId,
          transactionType: "CREDIT",
          vendorId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5
      }),
      // Today's Stats
      prisma.invoice.aggregate({
        where: { companyId: req.user.companyId, invoiceType: "SALE", invoiceDate: { gte: todayStart, lte: todayEnd } },
        _sum: { grandTotal: true }
      }),
      prisma.invoice.aggregate({
        where: { companyId: req.user.companyId, invoiceType: "PURCHASE", invoiceDate: { gte: todayStart, lte: todayEnd } },
        _sum: { grandTotal: true }
      }),
      prisma.invoice.count({
        where: { companyId: req.user.companyId, invoiceDate: { gte: todayStart, lte: todayEnd } }
      }),
      // Monthly Stats
      prisma.invoice.aggregate({
        where: { companyId: req.user.companyId, invoiceType: "SALE", invoiceDate: { gte: monthStart } },
        _sum: { grandTotal: true }
      }),
      prisma.invoice.aggregate({
        where: { companyId: req.user.companyId, invoiceType: "PURCHASE", invoiceDate: { gte: monthStart } },
        _sum: { grandTotal: true }
      }),
      // Outstanding Sum
      prisma.customer.aggregate({
        where: { companyId: req.user.companyId, isActive: true },
        _sum: { outstandingBalance: true }
      })
    ]);

    // Fetch matching names for top customers/vendors
    const customerIds = topCustTx.map(tx => tx.customerId);
    const vendorIds = topVendTx.map(tx => tx.vendorId);

    const [topDbCustomers, topDbVendors] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: customerIds } } }),
      prisma.vendor.findMany({ where: { id: { in: vendorIds } } })
    ]);

    const topCustomers = topCustTx.map(tx => {
      const cust = topDbCustomers.find(c => c.id === tx.customerId);
      return { name: cust ? cust.name : `Customer ID ${tx.customerId}`, amount: tx._sum.amount || 0 };
    });

    const topVendors = topVendTx.map(tx => {
      const vend = topDbVendors.find(v => v.id === tx.vendorId);
      return { name: vend ? vend.name : `Vendor ID ${tx.vendorId}`, amount: tx._sum.amount || 0 };
    });

    // Low stock items filtering
    const lowStockItems = itemsList
      .map(i => {
        const liveStock = i.branchStocks && i.branchStocks.length > 0
          ? i.branchStocks.reduce((sum, bs) => sum + bs.stock, 0)
          : i.openingStock;
        return { name: i.name, stock: liveStock, minStockAlert: i.minStockAlert };
      })
      .filter(i => i.stock < (i.minStockAlert ?? 10))
      .map(i => ({ name: i.name, stock: i.stock }));

    const lowStockItemsCount = lowStockItems.length;

    // Recent activities formatting
    const activities = [];
    recentCustomers.forEach(c => {
      activities.push({
        id: `c_${c.id}`,
        action: "Customer Added",
        name: c.name,
        createdAt: c.createdAt
      });
    });
    recentVendors.forEach(v => {
      activities.push({
        id: `v_${v.id}`,
        action: "Vendor Added",
        name: v.name,
        createdAt: v.createdAt
      });
    });
    recentInvoices.forEach(i => {
      activities.push({
        id: `i_${i.id}`,
        action: i.invoiceType === "SALE" ? "Sales Invoice" : "Purchase Entry",
        name: `Invoice ${i.invoiceNo}`,
        createdAt: i.createdAt
      });
    });
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentActivities = activities.slice(0, 5);

    res.status(200).json({
      totalSales: salesSum._sum.grandTotal || 0,
      totalPurchases: purchaseSum._sum.grandTotal || 0,
      totalProfit: (salesSum._sum.grandTotal || 0) - (purchaseSum._sum.grandTotal || 0),
      activeCustomersCount,
      activeVendorsCount,
      lowStockItemsCount,
      lowStockItems,
      recentActivities,
      topCustomers,
      topVendors,
      todayStats: {
        sales: todaySalesSum._sum.grandTotal || 0,
        purchase: todayPurchaseSum._sum.grandTotal || 0,
        orders: todayInvoiceCount
      },
      monthlyStats: {
        sales: monthlySalesSum._sum.grandTotal || 0,
        purchase: monthlyPurchaseSum._sum.grandTotal || 0,
        outstanding: customerOutstandingSum._sum.outstandingBalance || 0
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
};
