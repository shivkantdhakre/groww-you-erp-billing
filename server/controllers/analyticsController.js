import prisma from "../utils/prisma.js";
import { generatePipelineInsights, GeminiServiceError } from "../utils/geminiService.js";
import { getInsightsCache, setInsightsCache } from "../utils/cacheService.js";

/**
 * GET /api/analytics/sales-insights
 * Fetches or generates live Gemini AI Sales Pipeline Insights from multi-tenant, branch-scoped raw DB data.
 */
export const getSalesInsights = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.user.branchId || null;
    const forceRefresh = req.query.forceRefresh === "true";
    const generateIfMissing = req.query.generate === "true";

    // 1. Check branch-scoped cache unless forced refresh
    if (!forceRefresh) {
      const cachedInsights = getInsightsCache(companyId, branchId);
      if (cachedInsights) {
        return res.json({
          cached: true,
          hasCache: true,
          insights: cachedInsights,
        });
      }

      // If no cache exists and user hasn't explicitly clicked generate (hybrid mode)
      if (!generateIfMissing) {
        return res.json({
          cached: false,
          hasCache: false,
          insights: null,
          message: "No cached insights stored for this scope.",
        });
      }
    }

    // 2. Perform live PostgreSQL aggregations (Tenant & Branch Isolated)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const branchWhere = branchId ? { branchId } : {};

    const [
      branchRecord,
      salesAgg,
      purchaseAgg,
      salesReturnsAgg,
      purchaseReturnsAgg,
      customersCount,
      vendorsCount,
      topCustomersAgg,
      outstandingCustomers,
      itemsWithStock,
      monthlySalesAgg,
      monthlyPurchaseAgg,
      recent30dSalesAgg,
      ordersCount,
      leadsGrouped,
    ] = await Promise.all([
      branchId
        ? prisma.branch.findFirst({ where: { id: branchId, companyId }, select: { name: true } })
        : Promise.resolve(null),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, invoiceType: "SALE" },
      }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, invoiceType: "PURCHASE" },
      }),
      prisma.return.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, returnType: "SALE" },
      }),
      prisma.return.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, returnType: "PURCHASE" },
      }),
      prisma.customer.count({
        where: { companyId, isActive: true },
      }),
      prisma.vendor.count({
        where: { companyId, isActive: true },
      }),
      prisma.invoice.groupBy({
        by: ["customerId"],
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, invoiceType: "SALE", customerId: { not: null } },
        orderBy: { _sum: { grandTotal: "desc" } },
        take: 3,
      }),
      prisma.customer.findMany({
        where: { companyId, isActive: true, outstandingBalance: { gt: 0 } },
        orderBy: { outstandingBalance: "desc" },
        select: { id: true, name: true, outstandingBalance: true },
      }),
      prisma.item.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          openingStock: true,
          minStockAlert: true,
          branchStocks: {
            where: branchId ? { branchId } : {},
            select: { branchId: true, stock: true },
          },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, invoiceType: "SALE", invoiceDate: { gte: startOfMonth } },
      }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, ...branchWhere, invoiceType: "PURCHASE", invoiceDate: { gte: startOfMonth } },
      }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        _count: { id: true },
        where: { companyId, ...branchWhere, invoiceType: "SALE", invoiceDate: { gte: thirtyDaysAgo } },
      }),
      prisma.invoice.count({
        where: { companyId, ...branchWhere, invoiceType: "SALE" },
      }),
      prisma.lead.groupBy({
        by: ["stage"],
        where: { companyId },
        _count: { id: true },
        _sum: { dealValue: true },
      }),
    ]);

    const totalSales = salesAgg._sum.grandTotal || 0;
    const totalPurchases = purchaseAgg._sum.grandTotal || 0;
    const salesReturnsTotal = salesReturnsAgg._sum.grandTotal || 0;
    const purchaseReturnsTotal = purchaseReturnsAgg._sum.grandTotal || 0;
    const totalProfit = (totalSales - salesReturnsTotal) - (totalPurchases - purchaseReturnsTotal);
    const monthlySales = monthlySalesAgg._sum.grandTotal || 0;
    const monthlyPurchases = monthlyPurchaseAgg._sum.grandTotal || 0;
    const recent30dSales = recent30dSalesAgg._sum.grandTotal || 0;
    const recent30dOrdersCount = recent30dSalesAgg._count.id || 0;

    const outstandingAmount = outstandingCustomers.reduce(
      (sum, c) => sum + (c.outstandingBalance || 0),
      0
    );
    const overdueCustomers = outstandingCustomers.slice(0, 5);

    // Resolve names for top 3 billed customers
    const topCustomerIds = topCustomersAgg.map((t) => t.customerId).filter(Boolean);
    const topCustomerRecords = topCustomerIds.length > 0
      ? await prisma.customer.findMany({
          where: { id: { in: topCustomerIds }, companyId },
          select: { id: true, name: true },
        })
      : [];
    const topCustomerNameMap = new Map(topCustomerRecords.map((c) => [c.id, c.name]));

    const topCustomers = topCustomersAgg.map((curr) => {
      const amount = curr._sum.grandTotal || 0;
      return {
        name: topCustomerNameMap.get(curr.customerId) || `Customer #${curr.customerId}`,
        amount,
        sharePct: totalSales > 0 ? Number(((amount / totalSales) * 100).toFixed(1)) : 0,
      };
    });
    const top3Revenue = topCustomers.reduce((acc, c) => acc + c.amount, 0);
    const topCustomerShare = totalSales > 0 ? Number(((top3Revenue / totalSales) * 100).toFixed(1)) : 0;

    // Live stock calculation via BranchStock (matches reportsController semantics)
    const evaluatedStockItems = itemsWithStock.map((item) => {
      const liveStock = branchId
        ? (item.branchStocks.find((b) => b.branchId === branchId)?.stock ?? 0)
        : item.branchStocks.length > 0
          ? item.branchStocks.reduce((sum, b) => sum + b.stock, 0)
          : item.openingStock;
      const threshold = item.minStockAlert > 0 ? item.minStockAlert : 10;
      return {
        name: item.name,
        stock: liveStock,
        isLow: liveStock < threshold,
      };
    });
    const lowStockAll = evaluatedStockItems.filter((i) => i.isLow).sort((a, b) => a.stock - b.stock);
    const lowStockItemsCount = lowStockAll.length;
    const lowStockItems = lowStockAll.slice(0, 8).map(({ name, stock }) => ({ name, stock }));

    // Aggregate CRM Pipeline metrics
    let totalLeads = 0;
    let openLeadsCount = 0;
    let openPipelineValue = 0;
    let wonPipelineValue = 0;
    const stageParts = [];
    for (const row of leadsGrouped) {
      const count = row._count?.id || 0;
      const val = row._sum?.dealValue || 0;
      totalLeads += count;
      if (row.stage === "CLOSED_WON") {
        wonPipelineValue += val;
      } else if (row.stage !== "CLOSED_LOST") {
        openLeadsCount += count;
        openPipelineValue += val;
      }
      stageParts.push(`${row.stage}: ${count} (₹${Number(val).toLocaleString("en-IN")})`);
    }

    const scopeLabel = branchId
      ? `Branch: ${branchRecord?.name || `#${branchId}`}`
      : "Consolidated (All Branches)";

    const metricsSnapshot = {
      scopeLabel,
      branchId,
      totalSales,
      totalPurchases,
      outstandingAmount,
      activeCustomersCount: customersCount,
      totalOrders: ordersCount,
      lowStockItemsCount,
      crmLeadsCount: totalLeads,
      crmOpenPipelineValue: openPipelineValue,
    };

    const metricsPayload = {
      scopeLabel,
      totalSales,
      totalPurchases,
      salesReturnsTotal,
      purchaseReturnsTotal,
      totalProfit,
      outstandingAmount,
      monthlySales,
      monthlyPurchases,
      recent30dSales,
      recent30dOrdersCount,
      activeCustomersCount: customersCount,
      activeVendorsCount: vendorsCount,
      topCustomerShare,
      topCustomers,
      overdueCustomers,
      lowStockItemsCount,
      lowStockItems,
      totalOrders: ordersCount,
      crmPipeline: {
        totalLeads,
        openLeadsCount,
        openPipelineValue,
        wonPipelineValue,
        stageBreakdownText: stageParts.join(", "),
      },
      metricsSnapshot,
    };

    // 3. Generate live AI insights via Gemini Service (throws on AI error, never returns mock)
    const insightsResult = await generatePipelineInsights(metricsPayload);

    // 4. Only cache genuine Gemini AI insights per tenant+branch scope for 1 hour
    if (insightsResult.source === "gemini-ai") {
      setInsightsCache(companyId, insightsResult, { branchId });
      return res.json({
        cached: false,
        hasCache: true,
        insights: getInsightsCache(companyId, branchId),
      });
    }

    return res.json({
      cached: false,
      hasCache: true,
      insights: insightsResult,
    });
  } catch (error) {
    console.error("[AnalyticsController] Error getting sales insights:", error);
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({
        error: error.userMessage,
        message: error.userMessage,
        code: error.code,
      });
    }
    next(error);
  }
};

/**
 * POST /api/analytics/sales-insights/feedback
 * Records user feedback (Thumbs Up / Down) for AI insights.
 */
export const saveInsightsFeedback = async (req, res, next) => {
  try {
    const { helpful, feedbackText } = req.body;
    const companyId = req.user.companyId;

    console.log(`[AnalyticsController] Feedback received for company tenant #${companyId}:`, {
      helpful: Boolean(helpful),
      feedbackText: feedbackText || "No comment",
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: "Thank you for your feedback! It helps improve sales intelligence."
    });
  } catch (error) {
    console.error("[AnalyticsController] Error saving feedback:", error);
    next(error);
  }
};
