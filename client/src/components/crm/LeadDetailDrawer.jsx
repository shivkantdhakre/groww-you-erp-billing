import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
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
  DollarSign,
  TrendingUp
} from "lucide-react";

export default function LeadDetailDrawer({ leadId, isOpen, onClose, onLeadUpdated }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [newInteractionType, setNewInteractionType] = useState("CALL");
  const [newInteractionSummary, setNewInteractionSummary] = useState("");
  const [submittingInteraction, setSubmittingInteraction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
          window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent("Follow-up regarding " + lead.companyName)}&body=${encodeURIComponent(lead.aiNextBestAction || "")}`;
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

  // Fetch full lead details when drawer opens
  useEffect(() => {
    if (!isOpen || !leadId) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg("");

    api.get(`/leads/${leadId}`)
      .then((res) => {
        if (isMounted) {
          setLead(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load lead details:", err);
        if (isMounted) {
          setErrorMsg("Failed to load lead context from server.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const handleRunAIAnalysis = async () => {
    if (!leadId) return;
    setAnalyzing(true);
    setErrorMsg("");
    try {
      const updated = await analyzeLeadWithAI(leadId);
      setLead(updated);
      if (onLeadUpdated) onLeadUpdated(updated);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setErrorMsg("Failed to generate AI analysis. Please check network connection.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteractionSummary.trim()) return;

    setSubmittingInteraction(true);
    try {
      await api.post(`/leads/${leadId}/interactions`, {
        type: newInteractionType,
        summary: newInteractionSummary.trim()
      });

      // Reload lead details to fetch updated history & timestamp
      const res = await api.get(`/leads/${leadId}`);
      setLead(res.data);
      setNewInteractionSummary("");
      if (onLeadUpdated) onLeadUpdated(res.data);
    } catch (err) {
      console.error("Failed to add interaction:", err);
      setErrorMsg("Failed to log interaction.");
    } finally {
      setSubmittingInteraction(false);
    }
  };

  // Calculate Stale AI Insight state (with 10-second buffer to prevent microsecond collision alerts)
  const isStale = lead && lead.aiAnalyzedAt && lead.updatedAt
    ? new Date(lead.updatedAt).getTime() > new Date(lead.aiAnalyzedAt).getTime() + 10000
    : false;

  // Format Risk Gauge Meter Colors
  const getRiskScoreColor = (score) => {
    if (score <= 30) return { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", label: "Low Risk (Healthy Momentum)" };
    if (score <= 65) return { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", label: "Medium Risk (Stalling Deal)" };
    return { bg: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800", label: "High Risk (Churn Alert)" };
  };

  // Priority Badge Styling
  const getPriorityBadge = (priority) => {
    const p = (priority || "MEDIUM").toUpperCase();
    if (p === "HIGH") return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    if (p === "LOW") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  };

  // Action Type Icon & CTA Label
  const getActionCTA = (actionType) => {
    switch (actionType) {
      case "EMAIL":
        return { icon: Mail, label: "Draft Follow-up Email", bg: "bg-indigo-600 hover:bg-indigo-700 text-white" };
      case "MEETING":
        return { icon: Calendar, label: "Schedule Product Demo", bg: "bg-purple-600 hover:bg-purple-700 text-white" };
      case "PROPOSAL":
        return { icon: FileText, label: "Prepare Deal Proposal", bg: "bg-emerald-600 hover:bg-emerald-700 text-white" };
      case "RESEARCH":
        return { icon: Search, label: "Conduct Account Research", bg: "bg-slate-700 hover:bg-slate-800 text-white" };
      case "CALL":
      default:
        return { icon: Phone, label: "Start Outreach Call", bg: "bg-blue-600 hover:bg-blue-700 text-white" };
    }
  };

  const riskInfo = lead?.aiRiskScore !== null && lead?.aiRiskScore !== undefined
    ? getRiskScoreColor(lead.aiRiskScore)
    : null;

  const actionCTA = lead?.aiActionType ? getActionCTA(lead.aiActionType) : getActionCTA("CALL");
  const ActionIcon = actionCTA.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-card text-card-foreground shadow-2xl border-l border-border flex flex-col transform transition ease-in-out duration-300">
          
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {lead ? lead.companyName : "Lead Detail Drawer"}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Stage: <strong className="text-foreground">{lead?.stage || "—"}</strong></span>
                  <span>•</span>
                  <span>Value: <strong className="text-foreground">₹{Number(lead?.dealValue || 0).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body - Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {loading ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading lead context...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            ) : lead ? (
              <>
                {/* STALE DATA WARNING BANNER */}
                {isStale && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Lead details or notes modified since last AI analysis.</span>
                    </div>
                    <button
                      onClick={handleRunAIAnalysis}
                      disabled={analyzing}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-xs"
                    >
                      {analyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Refresh
                    </button>
                  </div>
                )}

                {/* AI INSIGHTS CARD WITH SOFT GRADIENT */}
                <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/80 border border-indigo-100 dark:border-indigo-900/50 shadow-sm space-y-4">
                  
                  {/* AI Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                        AI Executive Summary & Risk Profiler
                      </h3>
                    </div>

                    <button
                      onClick={handleRunAIAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          {lead.aiSummary ? "Re-analyze with AI" : "Generate AI Analysis"}
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Output Content or Empty Callout */}
                  {lead.aiSummary ? (
                    <div className="space-y-4 pt-1">
                      
                      {/* Executive Summary */}
                      <p className="text-sm text-foreground/90 leading-relaxed font-normal bg-background/60 dark:bg-background/40 backdrop-blur-xs p-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                        {lead.aiSummary}
                      </p>

                      {/* Risk Score Gauge & Priority Row */}
                      <div className="grid grid-cols-2 gap-3">
                        
                        {/* Risk Gauge Box */}
                        <div className="p-3.5 rounded-xl bg-background/80 dark:bg-background/50 border border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Deal Risk Score</span>
                            <span className={`text-base font-bold ${riskInfo.text}`}>
                              {lead.aiRiskScore} / 100
                            </span>
                          </div>
                          
                          {/* Visual Meter Bar */}
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${riskInfo.bg}`}
                              style={{ width: `${Math.min(100, Math.max(5, lead.aiRiskScore))}%` }}
                            />
                          </div>
                          
                          <p className="text-[11px] text-muted-foreground font-medium truncate">
                            {riskInfo.label}
                          </p>
                        </div>

                        {/* Priority Box */}
                        <div className="p-3.5 rounded-xl bg-background/80 dark:bg-background/50 border border-border flex flex-col justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Suggested Priority</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(lead.aiPriority)}`}>
                              {lead.aiPriority || "MEDIUM"}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground mt-1">
                            Categorized by B2B Sales Engine
                          </span>
                        </div>
                      </div>

                      {/* Next Best Action Banner & Action CTA */}
                      <div className="p-4 rounded-xl bg-background/90 dark:bg-background/60 border border-indigo-200/60 dark:border-indigo-800/40 space-y-3 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                              Single Next Best Action
                            </span>
                            <p className="text-sm font-medium text-foreground mt-0.5">
                              {lead.aiNextBestAction}
                            </p>
                          </div>
                        </div>

                        {/* Dynamic Action Button */}
                        <button
                          onClick={handleActionClick}
                          className={`w-full py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-xs ${actionCTA.bg}`}
                        >
                          <ActionIcon className="w-3.5 h-3.5" />
                          {actionCTA.label}
                        </button>
                      </div>

                      {lead.aiAnalyzedAt && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                          <Clock className="w-3 h-3" />
                          <span>Analyzed on {new Date(lead.aiAnalyzedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground space-y-2">
                      <p className="text-xs">No AI summary generated yet for this lead.</p>
                      <p className="text-xs font-medium text-foreground">Click "Generate AI Analysis" to get executive insights and risk score.</p>
                    </div>
                  )}
                </div>

                {/* LEAD ACCOUNT DETAILS METADATA */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Account Contact Metadata
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Contact Name:</span>
                      <span className="font-medium text-foreground">{lead.contactName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Phone:</span>
                      <span className="font-medium text-foreground">{lead.mobile || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Email:</span>
                      <span className="font-medium text-foreground truncate block">{lead.email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Deal Value:</span>
                      <span className="font-semibold text-foreground">₹{Number(lead.dealValue || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {lead.notes && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground block mb-1">Internal Notes:</span>
                      <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg font-normal">
                        {lead.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* INTERACTION LOG FEED & NEW INTERACTION FORM */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Interaction Feed ({lead.interactions?.length || 0})
                    </span>
                  </h4>

                  {/* Add New Interaction Form */}
                  <form onSubmit={handleAddInteraction} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={newInteractionType}
                        onChange={(e) => setNewInteractionType(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background font-medium text-foreground focus:outline-hidden"
                      >
                        <option value="CALL">📞 Call</option>
                        <option value="EMAIL">✉️ Email</option>
                        <option value="MEETING">📅 Meeting</option>
                        <option value="PROPOSAL">📄 Proposal</option>
                        <option value="RESEARCH">🔍 Note / Research</option>
                      </select>
                      <span className="text-xs text-muted-foreground font-medium">Log new activity</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Log meeting summary or discussion notes..."
                        value={newInteractionSummary}
                        onChange={(e) => setNewInteractionSummary(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        disabled={submittingInteraction || !newInteractionSummary.trim()}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {submittingInteraction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Log
                      </button>
                    </div>
                  </form>

                  {/* Timeline Feed */}
                  {lead.interactions && lead.interactions.length > 0 ? (
                    <div className="space-y-2.5 relative pl-4 border-l-2 border-border">
                      {lead.interactions.map((item) => (
                        <div key={item.id} className="relative group">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                          <div className="p-3 rounded-xl bg-card border border-border text-xs space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span className="font-semibold text-foreground uppercase tracking-wider">{item.type}</span>
                              <span>{new Date(item.date).toLocaleDateString()} • {item.author || "Rep"}</span>
                            </div>
                            <p className="text-foreground">{item.summary}</p>
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
