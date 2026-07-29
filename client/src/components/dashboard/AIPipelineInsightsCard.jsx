import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Clock,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";

export default function AIPipelineInsightsCard() {
  const [loading, setLoading] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'up' | 'down' | null
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // 1. Initial load: Check if cached insights exist for this tenant
  useEffect(() => {
    const fetchCachedInsights = async () => {
      try {
        setLoading(true);
        const res = await api.get("/analytics/sales-insights");
        if (res.data.hasCache && res.data.insights) {
          setHasCache(true);
          setInsights(res.data.insights);
        } else {
          setHasCache(false);
          setInsights(null);
        }
      } catch (err) {
        console.error("Failed to fetch pipeline insights status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCachedInsights();
  }, []);

  // 2. Trigger generation (manual click or force refresh)
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
      } else {
        throw new Error("Failed to receive structured insights output.");
      }
    } catch (err) {
      console.error("Error generating sales insights:", err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to generate AI pipeline insights.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Thumbs Up / Down feedback
  const handleFeedback = async (helpful) => {
    if (feedbackGiven) return;
    setFeedbackGiven(helpful ? "up" : "down");
    try {
      await api.post("/analytics/sales-insights/feedback", {
        helpful,
        feedbackText: helpful ? "Positive observation" : "Needs improvement"
      });
      setFeedbackMessage("Thank you for your feedback!");
    } catch (err) {
      console.error("Failed to record feedback:", err);
    }
  };

  // Route Sanitizer: Maps AI route variations to exact React Router paths in App.jsx
  const sanitizeRoute = (route) => {
    if (!route) return null;
    const r = route.trim().toLowerCase();
    if (r.includes("outstanding")) return "/outstanding-report";
    if (r === "/invoices" || r === "/sales" || r === "/invoice") return "/sales-invoice";
    if (r.includes("sales-report") || r.includes("salesreport")) return "/sales-report";
    if (r === "/products" || r === "/items" || r === "/stock") return "/inventory";
    if (r === "/reports") return "/reports-dashboard";
    return route;
  };

  // Helpers for formatting health score badges & colors
  const getScoreBadge = (score) => {
    if (score >= 80) {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
        label: "Healthy Pipeline",
        icon: ShieldCheck,
        colorClass: "text-emerald-500"
      };
    } else if (score >= 50) {
      return {
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-500",
        label: "Attention Required",
        icon: Info,
        colorClass: "text-amber-500"
      };
    } else {
      return {
        bg: "bg-rose-500/10 border-rose-500/30 text-rose-500",
        label: "High Receivables Risk",
        icon: AlertCircle,
        colorClass: "text-rose-500"
      };
    }
  };

  const getPriorityTag = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "bg-rose-500/15 border-rose-500/30 text-rose-500";
      case "MEDIUM":
        return "bg-amber-500/15 border-amber-500/30 text-amber-500";
      default:
        return "bg-blue-500/15 border-blue-500/30 text-blue-400";
    }
  };

  const formatFreshness = (timestamp) => {
    if (!timestamp) return "Just now";
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  };

  // --- STATE 1: LOADING SKELETON ---
  if (loading) {
    return (
      <div className="bg-card p-6 rounded-xl shadow-lg border border-border/80 relative overflow-hidden space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="h-5 w-44 bg-muted rounded-md"></div>
          </div>
          <div className="h-7 w-24 bg-muted rounded-full"></div>
        </div>

        <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
          <div className="w-16 h-16 rounded-full bg-muted shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 w-3/4 bg-muted rounded"></div>
            <div className="h-3 w-1/2 bg-muted rounded"></div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="h-4 w-1/3 bg-muted rounded"></div>
          <div className="h-3 w-full bg-muted rounded"></div>
          <div className="h-3 w-5/6 bg-muted rounded"></div>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground font-medium animate-bounce flex items-center justify-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Analyzing sales velocity, receivables, and revenue pipeline...</span>
          </p>
        </div>
      </div>
    );
  }

  // --- STATE 2: EMPTY STATE (HYBRID TRIGGER) ---
  if (!hasCache || !insights) {
    return (
      <div className="bg-gradient-to-br from-card via-card to-primary/5 p-6 rounded-xl shadow-lg border border-border/80 relative overflow-hidden flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base tracking-tight">AI Pipeline Insights</h3>
              <p className="text-xs text-muted-foreground">Revenue Operations Advisor</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
            Gemini 2.5
          </span>
        </div>

        <div className="py-4 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Real-Time Pipeline Intelligence</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Analyze deal stages, outstanding balances, and sales velocity instantly.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={() => handleGenerateInsights(false)}
            className="w-full py-3 px-4 bg-gradient-to-r from-primary via-primary/95 to-accent hover:opacity-95 text-primary-foreground font-bold text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Generate AI Pipeline Insights</span>
          </button>
        </div>
      </div>
    );
  }

  // --- STATE 3: LOADED INSIGHTS CARD ---
  const { healthScore, headline, insights: observations = [], recommendations = [], generatedAt } = insights;
  const badgeInfo = getScoreBadge(healthScore);
  const BadgeIcon = badgeInfo.icon;

  return (
    <div className="bg-card p-6 rounded-xl shadow-lg border border-border/80 relative overflow-hidden space-y-5 text-foreground">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base tracking-tight">AI Pipeline Insights</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {formatFreshness(generatedAt)}
              </span>
              <span className="text-muted-foreground/40">&bull;</span>
              <span className="text-[10px] font-semibold text-primary/80">Gemini 2.5 Flash</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleGenerateInsights(true)}
          title="Re-analyze Sales Pipeline"
          className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Health Score & Headline Banner */}
      <div className="bg-muted/30 border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
        {/* Radial Score Display */}
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-muted/60"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={badgeInfo.colorClass}
              strokeDasharray={`${healthScore}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-black text-foreground tracking-tight leading-none">{healthScore}</span>
            <span className="text-[8px] font-semibold text-muted-foreground uppercase">Score</span>
          </div>
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <BadgeIcon className={`w-4 h-4 ${badgeInfo.colorClass}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${badgeInfo.colorClass}`}>
              {badgeInfo.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{headline}</p>
        </div>
      </div>

      {/* Data Observations */}
      {observations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Observations</h4>
          <ul className="space-y-2">
            {observations.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs font-medium text-muted-foreground/90 leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actionable Recommendations with Direct Routing */}
      {recommendations.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prioritized Action Items</h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => {
              const targetRoute = sanitizeRoute(rec.suggestedRoute || rec.route);
              return (
                <div key={idx} className="p-3 bg-muted/40 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${getPriorityTag(rec.priority)}`}>
                      {rec.priority}
                    </span>
                    <p className="text-xs font-semibold text-foreground leading-snug">
                      {rec.actionText || rec.action}
                    </p>
                  </div>

                  {targetRoute && (
                    <Link
                      to={targetRoute}
                      className="self-end sm:self-center px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-lg transition flex items-center gap-1 shrink-0"
                    >
                      <span>Execute</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Feedback Controls */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span>Was this insight helpful?</span>
        <div className="flex items-center gap-2">
          {feedbackMessage ? (
            <span className="text-[11px] font-semibold text-emerald-500">{feedbackMessage}</span>
          ) : (
            <>
              <button
                onClick={() => handleFeedback(true)}
                title="Helpful"
                className={`p-1.5 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500 transition ${feedbackGiven === "up" ? "text-emerald-500 font-bold" : ""}`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFeedback(false)}
                title="Needs Improvement"
                className={`p-1.5 rounded-md hover:bg-rose-500/10 hover:text-rose-500 transition ${feedbackGiven === "down" ? "text-rose-500 font-bold" : ""}`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
