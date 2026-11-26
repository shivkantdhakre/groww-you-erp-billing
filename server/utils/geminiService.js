import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const DEFAULT_GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
];

/**
 * Custom error thrown when Gemini AI fails with an actionable status and user-facing message.
 */
export class GeminiServiceError extends Error {
  constructor(message, { code = "GEMINI_EXTRACTION_FAILED", statusCode = 500, userMessage } = {}) {
    super(message);
    this.name = "GeminiServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
  }
}

function getCandidateModels() {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const candidates = configuredModel
    ? [configuredModel, ...DEFAULT_GEMINI_MODELS]
    : DEFAULT_GEMINI_MODELS;
  return [...new Set(candidates)];
}

function parseGeminiJson(responseText) {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Empty response returned by Gemini AI.");
  }
  const cleaned = responseText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

function isAuthError(err) {
  const status = err?.status;
  const msg = String(err?.message || "");
  if (status === 401 || status === 403) return true;
  return status === 400 && /api[_ ]?key|permission|unauthorized/i.test(msg);
}

function isTransientError(err) {
  const status = err?.status;
  const msg = String(err?.message || "");
  if ([429, 502, 503, 504].includes(status)) return true;
  if (err?.name === "GoogleGenerativeAIAbortError" || err?.name === "AbortError") return true;
  return /high demand|rate limit|quota|resource_exhausted|unavailable|timeout|timed out|aborted|fetch failed|econnreset|etimedout|enotfound/i.test(msg);
}

function isModelNotFoundError(err) {
  return err?.status === 404 || /is no longer available|not found|models\//i.test(String(err?.message || ""));
}

/**
 * Invokes Gemini across prioritized active models with timeout and structured JSON parsing.
 */
async function generateStructuredJson({
  apiKey,
  systemInstruction,
  responseSchema,
  contents,
  temperature = 0.2,
  timeoutMs = 20000,
  errorMessages = {},
}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const candidateModels = getCandidateModels();
  let lastError = null;
  let sawTransientError = false;
  let allModelsNotFound = true;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          systemInstruction,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            temperature,
          },
        },
        { timeout: timeoutMs }
      );

      const result = await model.generateContent(contents);
      const data = parseGeminiJson(result.response.text());
      return { data, modelName };
    } catch (err) {
      lastError = err;
      if (isAuthError(err)) {
        throw new GeminiServiceError(err.message || "Gemini AI authentication failed.", {
          code: "GEMINI_AUTH_ERROR",
          statusCode: 502,
          userMessage: "Gemini AI authentication failed. Please verify the server GEMINI_API_KEY.",
        });
      }
      if (!isModelNotFoundError(err)) {
        allModelsNotFound = false;
      }
      if (isTransientError(err)) {
        sawTransientError = true;
      }
      console.warn(`[GeminiService] Model ${modelName} failed: ${err?.message || err}. Trying next candidate model...`);
    }
  }

  if (sawTransientError) {
    throw new GeminiServiceError(lastError?.message || "Gemini AI service temporarily unavailable.", {
      code: "GEMINI_UNAVAILABLE",
      statusCode: 503,
      userMessage: errorMessages.transient || "Gemini AI service is temporarily busy or rate-limited. Please try again in a moment.",
    });
  }

  if (allModelsNotFound) {
    throw new GeminiServiceError(lastError?.message || "Configured Gemini AI models are unavailable.", {
      code: "GEMINI_MODEL_UNAVAILABLE",
      statusCode: 502,
      userMessage: errorMessages.modelUnavailable || "Configured Gemini AI models are unavailable. Please contact an administrator.",
    });
  }

  throw new GeminiServiceError(lastError?.message || "Failed to generate structured data via Gemini AI.", {
    code: "GEMINI_EXTRACTION_FAILED",
    statusCode: 422,
    userMessage: errorMessages.failed || "Failed to generate AI analysis from Gemini AI. Please try again.",
  });
}

function buildValidIsoDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return candidate;
}

function normalizeInvoiceDate(rawDate) {
  if (!rawDate || typeof rawDate !== "string") return null;
  const trimmed = rawDate.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return buildValidIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmyMatch) {
    let day = Number(dmyMatch[1]);
    let month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    return buildValidIsoDate(year, month, day);
  }
  return null;
}

const pipelineInsightsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    healthScore: {
      type: SchemaType.INTEGER,
      description: "An integer between 0 and 100 representing the overall health of the sales pipeline and receivables.",
    },
    headline: {
      type: SchemaType.STRING,
      description: "A single, punchy sentence summarizing the current state of revenue operations.",
    },
    insights: {
      type: SchemaType.ARRAY,
      description: "A list of exactly 3 to 4 data-driven observations about the pipeline.",
      items: {
        type: SchemaType.STRING,
      },
    },
    recommendations: {
      type: SchemaType.ARRAY,
      description: "A list of exactly 3 prioritized, actionable steps to improve revenue or cash flow.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          priority: {
            type: SchemaType.STRING,
            description: "Must be exactly 'HIGH', 'MEDIUM', or 'LOW'.",
          },
          actionText: {
            type: SchemaType.STRING,
            description: "The concrete action to take.",
          },
          suggestedRoute: {
            type: SchemaType.STRING,
            description: "The relative URL route the user should navigate to. Valid app routes are: '/sales-invoice', '/customers', '/inventory', '/outstanding-report', '/sales-report', '/purchase-invoice'. If no route applies, return null.",
            nullable: true,
          }
        },
        required: ["priority", "actionText"]
      },
    },
  },
  required: ["healthScore", "headline", "insights", "recommendations"],
};

const systemInstruction = `You are an expert Revenue Operations & CFO Advisor for Groww You ERP.
Analyze the provided real database aggregations across sales, purchases, returns, receivables, inventory stock levels, and CRM leads.
Strict grounding rules:
1. Base every insight, number, entity name, and recommendation strictly on the metrics and named records supplied in the prompt.
2. NEVER invent percentages, customer counts, product names, or trends not explicitly present in the input.
3. Highlight the exact branch or consolidated scope being analyzed when referencing figures.
4. Valid frontend routes for suggestedRoute are: '/sales-invoice', '/customers', '/inventory', '/outstanding-report', '/sales-report', '/purchase-invoice', '/leads'.`;

/**
 * Formats INR values cleanly for AI prompts.
 */
const formatINR = (val) => `₹${Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Generates AI Sales Pipeline Insights using live Gemini API with strict responseSchema.
 * Throws GeminiServiceError if Gemini is unconfigured or unavailable (never returns mock fallback data).
 * @param {object} metrics
 * @returns {Promise<object>}
 */
export const generatePipelineInsights = async (metrics = {}) => {
  const {
    scopeLabel = "Consolidated (All Branches)",
    totalSales = 0,
    totalPurchases = 0,
    salesReturnsTotal = 0,
    purchaseReturnsTotal = 0,
    totalProfit = 0,
    outstandingAmount = 0,
    monthlySales = 0,
    monthlyPurchases = 0,
    recent30dSales = 0,
    recent30dOrdersCount = 0,
    activeCustomersCount = 0,
    activeVendorsCount = 0,
    topCustomerShare = 0,
    topCustomers = [],
    overdueCustomers = [],
    lowStockItemsCount = 0,
    lowStockItems = [],
    totalOrders = 0,
    crmPipeline = null,
    metricsSnapshot = null,
  } = metrics;

  const crmLeadsCount = crmPipeline?.totalLeads || 0;
  const hasAnyErpActivity =
    totalSales > 0 ||
    totalPurchases > 0 ||
    totalOrders > 0 ||
    activeCustomersCount > 0 ||
    activeVendorsCount > 0 ||
    crmLeadsCount > 0;

  if (!hasAnyErpActivity) {
    return {
      healthScore: 100,
      headline: "Welcome to Groww You ERP! Create your first sales invoice to activate AI pipeline analytics.",
      insights: [
        "No historical sales invoices, purchases, or customer accounts are recorded yet for this scope.",
        "Record customers, inventory, or invoices to unlock live Gemini AI financial diagnostics.",
      ],
      recommendations: [
        {
          priority: "HIGH",
          actionText: "Add your first customer account to begin building your sales pipeline.",
          suggestedRoute: "/customers",
        },
        {
          priority: "HIGH",
          actionText: "Create your first sales invoice to track revenue and receivables.",
          suggestedRoute: "/sales-invoice",
        },
      ],
      source: "onboarding-empty",
      model: null,
      metricsSnapshot: metricsSnapshot || undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiServiceError("GEMINI_API_KEY is missing in server environment.", {
      code: "GEMINI_UNCONFIGURED",
      statusCode: 503,
      userMessage: "GEMINI_API_KEY is not configured on the server. Live Gemini AI pipeline analysis cannot run.",
    });
  }

  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const topCustomersText =
    Array.isArray(topCustomers) && topCustomers.length > 0
      ? topCustomers
          .map((c) => `${c.name}: ${formatINR(c.amount)} (${c.sharePct}% of sales)`)
          .join("; ")
      : "No billed customers in this scope";

  const overdueDebtorsText =
    Array.isArray(overdueCustomers) && overdueCustomers.length > 0
      ? overdueCustomers.map((c) => `${c.name}: ${formatINR(c.outstandingBalance)}`).join("; ")
      : "None";

  const lowStockText =
    Array.isArray(lowStockItems) && lowStockItems.length > 0
      ? lowStockItems.map((i) => `${i.name} (${i.stock} in stock)`).join("; ")
      : "None";

  const crmText = crmPipeline
    ? `Total Leads: ${crmPipeline.totalLeads}, Open Active Deals: ${crmPipeline.openLeadsCount} (Value: ${formatINR(crmPipeline.openPipelineValue)}), Closed Won Value: ${formatINR(crmPipeline.wonPipelineValue)}, Stage Breakdown: ${crmPipeline.stageBreakdownText || "None"}`
    : "No CRM leads data";

  const promptData = `
