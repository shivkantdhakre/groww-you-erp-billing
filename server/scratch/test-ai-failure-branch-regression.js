import dotenv from "dotenv";
dotenv.config();

import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import axios from "axios";
import prisma from "../utils/prisma.js";
import { contextStorage } from "../utils/context.js";
import { verifyTokenAndTenant } from "../middleware/authMiddleware.js";
import {
  generatePipelineInsights,
  analyzeLeadExecutiveSummary,
  GeminiServiceError,
} from "../utils/geminiService.js";
import {
  getInsightsCache,
  setInsightsCache,
  invalidateInsightsCache,
} from "../utils/cacheService.js";
import { getSalesInsights } from "../controllers/analyticsController.js";
import { analyzeLead } from "../controllers/leadController.js";

const basePrisma = new PrismaClient();

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
}

async function runRegressionSuite() {
  console.log("=================================================================");
  console.log("AI PIPELINE FAILURE-PATH & BRANCH-ISOLATION REGRESSION SUITE");
  console.log("=================================================================\n");

  const originalApiKey = process.env.GEMINI_API_KEY;
  let passed = 0;
  let failed = 0;

  let tempCompany = null;
  let tempLead = null;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL: ${name}\n   -> ${err.stack || err.message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Cache Scoping & Granular Branch Invalidation
    // -------------------------------------------------------------------------
    await check("Cache scopes isolate Branch 1, Branch 2, and All Branches cleanly", () => {
      const cid = 99997;
      invalidateInsightsCache(cid);
      setInsightsCache(cid, { source: "gemini-ai", healthScore: 71 }, { branchId: 1 });
      setInsightsCache(cid, { source: "gemini-ai", healthScore: 42 }, { branchId: 2 });
      setInsightsCache(cid, { source: "gemini-ai", healthScore: 60 }, { branchId: null });

      assert.equal(getInsightsCache(cid, 1)?.healthScore, 71);
      assert.equal(getInsightsCache(cid, 2)?.healthScore, 42);
      assert.equal(getInsightsCache(cid, null)?.healthScore, 60);

      // Invalidating Branch 2 clears Branch 2 & All Branches, while leaving Branch 1 intact
      invalidateInsightsCache(cid, 2);
      assert.equal(getInsightsCache(cid, 2), null);
      assert.equal(getInsightsCache(cid, null), null);
      assert.equal(getInsightsCache(cid, 1)?.healthScore, 71);

      // Company-wide invalidation clears remaining Branch 1 scope
      invalidateInsightsCache(cid);
      assert.equal(getInsightsCache(cid, 1), null);
    });

    // -------------------------------------------------------------------------
    // SECTION 2: Failure Paths Reject Strictly Without Heuristic Fallbacks
    // -------------------------------------------------------------------------
    await check("Missing GEMINI_API_KEY throws GeminiServiceError (503) in generatePipelineInsights", async () => {
      delete process.env.GEMINI_API_KEY;
      await assert.rejects(
        () =>
          generatePipelineInsights({
            totalSales: 50000,
            totalPurchases: 20000,
            activeCustomersCount: 5,
            totalOrders: 4,
          }),
        (err) => err instanceof GeminiServiceError && err.code === "GEMINI_UNCONFIGURED" && err.statusCode === 503
      );
    });

    await check("Missing GEMINI_API_KEY throws GeminiServiceError (503) in analyzeLeadExecutiveSummary", async () => {
      delete process.env.GEMINI_API_KEY;
      await assert.rejects(
        () =>
          analyzeLeadExecutiveSummary({
            companyName: "Regression Test Corp",
            stage: "NEGOTIATION",
            dealValue: 250000,
            interactions: [],
          }),
        (err) => err instanceof GeminiServiceError && err.code === "GEMINI_UNCONFIGURED" && err.statusCode === 503
      );
    });

    await check("analyticsController returns HTTP 503 and does not poison cache when GEMINI_API_KEY is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      invalidateInsightsCache(1, 1);
      const req = {
        user: { id: 1, companyId: 1, branchId: 1, role: "SUPER_ADMIN" },
        query: { forceRefresh: "true" },
      };
      const res = createMockRes();
      let nextErr = null;
      await contextStorage.run({ user: req.user }, async () => {
        await getSalesInsights(req, res, (e) => {
          nextErr = e;
        });
      });
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 503);
      assert.equal(res.payload?.code, "GEMINI_UNCONFIGURED");
      assert.equal(getInsightsCache(1, 1), null);
    });

    await check("Invalid GEMINI_API_KEY throws GEMINI_AUTH_ERROR (502) and preserves existing Lead.aiSummary in DB", async () => {
      tempLead = await basePrisma.lead.create({
        data: {
          companyId: 1,
          companyName: "Regression Temp Lead",
          stage: "QUALIFIED",
          dealValue: 500000,
          aiSummary: "ORIGINAL_VERIFIED_SUMMARY",
          aiRiskScore: 30,
          aiPriority: "MEDIUM",
          aiActionType: "CALL",
          aiNextBestAction: "Confirm schedule",
        },
      });

      process.env.GEMINI_API_KEY = "AIzaInvalidRegressionKey000000000000";
      const req = {
        params: { id: String(tempLead.id) },
        user: { id: 1, companyId: 1, role: "SUPER_ADMIN" },
      };
      const res = createMockRes();
      await analyzeLead(req, res);
      assert.equal(res.statusCode, 502);
      assert.equal(res.payload?.code, "GEMINI_AUTH_ERROR");

      const persisted = await basePrisma.lead.findUnique({ where: { id: tempLead.id } });
      assert.equal(persisted?.aiSummary, "ORIGINAL_VERIFIED_SUMMARY");
    });

    // -------------------------------------------------------------------------
    // SECTION 3: Onboarding Guard Never Caches & Empty Tenant Behavior
    // -------------------------------------------------------------------------
    await check("Empty tenant returns onboarding-empty (not heuristic-engine) and skips AI cache", async () => {
      process.env.GEMINI_API_KEY = originalApiKey;
      tempCompany = await basePrisma.company.create({
        data: { name: "Regression Empty Tenant Ltd" },
      });
      const req = {
        user: { id: 9999, companyId: tempCompany.id, branchId: null, role: "SUPER_ADMIN" },
        query: { generate: "true" },
      };
      const res = createMockRes();
      await contextStorage.run({ user: req.user }, async () => {
        await getSalesInsights(req, res, (err) => {
          throw err;
        });
      });
      assert.equal(res.statusCode, 200);
      assert.equal(res.payload?.insights?.source, "onboarding-empty");
      assert.equal(getInsightsCache(tempCompany.id, null), null);
    });

    // -------------------------------------------------------------------------
    // SECTION 4: Middleware & Prisma Branch RLS Enforcement on AI Analytics
    // -------------------------------------------------------------------------
    await check("STAFF role cannot spoof x-branch-id header to access Branch 1 metrics", () => {
      const staffToken = jwt.sign(
        { id: 8888, companyId: 1, role: "STAFF", branchId: 2 },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );
      const fakeReq = {
        headers: {
          authorization: `Bearer ${staffToken}`,
          "x-branch-id": "1",
        },
      };
      const fakeRes = createMockRes();
      let passedMiddleware = false;
      verifyTokenAndTenant(fakeReq, fakeRes, () => {
        passedMiddleware = true;
      });
      assert.equal(passedMiddleware, true);
      assert.equal(fakeReq.user.branchId, 2);
    });

    await check("STAFF without branchId is rejected by Prisma branch isolation RLS (403)", async () => {
      await assert.rejects(
        () =>
          contextStorage.run({ user: { id: 8889, companyId: 1, role: "STAFF", branchId: null } }, () =>
            prisma.invoice.aggregate({ _sum: { grandTotal: true }, where: { companyId: 1 } })
          ),
        (err) => err.status === 403 && err.message.includes("Missing branch context")
      );
    });

    // Live HTTP test against running Express server (Branch 1 vs Branch 2)
    await check("Live Express API isolates Branch 1 vs Branch 2 metrics & live Gemini analysis", async () => {
      process.env.GEMINI_API_KEY = originalApiKey;
      const admin = await basePrisma.user.findFirst({ where: { email: "admin@growwyou.com" } });
      assert.ok(admin, "admin@growwyou.com seed user must exist");
      const token = jwt.sign(
        { id: admin.id, companyId: admin.companyId, role: admin.role, branchId: admin.branchId, name: admin.name },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      const staff2Token = jwt.sign(
        { id: 8888, companyId: 1, role: "STAFF", branchId: 2, name: "Branch 2 Staff" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      const b1 = (
        await axios.get("http://localhost:5000/api/analytics/sales-insights?forceRefresh=true", {
          headers: { Authorization: `Bearer ${token}`, "x-branch-id": "1" },
        })
      ).data;
      assert.equal(b1.insights.source, "gemini-ai");
      assert.equal(b1.insights.metricsSnapshot.branchId, 1);

      const b2SpoofAttempt = (
        await axios.get("http://localhost:5000/api/analytics/sales-insights?forceRefresh=true", {
          headers: { Authorization: `Bearer ${staff2Token}`, "x-branch-id": "1" },
        })
      ).data;
      assert.equal(b2SpoofAttempt.insights.source, "gemini-ai");
      assert.equal(b2SpoofAttempt.insights.metricsSnapshot.branchId, 2);
      assert.equal(b2SpoofAttempt.insights.metricsSnapshot.totalSales, 0);
      assert.equal(b2SpoofAttempt.insights.metricsSnapshot.lowStockItemsCount, 3);
    });
  } finally {
    if (originalApiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (tempLead) {
      await basePrisma.lead.delete({ where: { id: tempLead.id } }).catch(() => {});
    }
    if (tempCompany) {
      await basePrisma.company.delete({ where: { id: tempCompany.id } }).catch(() => {});
    }
    await basePrisma.$disconnect();
    console.log("\n=================================================================");
    console.log(`REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runRegressionSuite();
