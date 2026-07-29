import { useState, useEffect, useMemo } from "react";
import { useStore } from "../../store/useStore";
import TableWrapper from "../../components/common/TableWrapper";
import LeadDetailDrawer from "../../components/crm/LeadDetailDrawer";
import {
  Users,
  Plus,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Search,
  Building2,
  Phone,
  Mail,
  DollarSign,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function Leads() {
  const leads = useStore((state) => state.leads);
  const loading = useStore((state) => state.loadingLeads);
  const fetchLeads = useStore((state) => state.fetchLeads);
  const addLeadStore = useStore((state) => state.addLead);

  // Filter & Search States
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  // Drawer & Modal State
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // New Lead Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [stage, setStage] = useState("NEW");
  const [dealValue, setDealValue] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeads().catch((err) => {
      console.error("Failed to load leads:", err);
    });
  }, [fetchLeads]);

  const handleOpenDrawer = (id) => {
    setSelectedLeadId(id);
    setDrawerOpen(true);
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setFormError("Company Name is required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const created = await addLeadStore({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        stage,
        dealValue: parseFloat(dealValue) || 0.0,
        notes: notes.trim()
      });

      setShowAddModal(false);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setMobile("");
      setStage("NEW");
      setDealValue("");
      setNotes("");

      // Open drawer directly for newly created lead
      handleOpenDrawer(created.id);
    } catch (err) {
      console.error("Failed to create lead:", err);
      setFormError("Failed to create lead. Please check details.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Leads list
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesStage = stageFilter === "ALL" || l.stage === stageFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || (
        (l.companyName && l.companyName.toLowerCase().includes(q)) ||
        (l.contactName && l.contactName.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.mobile && l.mobile.includes(q))
      );
      return matchesStage && matchesSearch;
    });
  }, [leads, stageFilter, search]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = leads.length;
    const totalPipelineValue = leads.reduce((acc, l) => acc + (Number(l.dealValue) || 0), 0);
    const highPriorityCount = leads.filter((l) => l.aiPriority === "HIGH").length;
    const analyzedLeads = leads.filter((l) => l.aiRiskScore !== null && l.aiRiskScore !== undefined);
    const avgRiskScore = analyzedLeads.length > 0
      ? Math.round(analyzedLeads.reduce((acc, l) => acc + l.aiRiskScore, 0) / analyzedLeads.length)
      : 0;

    return { totalCount, totalPipelineValue, highPriorityCount, avgRiskScore };
  }, [leads]);

  // Helper Badge Colors
  const getStageBadge = (stg) => {
    switch (stg) {
      case "CLOSED_WON":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "CLOSED_LOST":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "NEGOTIATION":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "PROPOSAL_SENT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "QUALIFIED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "NEW":
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === "HIGH") return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    if (priority === "LOW") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  };

  const getRiskScoreBadge = (score) => {
    if (score === null || score === undefined) return null;
    if (score <= 30) return { bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", label: "Low Risk" };
    if (score <= 65) return { bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", label: "Medium Risk" };
    return { bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", label: "High Risk" };
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">CRM Leads & Sales Pipeline</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Profiler Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage account pipelines, review AI Executive Summaries, and prioritize deal follow-ups.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add B2B Lead
        </button>
      </div>

      {/* METRICS DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Active Leads</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.totalCount}</p>
          <p className="text-xs text-muted-foreground">Pipeline accounts logged</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            ₹{metrics.totalPipelineValue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground">Combined deal opportunity value</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">High Priority Deals</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.highPriorityCount}</p>
          <p className="text-xs text-muted-foreground">Flagged by AI Profiler</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Deal Risk Score</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.avgRiskScore} / 100</p>
          <p className="text-xs text-muted-foreground">Based on interaction sentiment & stage</p>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search company, contact, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Pipeline Stage Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Stages" },
            { id: "NEW", label: "New" },
            { id: "QUALIFIED", label: "Qualified" },
            { id: "PROPOSAL_SENT", label: "Proposal Sent" },
            { id: "NEGOTIATION", label: "Negotiation" },
            { id: "CLOSED_WON", label: "Won" },
            { id: "CLOSED_LOST", label: "Lost" }
          ].map((stg) => (
            <button
              key={stg.id}
              onClick={() => setStageFilter(stg.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                stageFilter === stg.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {stg.label}
            </button>
          ))}
        </div>
      </div>

      {/* LEADS DATA TABLE */}
      <TableWrapper loading={loading} totalItems={filteredLeads.length}>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Account / Company</th>
              <th className="px-4 py-3.5 font-semibold">Stage</th>
              <th className="px-4 py-3.5 font-semibold">Deal Value</th>
              <th className="px-4 py-3.5 font-semibold">Risk Score</th>
              <th className="px-4 py-3.5 font-semibold">Priority</th>
              <th className="px-4 py-3.5 font-semibold">AI Executive Insights</th>
              <th className="px-4 py-3.5 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => {
                const riskBadge = getRiskScoreBadge(lead.aiRiskScore);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => handleOpenDrawer(lead.id)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    {/* Company & Contact */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        {lead.companyName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {lead.contactName || "No contact"} {lead.mobile ? `(${lead.mobile})` : ""}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStageBadge(lead.stage)}`}>
                        {lead.stage}
                      </span>
                    </td>

                    {/* Deal Value */}
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      ₹{Number(lead.dealValue || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Risk Score */}
                    <td className="px-4 py-3.5">
                      {lead.aiRiskScore !== null && lead.aiRiskScore !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${riskBadge.bg}`}>
                            {lead.aiRiskScore} / 100
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not Analyzed</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      {lead.aiPriority ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadge(lead.aiPriority)}`}>
                          {lead.aiPriority}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Executive Insights Preview */}
                    <td className="px-4 py-3.5 max-w-xs">
                      {lead.aiSummary ? (
                        <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                          {lead.aiSummary}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          Click row to generate AI summary
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(lead.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 group-hover:translate-x-0.5 transition-all"
                      >
                        View Drawer
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No leads found matching your search or filters. Click "Add B2B Lead" to create one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>

      {/* DETAIL DRAWER */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedLeadId(null);
        }}
        onLeadUpdated={(updated) => {
          // Sync state if needed
        }}
      />

      {/* ADD NEW LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Add New B2B Sales Lead
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Company / Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp India"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="rajesh@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Deal Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Deal Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden font-medium"
                >
                  <option value="NEW">NEW - Unqualified / Fresh Opportunity</option>
                  <option value="QUALIFIED">QUALIFIED - Discovery Completed</option>
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT - Commercial Proposal Shared</option>
                  <option value="NEGOTIATION">NEGOTIATION - Final Contract Review</option>
                  <option value="CLOSED_WON font-bold text-emerald-600">CLOSED_WON - Deal Signed</option>
                  <option value="CLOSED_LOST text-rose-600">CLOSED_LOST - Opportunity Lost</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted-foreground mb-1">Initial Account Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter initial discovery notes, pain points, budget details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Saving Lead..." : "Save Lead & Open Drawer"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
