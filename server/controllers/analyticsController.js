import prisma from "../utils/prisma.js";
import { generatePipelineInsights } from "../utils/geminiService.js";
import { getInsightsCache, setInsightsCache } from "../utils/cacheService.js";

/**
 * GET /api/analytics/sales-insights
 * Fetches or generates AI Sales Pipeline Insights with multi-tenant database aggregations.
 */
export const getSalesInsights = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const forceRefresh = req.query.forceRefresh === "true";
    const generateIfMissing = req.query.generate === "true";

    // 1. Check cache unless forced refresh
    if (!forceRefresh) {
      const cachedInsights = getInsightsCache(companyId);
      if (cachedInsights) {
        return res.json({
          cached: true,
          hasCache: true,
          insights: cachedInsights
        });
      }

      // If no cache exists and user hasn't explicitly clicked generate (hybrid mode)
      if (!generateIfMissing) {
        return res.json({
          cached: false,
          hasCache: false,
          insights: null,
          message: "No cached insights stored for this tenant."
        });
      }
    }

    // 2. Perform strictly aggregated database queries (Tenant Isolated)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      salesAgg,
      purchaseAgg,
      customersCount,
      vendorsCount,
      topCustomersAgg,
      outstandingAgg,
      lowStockItemsCount,
      monthlySalesAgg,
      monthlyPurchaseAgg,
      ordersCount
    ] = await Promise.all([
      // Total Sales Volume
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, invoiceType: "SALE" }
      }),
      // Total Purchase Expenses
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, invoiceType: "PURCHASE" }
      }),
      // Active Customers Count
      prisma.customer.count({
        where: { companyId, isActive: true }
      }),
      // Active Vendors Count
      prisma.vendor.count({
        where: { companyId, isActive: true }
      }),
      // Top 3 Customer Revenue (for Concentration calculation)
      prisma.invoice.groupBy({
        by: ["customerId"],
        _sum: { grandTotal: true },
        where: { companyId, invoiceType: "SALE", customerId: { not: null } },
        orderBy: { _sum: { grandTotal: "desc" } },
        take: 3
      }),
      // Total Outstanding Receivables
      prisma.customer.aggregate({
        _sum: { outstandingBalance: true },
        where: { companyId, isActive: true }
      }),
      // Low Stock Alert Count
      prisma.item.count({
        where: { companyId, isActive: true, openingStock: { lte: 10 } }
      }),
      // Monthly Sales
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, invoiceType: "SALE", invoiceDate: { gte: startOfMonth } }
      }),
      // Monthly Purchase
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: { companyId, invoiceType: "PURCHASE", invoiceDate: { gte: startOfMonth } }
      }),
      // Total Sales Orders Count
      prisma.invoice.count({
        where: { companyId, invoiceType: "SALE" }
      })
    ]);

    const totalSales = salesAgg._sum.grandTotal || 0;
    const totalPurchases = purchaseAgg._sum.grandTotal || 0;
    const totalProfit = totalSales - totalPurchases;
    const outstandingAmount = outstandingAgg._sum.outstandingBalance || 0;
    const monthlySales = monthlySalesAgg._sum.grandTotal || 0;
    const monthlyPurchases = monthlyPurchaseAgg._sum.grandTotal || 0;

    // Calculate Top Customer Share %
    const top3Revenue = topCustomersAgg.reduce((acc, curr) => acc + (curr._sum.grandTotal || 0), 0);
    const topCustomerShare = totalSales > 0 ? (top3Revenue / totalSales) * 100 : 0;

    const metricsPayload = {
      totalSales,
      totalPurchases,
      totalProfit,
      outstandingAmount,
      monthlySales,
      monthlyPurchases,
      activeCustomersCount: customersCount,
      activeVendorsCount: vendorsCount,
      topCustomerShare,
      lowStockItemsCount,
      totalOrders: ordersCount
    };

    // 3. Generate AI insights via Gemini Service
    const insightsResult = await generatePipelineInsights(metricsPayload);

    // 4. Cache the results for 1 hour
    setInsightsCache(companyId, insightsResult);

    return res.json({
      cached: false,
      hasCache: true,
      insights: getInsightsCache(companyId) // Return stored format with timestamp
    });
  } catch (error) {
    console.error("[AnalyticsController] Error getting sales insights:", error);
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
