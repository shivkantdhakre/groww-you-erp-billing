import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import { useStore } from "../../store/useStore";
import StatusBadge from "../common/StatusBadge";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Clock,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";

/**
 * Revenue Intelligence panel surfacing pipeline health scores, ledger
 * observations, prioritized route actions, and helpfulness feedback.
 */
export default function AIPipelineInsightsCard() {
  const activeBranchId = useStore((state) => state.activeBranchId);
  const [loading, setLoading] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCachedInsights = async () => {
      try {
        setLoading(true);
        setError("");
        setFeedbackGiven(null);
        setFeedbackMessage("");
        const res = await api.get("/analytics/sales-insights");
        if (cancelled) return;
        if (res.data.hasCache && res.data.insights) {
          setHasCache(true);
          setInsights(res.data.insights);
          setNowMs(Date.now());
        } else {
          setHasCache(false);
          setInsights(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch pipeline insights status:", err);
        setHasCache(false);
        setInsights(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCachedInsights();
    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  const handleGenerateInsights = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError("");
      setFeedbackGiven(null);
      setFeedbackMessage("");

      const endpoint = forceRefresh
        ? "/analytics/sales-insights?forceRefresh=true"
        : "/analytics/sales-insights?generate=true";

      const res = await api.get(endpoint);
      if (res.data && res.data.insights) {
        setHasCache(true);
        setInsights(res.data.insights);
        setNowMs(Date.now());
      } else {
        throw new Error("Failed to receive structured insights output.");
      }
    } catch (err) {
      console.error("Error generating sales insights:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to generate AI pipeline insights."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (helpful) => {
    if (feedbackGiven) return;
    setFeedbackGiven(helpful ? "up" : "down");
    try {
      await api.post("/analytics/sales-insights/feedback", {
        helpful,
        feedbackText: helpful ? "Positive observation" : "Needs improvement",
      });
      setFeedbackMessage("Feedback recorded");
    } catch (err) {
      console.error("Failed to record feedback:", err);
    }
  };

  const sanitizeRoute = (route) => {
    if (!route) return null;
    const r = route.trim().toLowerCase();
    if (r.includes("outstanding")) return "/outstanding-report";
    if (r === "/invoices" || r === "/sales" || r === "/invoice") return "/sales-invoice";
    if (r.includes("sales-report") || r.includes("salesreport")) return "/sales-report";
    if (r === "/products" || r === "/items" || r === "/stock") return "/inventory";
    if (r === "/reports") return "/reports-dashboard";
    if (r === "/leads" || r.includes("crm")) return "/leads";
    return route;
  };

  const getScoreBadge = (score) => {
    if (score >= 80) {
      return {
        label: "Healthy Pipeline",
        icon: ShieldCheck,
        colorClass: "text-success",
      };
    }
    if (score >= 50) {
      return {
        label: "Attention Required",
        icon: Info,
        colorClass: "text-warning",
      };
    }
    return {
      label: "Critical Attention",
      icon: AlertCircle,
      colorClass: "text-destructive",
    };
  };

  const getPriorityVariant = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "warning";
      default:
        return "primary";
    }
  };

  const formatFreshness = (timestamp) => {
    if (!timestamp) return "Just now";
    const diffMs = Math.max(0, nowMs - new Date(timestamp).getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <div className="bg-card p-5 rounded-lg border border-border surface-shadow space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-text animate-spin" />
            </div>
            <div className="h-4 w-36 bg-muted rounded" />
          </div>
          <div className="h-5 w-20 bg-muted rounded" />
        </div>

        <div className="flex items-center gap-4 bg-secondary/40 p-4 rounded-lg border border-border">
          <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-3/4 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 w-1/3 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-5/6 bg-muted rounded" />
        </div>

        <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-2 pt-1">
          <Zap className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          <span>Evaluating receivables, sales velocity &amp; stock turnover&hellip;</span>
        </p>
      </div>
    );
  }

  if (!hasCache || !insights) {
    return (
      <div className="bg-card p-5 rounded-lg border border-border surface-shadow flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-primary/10 border border-primary/20 text-primary-text">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm tracking-tight">
                AI Pipeline Advisor
              </h3>
              <p className="text-[11px] text-muted-foreground">Revenue & Receivables Intelligence</p>
            </div>
          </div>
          <StatusBadge variant="accent">On Demand</StatusBadge>
        </div>

        <div className="py-3 text-center space-y-3">
          <div className="w-11 h-11 mx-auto rounded-lg bg-secondary border border-border flex items-center justify-center text-primary-text">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Pipeline Diagnostics</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Analyze deal velocity, aging receivables, and inventory exposure directly from your live ledger.
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/25 rounded-md text-xs text-destructive flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleGenerateInsights(false)}
            className="w-full h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm rounded-md transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Pipeline Brief</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    healthScore = 0,
    headline,
    insights: observations = [],
    recommendations = [],
    generatedAt,
    source,
    model,
    metricsSnapshot,
  } = insights;
  const badgeInfo = getScoreBadge(healthScore);
  const BadgeIcon = badgeInfo.icon;
  const isOnboardingEmpty = source === "onboarding-empty";

  return (
    <div className="bg-card p-5 rounded-lg border border-border surface-shadow space-y-4 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-md bg-primary/10 border border-primary/20 text-primary-text shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm tracking-tight truncate">
              AI Pipeline Advisor
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="tabular-nums">{formatFreshness(generatedAt)}</span>
              {model ? (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-secondary text-foreground border border-border/70">
                  {model}
                </span>
              ) : isOnboardingEmpty ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/70">
                  No Ledger Activity
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleGenerateInsights(true)}
          title="Re-analyze Sales Pipeline"
          className="h-7 px-2.5 rounded-md border border-border bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/25 rounded-md text-xs text-destructive flex items-start gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {metricsSnapshot && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground px-2 py-0.5 rounded bg-input-bg border border-border/70">
            {metricsSnapshot.scopeLabel}
          </span>
          <span className="px-2 py-0.5 rounded bg-input-bg border border-border/70">
            {metricsSnapshot.totalOrders || 0} orders
          </span>
          <span className="px-2 py-0.5 rounded bg-input-bg border border-border/70">
            {metricsSnapshot.lowStockItemsCount || 0} low stock
          </span>
          {metricsSnapshot.crmLeadsCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-input-bg border border-border/70">
              {metricsSnapshot.crmLeadsCount} CRM leads
            </span>
          )}
        </div>
      )}

      {/* Health Score Banner */}
      <div className="bg-secondary/40 border border-border rounded-lg p-3.5 flex items-center gap-3.5">
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-border"
              strokeWidth="3.2"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={badgeInfo.colorClass}
              strokeDasharray={`${Math.min(100, Math.max(0, healthScore))}, 100`}
              strokeWidth="3.2"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold tabular-nums text-foreground leading-none">
              {healthScore}
            </span>
            <span className="text-[8px] font-semibold text-muted-foreground uppercase mt-0.5">
              Score
            </span>
          </div>
        </div>

        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <BadgeIcon className={`w-3.5 h-3.5 shrink-0 ${badgeInfo.colorClass}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${badgeInfo.colorClass}`}>
              {badgeInfo.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">{headline}</p>
        </div>
      </div>

      {/* Key Observations */}
      {observations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Key Observations
          </h4>
          <ul className="space-y-1.5">
            {observations.map((obs, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed bg-background/70 px-3 py-2 rounded-md border border-border/70"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-text shrink-0 mt-0.5" />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prioritized Action Items */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended Actions
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => {
              const targetRoute = sanitizeRoute(rec.suggestedRoute || rec.route);
              return (
                <div
                  key={idx}
                  className="p-3 bg-secondary/35 rounded-md border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <StatusBadge variant={getPriorityVariant(rec.priority)}>
                      {rec.priority}
                    </StatusBadge>
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {rec.actionText || rec.action}
                    </p>
                  </div>

                  {targetRoute && (
                    <Link
                      to={targetRoute}
                      className="self-end sm:self-center h-7 px-2.5 bg-card hover:bg-secondary text-primary-text border border-border text-xs font-medium rounded-md erp-focus-ring transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback Footer */}
      <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span>Was this brief useful?</span>
        <div className="flex items-center gap-1">
          {feedbackMessage ? (
            <span className="text-[11px] font-medium text-success">{feedbackMessage}</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleFeedback(true)}
                title="Helpful"
                aria-label="Helpful"
                className={`p-1.5 rounded-md hover:bg-success/10 hover:text-success erp-focus-ring transition-colors cursor-pointer ${
                  feedbackGiven === "up" ? "text-success" : ""
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(false)}
                title="Needs Improvement"
                aria-label="Needs Improvement"
                className={`p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive erp-focus-ring transition-colors cursor-pointer ${
                  feedbackGiven === "down" ? "text-destructive" : ""
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