Analyze the following live PostgreSQL ERP data snapshot (${scopeLabel}, Date: ${new Date().toISOString().split("T")[0]}):
- Analysis Scope: ${scopeLabel}
- Total Sales Volume: ${formatINR(totalSales)} across ${totalOrders} sale invoice(s) (Avg Order Value: ${formatINR(avgOrderValue)})
- Sales Returns Total: ${formatINR(salesReturnsTotal)}
- Total Purchase Expenses: ${formatINR(totalPurchases)} (Purchase Returns: ${formatINR(purchaseReturnsTotal)})
- Net Sales Minus Purchases Spread: ${formatINR(totalProfit)}
- Current Calendar Month Sales / Purchases: ${formatINR(monthlySales)} / ${formatINR(monthlyPurchases)}
- Rolling Last 30 Days Sales: ${formatINR(recent30dSales)} across ${recent30dOrdersCount} order(s)
- Active Customers / Active Vendors in Tenant: ${activeCustomersCount} / ${activeVendorsCount}
- Total Outstanding Customer Receivables (Tenant-wide): ${formatINR(outstandingAmount)}
- Top Overdue Debtors: ${overdueDebtorsText}
- Top ${topCustomers.length || 3} Customer Revenue Concentration in Scope: ${Number(topCustomerShare || 0).toFixed(1)}% (${topCustomersText})
- Low Stock SKUs in Scope (${lowStockItemsCount} total flagged): ${lowStockText}
- CRM Sales Pipeline: ${crmText}
`;

  const { data: parsedJSON, modelName } = await generateStructuredJson({
    apiKey,
    systemInstruction,
    responseSchema: pipelineInsightsSchema,
    contents: promptData,
    temperature: 0.2,
    timeoutMs: 20000,
    errorMessages: {
      transient: "Gemini AI service is temporarily busy or rate-limited while analyzing pipeline data. Please retry shortly.",
      modelUnavailable: "Configured Gemini AI models are unavailable for pipeline insights.",
      failed: "Gemini AI failed to produce valid structured pipeline insights.",
    },
  });

  if (
    !parsedJSON ||
    typeof parsedJSON.headline !== "string" ||
    !Array.isArray(parsedJSON.insights) ||
    parsedJSON.insights.length === 0
  ) {
    throw new GeminiServiceError("Gemini AI returned incomplete pipeline insights structure.", {
      code: "GEMINI_INVALID_OUTPUT",
      statusCode: 502,
      userMessage: "Gemini AI returned an incomplete analysis response. Please refresh to try again.",
    });
  }

  return {
    healthScore: Math.min(100, Math.max(0, Number.isFinite(Number(parsedJSON.healthScore)) ? Math.round(Number(parsedJSON.healthScore)) : 75)),
    headline: parsedJSON.headline.trim(),
    insights: parsedJSON.insights.filter((item) => typeof item === "string" && item.trim()),
    recommendations: Array.isArray(parsedJSON.recommendations) ? parsedJSON.recommendations : [],
    source: "gemini-ai",
    model: modelName,
    metricsSnapshot: metricsSnapshot || undefined,
    generatedAt: new Date().toISOString(),
  };
};

// ==========================================
// AI LEAD EXECUTIVE SUMMARY & RISK PROFILER
// ==========================================

const leadAnalysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    aiSummary: {
      type: SchemaType.STRING,
      description: "A concise 2-3 sentence executive summary of the account status, deal context, and sales momentum."
    },
    aiRiskScore: {
      type: SchemaType.INTEGER,
      description: "Deal Risk Score from 0 to 100 (0-30 = Low risk/High momentum, 31-65 = Medium risk/Stalling, 66-100 = High risk/Likely to churn)."
    },
    aiPriority: {
      type: SchemaType.STRING,
      description: "Must be exactly 'LOW', 'MEDIUM', or 'HIGH'."
    },
    aiActionType: {
      type: SchemaType.STRING,
      description: "Categorize the next best action into exactly one of: 'CALL', 'EMAIL', 'MEETING', 'PROPOSAL', or 'RESEARCH'."
    },
    aiNextBestAction: {
      type: SchemaType.STRING,
      description: "The single most important concrete action for the sales rep to take today."
    }
  },
  required: ["aiSummary", "aiRiskScore", "aiPriority", "aiActionType", "aiNextBestAction"]
};

const leadSystemInstruction = `You are an expert B2B Sales Analyst for Groww You ERP. Review the provided lead metadata, deal value, stage, timestamps, notes, linked ERP customer ledger (if any), and chronological interaction history.
Strict grounding rules:
1. Base every claim strictly on the lead record, dates, notes, customer billing data, and interactions provided. Do NOT fabricate facts or contacts.
2. Provide a concise 2-3 sentence executive summary emphasizing real deal momentum, stakeholder status, and any timeline staleness or stage mismatches (e.g., if interactions suggest deal closed/stalled while stage is unchanged).
3. Calculate a Deal Risk Score from 0 to 100 (0-30 = Low risk/High momentum, 31-65 = Medium risk/Stalling, 66-100 = High risk/Likely to churn). Factor in stage, days elapsed since last update/interaction, and sentiment of notes/interactions.
4. Assign a Priority ('LOW', 'MEDIUM', 'HIGH').
5. Categorize the Next Best Action ('CALL', 'EMAIL', 'MEETING', 'PROPOSAL', 'RESEARCH') and specify one concrete action for the sales rep.`;

/**
 * Generates AI Executive Summary & Risk Profiler for a specific B2B Lead via live Gemini API.
 * Throws GeminiServiceError if Gemini is unconfigured or unavailable (never returns fake fallback text).
 * @param {object} lead
 * @returns {Promise<object>}
 */
export const analyzeLeadExecutiveSummary = async (lead) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiServiceError("GEMINI_API_KEY is missing in server environment.", {
      code: "GEMINI_UNCONFIGURED",
      statusCode: 503,
      userMessage: "GEMINI_API_KEY is not configured on the server. Live Gemini AI lead profiling cannot run.",
    });
  }

  const nowMs = Date.now();
  const updatedMs = lead.updatedAt ? new Date(lead.updatedAt).getTime() : nowMs;
  const daysSinceUpdate = Math.max(0, Math.floor((nowMs - updatedMs) / (1000 * 60 * 60 * 24)));
  const lastInteraction = Array.isArray(lead.interactions) && lead.interactions.length > 0 ? lead.interactions[0] : null;
  const daysSinceLastInteraction = lastInteraction?.date
    ? Math.max(0, Math.floor((nowMs - new Date(lastInteraction.date).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const interactionsText =
    Array.isArray(lead.interactions) && lead.interactions.length > 0
      ? lead.interactions
          .map((item, idx) => {
            const text =
              item.summary && item.summary.length > 500
                ? item.summary.substring(0, 500) + "..."
                : item.summary || "";
            const isoDate = item.date ? new Date(item.date).toISOString().split("T")[0] : "Unknown date";
            return `  ${idx + 1}. [${item.type}] on ${isoDate} by ${item.author || "Rep"}: "${text}"`;
          })
          .join("\n")
      : "  No recorded interactions yet.";

  let linkedCustomerText = "Not linked to an existing billed ERP customer yet.";
  if (lead.customer) {
    const recentInvs = Array.isArray(lead.customer.invoices) && lead.customer.invoices.length > 0
      ? lead.customer.invoices
          .map((inv) => `${inv.invoiceNo} (${formatINR(inv.grandTotal)} on ${new Date(inv.invoiceDate).toISOString().split("T")[0]})`)
          .join(", ")
      : "None";
    linkedCustomerText = `Customer "${lead.customer.name}" | Outstanding Balance: ${formatINR(lead.customer.outstandingBalance)} | Recent Invoices: ${recentInvs}`;
  }

  const promptData = `
