import dotenv from 'dotenv';
dotenv.config();

import { generatePipelineInsights } from '../utils/geminiService.js';
import { getInsightsCache, setInsightsCache, invalidateInsightsCache } from '../utils/cacheService.js';
import prisma from '../utils/prisma.js';

async function runAnalyticsTests() {
  console.log('====================================================');
  console.log('RUNNING AI PIPELINE SALES INSIGHTS TEST SUITE');
  console.log('====================================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      testsFailed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Gemini & Heuristic Service Functionality
    // ----------------------------------------------------
    console.log('[TEST 1] Testing generatePipelineInsights schema output...');
    const mockMetrics = {
      totalSales: 150000,
      totalPurchases: 90000,
      totalProfit: 60000,
      outstandingAmount: 45000,
      monthlySales: 50000,
      monthlyPurchases: 30000,
      activeCustomersCount: 12,
      activeVendorsCount: 5,
      topCustomerShare: 42.5,
      lowStockItemsCount: 2,
      totalOrders: 28
    };

    const insightsResult = await generatePipelineInsights(mockMetrics);

    assert(typeof insightsResult.healthScore === 'number', 'healthScore is a number');
    assert(insightsResult.healthScore >= 0 && insightsResult.healthScore <= 100, `healthScore is within 0-100 range (got ${insightsResult.healthScore})`);
    assert(typeof insightsResult.headline === 'string' && insightsResult.headline.length > 0, 'headline is a non-empty string');
    assert(Array.isArray(insightsResult.insights) && insightsResult.insights.length >= 1, `insights is an array with items (count: ${insightsResult.insights.length})`);
    assert(Array.isArray(insightsResult.recommendations) && insightsResult.recommendations.length >= 1, `recommendations is an array with items (count: ${insightsResult.recommendations.length})`);

    const firstRec = insightsResult.recommendations[0];
    assert(firstRec && ['HIGH', 'MEDIUM', 'LOW'].includes(firstRec.priority), `First recommendation priority is valid enum: ${firstRec?.priority}`);
    assert(typeof (firstRec.actionText || firstRec.action) === 'string', 'First recommendation has action text');

    // ----------------------------------------------------
    // TEST 2: Caching Layer & Active Invalidation
    // ----------------------------------------------------
    console.log('\n[TEST 2] Testing Cache Service (TTL & Active Invalidation)...');
    const mockCompanyId = 99999;
    const mockData = { healthScore: 88, headline: 'Test Cache Headline', source: 'unit-test' };

    // Initially should be null
    assert(getInsightsCache(mockCompanyId) === null, 'Cache is initially empty for mock company');

    // Set cache
    setInsightsCache(mockCompanyId, mockData);
    const cached = getInsightsCache(mockCompanyId);
    assert(cached !== null && cached.healthScore === 88, 'Cache successfully retrieved after set');
    assert(cached.cachedAt !== undefined, 'Cache object attaches cachedAt timestamp');

    // Invalidate cache
    invalidateInsightsCache(mockCompanyId);
    assert(getInsightsCache(mockCompanyId) === null, 'Cache is successfully purged on active invalidation');

    // ----------------------------------------------------
    // TEST 3: Database Aggregations for Active Company
    // ----------------------------------------------------
    console.log('\n[TEST 3] Testing Prisma Multi-Tenant Aggregations...');
    const company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('⚠️ No company tenant found in database, skipping DB query aggregation test.');
    } else {
      console.log(`Running database aggregations for company tenant #${company.id} (${company.name})...`);

      const { contextStorage } = await import('../utils/context.js');

      await contextStorage.run({ user: { companyId: company.id, role: 'COMPANY_ADMIN' } }, async () => {
        const [salesAgg, outstandingAgg, customersCount] = await Promise.all([
          prisma.invoice.aggregate({
            _sum: { grandTotal: true },
            where: { companyId: company.id, invoiceType: 'SALE' }
          }),
          prisma.customer.aggregate({
            _sum: { outstandingBalance: true },
            where: { companyId: company.id, isActive: true }
          }),
          prisma.customer.count({
            where: { companyId: company.id, isActive: true }
          })
        ]);

        assert(typeof (salesAgg._sum.grandTotal || 0) === 'number', `Sales volume aggregated successfully: ₹${(salesAgg._sum.grandTotal || 0).toLocaleString()}`);
        assert(typeof (outstandingAgg._sum.outstandingBalance || 0) === 'number', `Outstanding receivables aggregated successfully: ₹${(outstandingAgg._sum.outstandingBalance || 0).toLocaleString()}`);
        assert(typeof customersCount === 'number', `Active customer count: ${customersCount}`);
      });
    }

    // ----------------------------------------------------
    // TEST 4: Empty Tenant Guard (0 sales, 0 customers)
    // ----------------------------------------------------
    console.log('\n[TEST 4] Testing Empty Tenant Guard (0 sales, 0 customers)...');
    const emptyMetrics = {
      totalSales: 0,
      totalPurchases: 0,
      totalProfit: 0,
      outstandingAmount: 0,
      monthlySales: 0,
      monthlyPurchases: 0,
      activeCustomersCount: 0,
      activeVendorsCount: 0,
      topCustomerShare: 0,
      lowStockItemsCount: 0,
      totalOrders: 0
    };

    const emptyInsights = await generatePipelineInsights(emptyMetrics);
    assert(emptyInsights.healthScore === 100, `Empty tenant healthScore defaults to 100 (got ${emptyInsights.healthScore})`);
    assert(emptyInsights.headline.includes('Welcome to Groww You ERP!'), 'Empty tenant receives welcoming onboarding headline');
    assert(emptyInsights.recommendations.some(r => r.suggestedRoute === '/customers'), 'Empty tenant recommendation routes to /customers');
    assert(emptyInsights.recommendations.some(r => r.suggestedRoute === '/sales-invoice'), 'Empty tenant recommendation routes to /sales-invoice');

  } catch (err) {
    console.error('❌ Test suite execution error:', err);
    testsFailed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`TEST RESULTS SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('====================================================');

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runAnalyticsTests();
