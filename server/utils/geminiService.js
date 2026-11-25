import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const DEFAULT_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
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
      userMessage: "Gemini AI OCR service is temporarily busy or rate-limited. Please try again in a moment.",
    });
  }

  if (allModelsNotFound) {
    throw new GeminiServiceError(lastError?.message || "Configured Gemini AI models are unavailable.", {
      code: "GEMINI_MODEL_UNAVAILABLE",
      statusCode: 502,
      userMessage: "Configured Gemini AI vision models are unavailable. Please contact an administrator.",
    });
  }

  throw new GeminiServiceError(lastError?.message || "Failed to extract structured data via Gemini AI.", {
    code: "GEMINI_EXTRACTION_FAILED",
    statusCode: 422,
    userMessage: "Failed to extract invoice data using Gemini AI. Please ensure the document is clear and legible.",
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

const systemInstruction = `You are an expert Revenue Operations Advisor for an ERP system. 
Analyze the provided financial and pipeline data. 
Focus strictly on cash flow health, outstanding receivables, customer concentration, and sales velocity. 
Do not provide generic advice; base all insights strictly on the numbers provided. 
Provide recommendations that are immediately actionable.
Valid frontend routes for suggestedRoute are: '/sales-invoice', '/customers', '/inventory', '/outstanding-report', '/sales-report', '/purchase-invoice'.`;

/**
 * Generates AI Sales Pipeline Insights using Gemini API with strict responseSchema.
 * @param {object} metrics 
 * @returns {Promise<object>}
 */
export const generatePipelineInsights = async (metrics) => {
  if ((metrics?.totalSales || 0) === 0 && (metrics?.activeCustomersCount || 0) === 0) {
    return generateHeuristicFallback(metrics || {});
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[GeminiService] GEMINI_API_KEY missing. Generating heuristic fallback pipeline insights.");
    return generateHeuristicFallback(metrics);
  }

  try {
    const promptData = `
Analyze the following pipeline & financial metrics for this enterprise tenant:
- Total Pipeline Value (Total Sales Volume): ₹${metrics.totalSales?.toLocaleString() || 0}
- Total Outstanding Receivables (Unpaid Customer Invoices): ₹${metrics.outstandingAmount?.toLocaleString() || 0}
- Total Purchase Expenses: ₹${metrics.totalPurchases?.toLocaleString() || 0}
- Net Profitability: ₹${metrics.totalProfit?.toLocaleString() || 0}
- Monthly Sales: ₹${metrics.monthlySales?.toLocaleString() || 0}
- Monthly Purchases: ₹${metrics.monthlyPurchases?.toLocaleString() || 0}
- Active Customer Count: ${metrics.activeCustomersCount || 0}
- Top Customer Concentration: ${metrics.topCustomerShare || 0}% of total sales generated by top 3 customers.
- Total Orders Processed: ${metrics.totalOrders || 0}
- Low Stock Items Alert Count: ${metrics.lowStockItemsCount || 0}
`;

    const { data: parsedJSON } = await generateStructuredJson({
      apiKey,
      systemInstruction,
      responseSchema: pipelineInsightsSchema,
      contents: promptData,
      temperature: 0.2,
      timeoutMs: 15000,
    });

    return {
      healthScore: Math.min(100, Math.max(0, parsedJSON.healthScore || 75)),
      headline: parsedJSON.headline || "Revenue Pipeline Analysis Complete",
      insights: Array.isArray(parsedJSON.insights) ? parsedJSON.insights : [],
      recommendations: Array.isArray(parsedJSON.recommendations) ? parsedJSON.recommendations : [],
      source: "gemini-ai",
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("[GeminiService] Error calling Gemini API:", error?.message || error);
    return generateHeuristicFallback(metrics);
  }
};

/**
 * Fallback generator when Gemini API is unconfigured, rate limited, or model unavailable.
 * Ensures 100% uptime with intelligent rule-based metrics analysis.
 */
function generateHeuristicFallback(metrics) {
  const {
    totalSales = 0,
    outstandingAmount = 0,
    activeCustomersCount = 0,
    topCustomerShare = 0,
    lowStockItemsCount = 0
  } = metrics;

  // Zero-data empty tenant guard
  if (totalSales === 0 && activeCustomersCount === 0) {
    return {
      healthScore: 100,
      headline: "Welcome to Groww You ERP! Create your first sales invoice to activate AI pipeline analytics.",
      insights: [
        "No historical sales invoices or customer transactions recorded yet.",
        "System is initialized and ready to track real-time sales velocity and cashflow."
      ],
      recommendations: [
        {
          priority: "HIGH",
          actionText: "Add your first customer account to begin building your sales pipeline.",
          suggestedRoute: "/customers"
        },
        {
          priority: "HIGH",
          actionText: "Create your first sales invoice to track revenue and receivables.",
          suggestedRoute: "/sales-invoice"
        }
      ],
      source: "heuristic-engine",
      generatedAt: new Date().toISOString()
    };
  }

  let score = 85;
  const insights = [];
  const recommendations = [];

  // Evaluate Receivables Risk
  if (totalSales > 0 && (outstandingAmount / totalSales) > 0.3) {
    score -= 20;
    insights.push(`Outstanding receivables represent ${((outstandingAmount / totalSales) * 100).toFixed(1)}% of total sales revenue.`);
    recommendations.push({
      priority: "HIGH",
      actionText: `Follow up on outstanding customer payments totaling ₹${outstandingAmount.toLocaleString()}.`,
      suggestedRoute: "/outstanding-report"
    });
  } else {
    insights.push(`Receivables are well controlled at ₹${outstandingAmount.toLocaleString()} relative to overall revenue.`);
  }

  // Customer Concentration
  if (topCustomerShare > 40) {
    score -= 15;
    insights.push(`High customer concentration: top key accounts represent ${topCustomerShare.toFixed(1)}% of overall sales volume.`);
    recommendations.push({
      priority: "MEDIUM",
      actionText: "Diversify lead pipeline to mitigate revenue reliance on top customer accounts.",
      suggestedRoute: "/customers"
    });
  } else {
    insights.push(`Customer distribution is healthy across ${activeCustomersCount} active accounts.`);
  }

  // Stock Risk
  if (lowStockItemsCount > 0) {
    score -= 10;
    insights.push(`${lowStockItemsCount} products are currently below minimum stock threshold, risking order fulfillment bottlenecks.`);
    recommendations.push({
      priority: "HIGH",
      actionText: `Reorder low-stock items to prevent delivery delays.`,
      suggestedRoute: "/inventory"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "LOW",
      actionText: "Maintain current sales velocity and monitor weekly cash collections.",
      suggestedRoute: "/sales-invoice"
    });
  }

  score = Math.max(10, Math.min(100, score));

  return {
    healthScore: score,
    headline: score >= 80 ? "Robust Pipeline Health & Strong Cash Collection" : score >= 50 ? "Moderate Pipeline Velocity with Actionable Bottlenecks" : "Attention Required: High Outstanding Receivables & Inventory Bottlenecks",
    insights,
    recommendations,
    source: "heuristic-engine",
    generatedAt: new Date().toISOString()
  };
}

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

const leadSystemInstruction = `You are an expert B2B Sales Analyst for an enterprise ERP system. Review the provided lead metadata, deal value, stage, notes, and recent interaction history.
1. Provide a concise 2-3 sentence executive summary emphasizing deal momentum, key decision-maker context, and primary blockers.
2. Calculate a Deal Risk Score from 0 to 100. (0-30 = Low risk/High momentum, 31-65 = Medium risk/Stalling, 66-100 = High risk/Likely to churn). Factor in the deal stage, time elapsed since last interaction, and sentiment of notes/interactions.
3. Assign a Priority ('LOW', 'MEDIUM', 'HIGH').
4. Categorize the Next Best Action ('CALL', 'EMAIL', 'MEETING', 'PROPOSAL', 'RESEARCH') and specify the exact action text for the sales rep.`;

/**
 * Generates AI Executive Summary & Risk Profiler for a specific B2B Lead.
 * @param {object} lead 
 * @returns {Promise<object>}
 */
export const analyzeLeadExecutiveSummary = async (lead) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[GeminiService] GEMINI_API_KEY missing. Generating heuristic fallback for lead analysis.");
    return generateLeadHeuristicFallback(lead);
  }

  try {
    const interactionsText = Array.isArray(lead.interactions) && lead.interactions.length > 0
      ? lead.interactions.map((item, idx) => {
          const text = item.summary && item.summary.length > 500
            ? item.summary.substring(0, 500) + "..."
            : (item.summary || "");
          return `  ${idx + 1}. [${item.type}] on ${new Date(item.date).toLocaleDateString()} by ${item.author || "Rep"}: "${text}"`;
        }).join("\n")
      : "  No recorded interactions yet.";

    const promptData = `
Analyze the following B2B Lead Context:
- Company Name: ${lead.companyName}
- Contact Person: ${lead.contactName || "Not specified"} (${lead.email || "No email"}, ${lead.mobile || "No phone"})
- Current Deal Stage: ${lead.stage}
- Deal Value: ₹${Number(lead.dealValue || 0).toLocaleString('en-IN')}
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
      timeoutMs: 15000,
    });

    const validPriorities = ["LOW", "MEDIUM", "HIGH"];
    const validActionTypes = ["CALL", "EMAIL", "MEETING", "PROPOSAL", "RESEARCH"];

    const rawPriority = (parsedJSON.aiPriority || "MEDIUM").toUpperCase();
    const rawActionType = (parsedJSON.aiActionType || "CALL").toUpperCase();

    return {
      aiSummary: parsedJSON.aiSummary || `${lead.companyName} is currently in the ${lead.stage} stage with a deal value of ₹${Number(lead.dealValue || 0).toLocaleString('en-IN')}. Consistent follow-ups are recommended to maintain pipeline velocity.`,
      aiRiskScore: Math.min(100, Math.max(0, parseInt(parsedJSON.aiRiskScore) || 45)),
      aiPriority: validPriorities.includes(rawPriority) ? rawPriority : "MEDIUM",
      aiActionType: validActionTypes.includes(rawActionType) ? rawActionType : "CALL",
      aiNextBestAction: parsedJSON.aiNextBestAction || "Reach out to key decision maker to clarify immediate requirements.",
      source: modelName
    };
  } catch (error) {
    console.error("[GeminiService] Error generating lead analysis via Gemini:", error.message);
    return generateLeadHeuristicFallback(lead);
  }
};

/**
 * Fallback heuristic generator when Gemini API is unavailable.
 */
function generateLeadHeuristicFallback(lead) {
  let score = 40;
  let priority = "MEDIUM";
  let actionType = "CALL";
  let actionText = "Schedule a discovery call with the lead contact.";

  if (lead.stage === "CLOSED_WON") {
    score = 5;
    priority = "LOW";
    actionType = "RESEARCH";
    actionText = "Review onboarding requirements and initiate account billing.";
  } else if (lead.stage === "CLOSED_LOST") {
    score = 95;
    priority = "LOW";
    actionType = "RESEARCH";
    actionText = "Log win/loss feedback and schedule win-back check-in for next quarter.";
  } else if (lead.stage === "NEGOTIATION") {
    score = 25;
    priority = "HIGH";
    actionType = "PROPOSAL";
    actionText = "Finalize contract terms and send revised proposal for sign-off.";
  } else if (lead.stage === "PROPOSAL_SENT") {
    score = 35;
    priority = "HIGH";
    actionType = "EMAIL";
    actionText = "Send follow-up email regarding the proposed commercial proposal.";
  } else if (lead.stage === "QUALIFIED") {
    score = 50;
    priority = "MEDIUM";
    actionType = "MEETING";
    actionText = "Schedule product demonstration with primary stakeholders.";
  }

  const interactionCount = Array.isArray(lead.interactions) ? lead.interactions.length : 0;
  const summary = `${lead.companyName} is actively engaged in the ${lead.stage} pipeline stage with an estimated deal value of ₹${Number(lead.dealValue || 0).toLocaleString('en-IN')}. ${interactionCount} interaction(s) logged to date.`;

  return {
    aiSummary: summary,
    aiRiskScore: score,
    aiPriority: priority,
    aiActionType: actionType,
    aiNextBestAction: actionText,
    source: "heuristic-fallback"
  };
}

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

