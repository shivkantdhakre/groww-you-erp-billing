import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import StatusBadge from "../common/StatusBadge";
import api from "../../utils/api";
import {
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  User,
} from "lucide-react";

/**
 * Slide-over lead workspace displaying AI executive briefs, risk gauges,
 * next-best-action triggers, and interaction timeline logs.
 */
export default function LeadDetailDrawer({ leadId, isOpen, onClose, onLeadUpdated }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [newInteractionType, setNewInteractionType] = useState("CALL");
  const [newInteractionSummary, setNewInteractionSummary] = useState("");
  const [submittingInteraction, setSubmittingInteraction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionError, setActionError] = useState("");

  const navigate = useNavigate();
  const analyzeLeadWithAI = useStore((state) => state.analyzeLeadWithAI);

  const handleActionClick = () => {
    if (!lead) return;
    const actionType = lead.aiActionType || "CALL";

    switch (actionType) {
      case "PROPOSAL":
        navigate("/sales-invoice");
        if (onClose) onClose();
        break;
      case "EMAIL":
        if (lead.email) {
          window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(
            "Follow-up regarding " + lead.companyName
          )}&body=${encodeURIComponent(lead.aiNextBestAction || "")}`;
        } else {
          setNewInteractionType("EMAIL");
          setNewInteractionSummary(lead.aiNextBestAction || "Drafted follow-up email.");
        }
        break;
      case "CALL":
        if (lead.mobile) {
          window.location.href = `tel:${lead.mobile}`;
        } else {
          setNewInteractionType("CALL");
          setNewInteractionSummary(lead.aiNextBestAction || "Initiated outreach call.");
        }
        break;
      case "MEETING":
        setNewInteractionType("MEETING");
        setNewInteractionSummary(lead.aiNextBestAction || "Scheduled demo meeting.");
        break;
      case "RESEARCH":
        navigate("/customers");
        if (onClose) onClose();
        break;
      default:
        setNewInteractionType("CALL");
        setNewInteractionSummary(lead.aiNextBestAction || "");
        break;
    }
  };

  useEffect(() => {
    if (!isOpen || !leadId) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      setLoading(true);
      setErrorMsg("");
      setActionError("");
      try {
        const res = await api.get(`/leads/${leadId}`);
        if (isMounted) setLead(res.data);
      } catch (err) {
        console.error("Failed to load lead details:", err);
        if (isMounted) setErrorMsg(err.response?.data?.message || "Failed to load lead context from server.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const handleRunAIAnalysis = async () => {
    if (!leadId) return;
    setAnalyzing(true);
    setActionError("");
    try {
      const updated = await analyzeLeadWithAI(leadId);
      setLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setActionError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to generate AI analysis via Gemini AI."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteractionSummary.trim()) return;

    setSubmittingInteraction(true);
    setActionError("");
    try {
      await api.post(`/leads/${leadId}/interactions`, {
        type: newInteractionType,
        summary: newInteractionSummary.trim(),
      });

      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data);
      setNewInteractionSummary("");
      if (onLeadUpdated) onLeadUpdated(res.data);
    } catch (err) {
      console.error("Failed to add interaction:", err);
      setActionError(err.response?.data?.message || "Failed to log interaction.");
    } finally {
      setSubmittingInteraction(false);
    }
  };

  const isStale =
    lead && lead.aiAnalyzedAt && lead.updatedAt
      ? new Date(lead.updatedAt).getTime() > new Date(lead.aiAnalyzedAt).getTime() + 10000
      : false;

  const getRiskScoreColor = (score) => {
    if (score <= 30) {
      return {
        bar: "bg-success",
        text: "text-success",
        label: "Low Risk (Healthy Momentum)",
      };
    }
    if (score <= 65) {
      return {
        bar: "bg-warning",
        text: "text-warning",
        label: "Medium Risk (Stalling Deal)",
      };
    }
    return {
      bar: "bg-destructive",
      text: "text-destructive",
      label: "High Risk (Churn Alert)",
    };
  };

  const getPriorityVariant = (priority) => {
    const p = (priority || "MEDIUM").toUpperCase();
    if (p === "HIGH") return "destructive";
    if (p === "LOW") return "neutral";
    return "warning";
  };

  const getActionCTA = (actionType) => {
    switch (actionType) {
      case "EMAIL":
        return { icon: Mail, label: "Draft Follow-up Email" };
      case "MEETING":
        return { icon: Calendar, label: "Schedule Product Demo" };
      case "PROPOSAL":
        return { icon: FileText, label: "Prepare Deal Proposal" };
      case "RESEARCH":
        return { icon: Search, label: "Conduct Account Research" };
      case "CALL":
      default:
        return { icon: Phone, label: "Start Outreach Call" };
    }
  };

  const riskInfo =
    lead?.aiRiskScore !== null && lead?.aiRiskScore !== undefined
      ? getRiskScoreColor(lead.aiRiskScore)
      : null;

  const actionCTA = getActionCTA(lead?.aiActionType || "CALL");
  const ActionIcon = actionCTA.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-[2px]"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-8">
        <div className="w-screen max-w-xl bg-card text-foreground popover-shadow border-l border-border flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-secondary/40 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-md bg-primary/10 border border-primary/20 text-primary-text shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground truncate">
                  {lead ? lead.companyName : "Lead Details"}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5 tabular-nums">
                  <span>
                    Stage: <strong className="text-foreground">{lead?.stage || "—"}</strong>
                  </span>
                  <span>·</span>
                  <span className="whitespace-nowrap">
                    Value:{" "}
                    <strong className="text-foreground font-mono">
                      ₹ {Number(lead?.dealValue || 0).toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2.5">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-text" />
                <p className="text-xs font-medium">Loading account context...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-3.5 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs sm:text-sm flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            ) : lead ? (
              <>
                {actionError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActionError("")}
                      className="p-0.5 rounded hover:bg-destructive/15 cursor-pointer shrink-0"
                      aria-label="Dismiss error"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isStale && (
                  <div className="p-3 rounded-md bg-warning/10 border border-warning/30 text-warning text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Account updated since last AI analysis.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunAIAnalysis}
                      disabled={analyzing}
                      className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground font-medium text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                )}

                {/* AI Insights Card */}
                <div className="rounded-lg p-4 sm:p-5 bg-secondary/35 border border-border surface-shadow space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary-text" />
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        AI Executive Brief & Risk Profiler
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunAIAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>{lead.aiSummary ? "Re-analyze" : "Generate AI Analysis"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {lead.aiSummary ? (
                    <div className="space-y-3.5">
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-card p-3.5 rounded-md border border-border">
                        {lead.aiSummary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-md bg-card border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Deal Risk Score
                            </span>
                            <span className={`text-sm font-semibold tabular-nums ${riskInfo.text}`}>
                              {lead.aiRiskScore} / 100
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${riskInfo.bar}`}
                              style={{
                                width: `${Math.min(100, Math.max(5, lead.aiRiskScore))}%`,
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{riskInfo.label}</p>
                        </div>

                        <div className="p-3.5 rounded-md bg-card border border-border flex flex-col justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Priority Rating
                          </span>
                          <div>
                            <StatusBadge variant={getPriorityVariant(lead.aiPriority)}>
                              {lead.aiPriority || "MEDIUM"}
                            </StatusBadge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Weighted pipeline assessment
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-md bg-card border border-border space-y-2.5">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary-text mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[11px] font-semibold text-primary-text uppercase tracking-wider block">
                              Recommended Next Step
                            </span>
                            <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5">
                              {lead.aiNextBestAction}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleActionClick}
                          className="w-full h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ActionIcon className="w-3.5 h-3.5" />
                          <span>{actionCTA.label}</span>
                        </button>
                      </div>

                      {lead.aiAnalyzedAt && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            <span>Analyzed {new Date(lead.aiAnalyzedAt).toLocaleString()}</span>
                          </span>
                          {lead.aiSource && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-card border border-border text-foreground">
                              {lead.aiSource}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-5 text-center text-muted-foreground space-y-1">
                      <p className="text-xs">No AI brief generated yet for this opportunity.</p>
                      <p className="text-xs font-medium text-foreground">
                        Click Generate AI Analysis to compute risk score and recommended action.
                      </p>
                    </div>
                  )}
                </div>

                {/* Account Metadata */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary-text" />
                    <span>Contact Details</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Contact Name</span>
                      <span className="font-medium text-foreground">{lead.contactName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Phone</span>
                      <span className="font-medium font-mono text-foreground tabular-nums">
                        {lead.mobile || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Email</span>
                      <span className="font-medium text-foreground truncate block">
                        {lead.email || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Deal Value</span>
                      <span className="font-semibold font-mono text-foreground tabular-nums">
                        ₹ {Number(lead.dealValue || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {lead.notes && (
                    <div className="pt-2.5 border-t border-border/70">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1">
                        Account Notes
                      </span>
                      <p className="text-xs text-foreground bg-secondary/40 p-2.5 rounded-md border border-border/70">
                        {lead.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Interaction Timeline */}
                <div className="space-y-3.5">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-text" />
                    <span>Interaction Timeline ({lead.interactions?.length || 0})</span>
                  </h4>

                  <form
                    onSubmit={handleAddInteraction}
                    className="p-3.5 rounded-lg border border-border bg-secondary/35 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={newInteractionType}
                        onChange={(e) => setNewInteractionType(e.target.value)}
                        className="h-8 px-2.5 text-xs rounded-md border border-input bg-card font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                      >
                        <option value="CALL">Call</option>
                        <option value="EMAIL">Email</option>
                        <option value="MEETING">Meeting</option>
                        <option value="PROPOSAL">Proposal</option>
                        <option value="RESEARCH">Research / Note</option>
                      </select>
                      <span className="text-xs text-muted-foreground">Log account activity</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Summarize call outcome or follow-up note..."
                        value={newInteractionSummary}
                        onChange={(e) => setNewInteractionSummary(e.target.value)}
                        className="flex-1 h-8 px-3 text-xs rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="submit"
                        disabled={submittingInteraction || !newInteractionSummary.trim()}
                        className="h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {submittingInteraction ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Log</span>
                      </button>
                    </div>
                  </form>

                  {lead.interactions && lead.interactions.length > 0 ? (
                    <div className="space-y-2.5 relative pl-4 border-l border-border">
                      {lead.interactions.map((item) => (
                        <div key={item.id} className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-card" />
                          <div className="p-3 rounded-md bg-card border border-border text-xs space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="font-semibold text-foreground uppercase tracking-wider">
                                {item.type}
                              </span>
                              <span className="tabular-nums">
                                {new Date(item.date).toLocaleDateString()} · {item.author || "Rep"}
                              </span>
                            </div>
                            <p className="text-foreground leading-relaxed">{item.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No interactions logged yet for this lead.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
