import prisma from "../utils/prisma.js";
import { paginate } from "../utils/pagination.js";
import { analyzeLeadExecutiveSummary, GeminiServiceError } from "../utils/geminiService.js";
import { invalidateInsightsCache } from "../utils/cacheService.js";

// Fetch all active leads for logged-in company with pagination and filters
export const getLeads = async (req, res) => {
  try {
    const { stage, search } = req.query;
    const whereClause = {
      companyId: req.user.companyId,
    };

    if (stage && stage !== "ALL") {
      whereClause.stage = stage;
    }

    if (search && search.trim() !== "") {
      whereClause.OR = [
        { companyName: { contains: search.trim(), mode: "insensitive" } },
        { contactName: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
        { mobile: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const includeOptions = {
      _count: {
        select: { interactions: true }
      }
    };

    const result = await paginate(prisma.lead, whereClause, req.query, includeOptions, { updatedAt: "desc" });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
};

// Fetch single lead by ID with interaction history
export const getLeadById = async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        companyId: req.user.companyId
      },
      include: {
        customer: true,
        interactions: {
          orderBy: { date: "desc" }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json(lead);
  } catch (error) {
    console.error("Error fetching lead by id:", error);
    res.status(500).json({ message: "Failed to fetch lead details" });
  }
};

// Create a new B2B Lead
export const createLead = async (req, res) => {
  try {
    const { companyName, contactName, email, mobile, stage, dealValue, notes, customerId } = req.body;

    if (!companyName || companyName.trim() === "") {
      return res.status(400).json({ message: "Company Name is required" });
    }

    const newLead = await prisma.lead.create({
      data: {
        companyId: req.user.companyId,
        companyName: companyName.trim(),
        contactName: contactName ? contactName.trim() : null,
        email: email ? email.trim() : null,
        mobile: mobile ? mobile.trim() : null,
        stage: stage || "NEW",
        dealValue: parseFloat(dealValue) || 0.0,
        notes: notes || null,
        customerId: customerId ? parseInt(customerId) : null,
      },
      include: {
        interactions: { orderBy: { date: "desc" } }
      }
    });

    invalidateInsightsCache(req.user.companyId);

    res.status(201).json(newLead);
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ message: "Failed to create lead" });
  }
};

// Update lead details (e.g. stage change, deal value update, notes)
export const updateLead = async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const existing = await prisma.lead.findFirst({
      where: { id: leadId, companyId: req.user.companyId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const { companyName, contactName, email, mobile, stage, dealValue, notes, customerId } = req.body;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        companyName: companyName !== undefined ? companyName.trim() : existing.companyName,
        contactName: contactName !== undefined ? contactName.trim() : existing.contactName,
        email: email !== undefined ? email.trim() : existing.email,
        mobile: mobile !== undefined ? mobile.trim() : existing.mobile,
        stage: stage !== undefined ? stage : existing.stage,
        dealValue: dealValue !== undefined ? parseFloat(dealValue) : existing.dealValue,
        notes: notes !== undefined ? notes : existing.notes,
        customerId: customerId !== undefined ? (customerId ? parseInt(customerId) : null) : existing.customerId,
      },
      include: {
        interactions: { orderBy: { date: "desc" } }
      }
    });

    invalidateInsightsCache(req.user.companyId);

    res.status(200).json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ message: "Failed to update lead" });
  }
};

// Add a new interaction entry to lead history
export const addLeadInteraction = async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, companyId: req.user.companyId }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const { type, summary } = req.body;

    if (!summary || summary.trim() === "") {
      return res.status(400).json({ message: "Interaction summary is required" });
    }

    const validTypes = ["CALL", "EMAIL", "MEETING", "PROPOSAL", "RESEARCH"];
    const interactionType = validTypes.includes(type) ? type : "CALL";

    // Use prisma.$transaction to atomically create child interaction AND force parent Lead.updatedAt bump
    const [interaction] = await prisma.$transaction([
      prisma.leadInteraction.create({
        data: {
          leadId,
          type: interactionType,
          summary: summary.trim(),
          author: req.user.name || "Sales Rep",
          date: new Date()
        }
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { updatedAt: new Date() }
      })
    ]);

    res.status(201).json(interaction);
  } catch (error) {
    console.error("Error adding lead interaction:", error);
    res.status(500).json({ message: "Failed to log interaction" });
  }
};

// PUT Endpoint: Triggers live Gemini AI Analysis & Write-Time Caching to PostgreSQL
export const analyzeLead = async (req, res) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (Number.isNaN(leadId)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    // Fetch lead with linked ERP customer ledger context & last 20 interactions ordered by date desc
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        companyId: req.user.companyId
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            outstandingBalance: true,
            invoices: {
              take: 5,
              orderBy: { invoiceDate: "desc" },
              select: { invoiceNo: true, grandTotal: true, invoiceDate: true, invoiceType: true }
            }
          }
        },
        interactions: {
          orderBy: { date: "desc" },
          take: 20
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Per-interaction character truncation (500 chars max) to prevent token bloat from copy-pasted email threads
    const safeInteractions = (lead.interactions || []).map((item) => ({
      ...item,
      summary: item.summary && item.summary.length > 500
        ? item.summary.substring(0, 500) + "..."
        : item.summary
    }));

    const sanitizedLeadContext = {
      ...lead,
      interactions: safeInteractions
    };

    // Call live Gemini AI service (never falls back to heuristic template strings)
    const aiResult = await analyzeLeadExecutiveSummary(sanitizedLeadContext);

    // Write-time caching to PostgreSQL
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiSummary: aiResult.aiSummary,
        aiRiskScore: aiResult.aiRiskScore,
        aiPriority: aiResult.aiPriority,
        aiActionType: aiResult.aiActionType,
        aiNextBestAction: aiResult.aiNextBestAction,
        aiAnalyzedAt: new Date()
      },
      include: {
        customer: true,
        interactions: {
          orderBy: { date: "desc" },
          take: 20
        }
      }
    });

    invalidateInsightsCache(req.user.companyId);

    res.status(200).json({
      ...updatedLead,
      aiSource: aiResult.source
    });
  } catch (error) {
    console.error("Error analyzing lead with AI:", error);
    if (error instanceof GeminiServiceError) {
      return res.status(error.statusCode).json({
        message: error.userMessage,
        error: error.userMessage,
        code: error.code
      });
    }
    res.status(500).json({ message: "Failed to generate AI executive summary" });
  }
};

// Delete a lead
export const deleteLead = async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const existing = await prisma.lead.findFirst({
      where: { id: leadId, companyId: req.user.companyId }
    });

    if (!existing) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await prisma.lead.delete({
      where: { id: leadId }
    });

    invalidateInsightsCache(req.user.companyId);

    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ message: "Failed to delete lead" });
  }
};