Analyze the following live PostgreSQL B2B Lead Context (Today's Date: ${new Date().toISOString().split("T")[0]}):
- Company Name: ${lead.companyName}
- Contact Person: ${lead.contactName || "Not specified"} (${lead.email || "No email"}, ${lead.mobile || "No phone"})
- Current Deal Stage: ${lead.stage}
- Deal Value: ₹${Number(lead.dealValue || 0).toLocaleString("en-IN")}
- Record Created: ${lead.createdAt ? new Date(lead.createdAt).toISOString().split("T")[0] : "Unknown"} | Days Since Last Update: ${daysSinceUpdate} day(s) | Days Since Last Interaction: ${daysSinceLastInteraction !== null ? `${daysSinceLastInteraction} day(s)` : "Never"}
- Linked ERP Customer Ledger: ${linkedCustomerText}
- Internal Notes: ${lead.notes || "No notes entered."}
- Last 20 Interactions (Most Recent First):
${interactionsText}
`;

  const { data: parsedJSON, modelName } = await generateStructuredJson({
    apiKey,
    systemInstruction: leadSystemInstruction,
    responseSchema: leadAnalysisSchema,
    contents: promptData,
    temperature: 0.2,
    timeoutMs: 20000,
    errorMessages: {
      transient: "Gemini AI service is temporarily busy or rate-limited while profiling this lead. Please retry shortly.",
      modelUnavailable: "Configured Gemini AI models are unavailable for lead analysis.",
      failed: "Gemini AI failed to produce a valid structured lead analysis.",
    },
  });

  if (!parsedJSON || typeof parsedJSON.aiSummary !== "string" || !parsedJSON.aiSummary.trim()) {
    throw new GeminiServiceError("Gemini AI returned an empty lead executive summary.", {
      code: "GEMINI_INVALID_OUTPUT",
      statusCode: 502,
      userMessage: "Gemini AI returned an incomplete lead brief. Please try analyzing again.",
    });
  }

  const validPriorities = ["LOW", "MEDIUM", "HIGH"];
  const validActionTypes = ["CALL", "EMAIL", "MEETING", "PROPOSAL", "RESEARCH"];

  const rawPriority = (parsedJSON.aiPriority || "MEDIUM").toUpperCase();
  const rawActionType = (parsedJSON.aiActionType || "CALL").toUpperCase();
  const parsedScore = parseInt(parsedJSON.aiRiskScore, 10);

  return {
    aiSummary: parsedJSON.aiSummary.trim(),
    aiRiskScore: Math.min(100, Math.max(0, Number.isFinite(parsedScore) ? parsedScore : 45)),
    aiPriority: validPriorities.includes(rawPriority) ? rawPriority : "MEDIUM",
    aiActionType: validActionTypes.includes(rawActionType) ? rawActionType : "CALL",
    aiNextBestAction:
      (typeof parsedJSON.aiNextBestAction === "string" && parsedJSON.aiNextBestAction.trim()) ||
      "Reach out to the primary decision maker to confirm next commercial milestones.",
    source: modelName,
  };
};

// ==========================================
// AI MULTIMODAL INVOICE & RECEIPT OCR PARSER
// ==========================================

const invoiceOcrSchema = {
  type: SchemaType.OBJECT,
  properties: {
    vendorName: {
      type: SchemaType.STRING,
      description: "Legal or trade name of the seller/vendor on the invoice.",
      nullable: true
    },
    vendorGstin: {
      type: SchemaType.STRING,
      description: "15-character GSTIN/Tax identification number of the vendor if printed.",
      nullable: true
    },
    vendorAddress: {
      type: SchemaType.STRING,
      description: "Complete postal address of the vendor.",
      nullable: true
    },
    invoiceNo: {
      type: SchemaType.STRING,
      description: "Invoice number or Bill reference number.",
      nullable: true
    },
    invoiceDate: {
      type: SchemaType.STRING,
      description: "Invoice or Bill date formatted strictly as YYYY-MM-DD. Return null if missing or illegible.",
      nullable: true
    },
    taxableAmount: {
      type: SchemaType.NUMBER,
      description: "Subtotal/Taxable amount before taxes.",
      nullable: true
    },
    gstAmount: {
      type: SchemaType.NUMBER,
      description: "Total tax/GST amount.",
      nullable: true
    },
    grandTotal: {
      type: SchemaType.NUMBER,
      description: "Final total bill amount payable.",
      nullable: true
    },
    items: {
      type: SchemaType.ARRAY,
      description: "List of individual purchase line items.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: {
            type: SchemaType.STRING,
            description: "Product/Item name or description."
          },
          qty: {
            type: SchemaType.NUMBER,
            description: "Quantity purchased."
          },
          unitPrice: {
            type: SchemaType.NUMBER,
            description: "Unit price or purchase rate."
          },
          gstPercentage: {
            type: SchemaType.NUMBER,
            description: "GST percentage rate (e.g. 5, 12, 18, 28)."
          },
          lineTotal: {
            type: SchemaType.NUMBER,
            description: "Line item total amount."
          }
        },
        required: ["description", "qty", "unitPrice"]
      }
    },
    confidenceScore: {
      type: SchemaType.INTEGER,
      description: "Overall document parsing confidence score from 0 to 100."
    }
  },
  required: ["items", "confidenceScore"]
};

const invoiceOcrSystemInstruction = `You are a precision financial OCR parser for an enterprise ERP system.
Analyze the provided vendor invoice or receipt image/document.
CRITICAL INSTRUCTIONS:
1. If a field such as invoiceDate, vendorGstin, vendorName, or tax amount is missing, illegible, or not explicitly written on the document, you MUST return null for that field. Do NOT guess, infer, calculate, or hallucinate missing dates or values.
2. Format invoiceDate as YYYY-MM-DD if present.
3. Extract each line item accurately with description, quantity, unit price, and GST percentage.`;

/**
 * Parses uploaded vendor invoice / receipt document buffer using Gemini Multimodal Vision AI.
 * @param {Buffer} fileBuffer 
 * @param {string} mimeType 
 * @returns {Promise<object>}
 */
export const parseInvoiceOCR = async (fileBuffer, mimeType) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new GeminiServiceError("GEMINI_API_KEY is unconfigured in server environment.", {
      code: "GEMINI_UNCONFIGURED",
      statusCode: 503,
      userMessage: "Gemini AI OCR is not configured on the server. Please set GEMINI_API_KEY in the server environment.",
    });
  }

  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new GeminiServiceError("Empty or invalid document buffer provided.", {
      code: "GEMINI_EXTRACTION_FAILED",
      statusCode: 400,
      userMessage: "Uploaded document is empty or unreadable.",
    });
  }

  const rawMimeType = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const normalizedMimeType = rawMimeType === "image/jpg" ? "image/jpeg" : rawMimeType;
  const inlineData = {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: normalizedMimeType,
    },
  };

  const prompt = "Extract structured purchase invoice data from this document strictly adhering to the JSON schema.";
  const { data } = await generateStructuredJson({
    apiKey,
    systemInstruction: invoiceOcrSystemInstruction,
    responseSchema: invoiceOcrSchema,
    contents: [prompt, inlineData],
    temperature: 0.1,
    timeoutMs: 25000,
    errorMessages: {
      transient: "Gemini AI OCR service is temporarily busy or rate-limited. Please try again in a moment.",
      modelUnavailable: "Configured Gemini AI vision models are unavailable. Please contact an administrator.",
      failed: "Failed to extract invoice data using Gemini AI. Please ensure the document is clear and legible.",
    },
  });

  if (!data || typeof data !== "object") {
    throw new GeminiServiceError("Gemini AI returned an unexpected OCR payload.", {
      code: "GEMINI_EXTRACTION_FAILED",
      statusCode: 422,
      userMessage: "Failed to extract invoice data using Gemini AI. Please ensure the document is clear and legible.",
    });
  }

  return {
    ...data,
    invoiceDate: normalizeInvoiceDate(data.invoiceDate),
    items: Array.isArray(data.items) ? data.items : [],
  };
};

