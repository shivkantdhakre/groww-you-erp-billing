import { useState, useEffect, useMemo } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonCard from "../../components/common/CommonCard";
import CommonModal from "../../components/common/CommonModal";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import LeadDetailDrawer from "../../components/crm/LeadDetailDrawer";
import {
  Users,
  Plus,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Search,
  Building2,
  ChevronRight,
} from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

const STAGE_OPTIONS = [
  { id: "ALL", label: "All Stages" },
  { id: "NEW", label: "New" },
  { id: "QUALIFIED", label: "Qualified" },
  { id: "PROPOSAL_SENT", label: "Proposal Sent" },
  { id: "NEGOTIATION", label: "Negotiation" },
  { id: "CLOSED_WON", label: "Won" },
  { id: "CLOSED_LOST", label: "Lost" },
];

const getStageVariant = (stg) => {
  switch (stg) {
    case "CLOSED_WON":
      return "success";
    case "CLOSED_LOST":
      return "destructive";
    case "NEGOTIATION":
      return "warning";
    case "PROPOSAL_SENT":
      return "primary";
    case "QUALIFIED":
      return "accent";
    case "NEW":
    default:
      return "neutral";
  }
};

const getPriorityVariant = (priority) => {
  if (priority === "HIGH") return "destructive";
  if (priority === "LOW") return "neutral";
  return "warning";
};

const getRiskScoreVariant = (score) => {
  if (score <= 30) return "success";
  if (score <= 65) return "warning";
  return "destructive";
};

/**
 * B2B Sales Leads & AI Pipeline workspace preserving stage filtering,
 * lead creation modal, and slide-over AI executive profiler drawer.
 */
export default function Leads() {
  const leads = useStore((state) => state.leads);
  const loading = useStore((state) => state.loadingLeads);
  const fetchLeads = useStore((state) => state.fetchLeads);
  const addLeadStore = useStore((state) => state.addLead);
  const syncLeadInStore = useStore((state) => state.syncLeadInStore);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        notes: notes.trim(),
      });

      setShowAddModal(false);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setMobile("");
      setStage("NEW");
      setDealValue("");
      setNotes("");

      handleOpenDrawer(created.id);
    } catch (err) {
      console.error("Failed to create lead:", err);
      setFormError("Failed to create lead. Please verify details.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesStage = stageFilter === "ALL" || l.stage === stageFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (l.companyName && l.companyName.toLowerCase().includes(q)) ||
        (l.contactName && l.contactName.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.mobile && l.mobile.includes(q));
      return matchesStage && matchesSearch;
    });
  }, [leads, stageFilter, search]);

  const metrics = useMemo(() => {
    const totalCount = leads.length;
    const totalPipelineValue = leads.reduce((acc, l) => acc + (Number(l.dealValue) || 0), 0);
    const highPriorityCount = leads.filter((l) => l.aiPriority === "HIGH").length;
    const analyzedLeads = leads.filter(
      (l) => l.aiRiskScore !== null && l.aiRiskScore !== undefined
    );
    const avgRiskScore =
      analyzedLeads.length > 0
        ? Math.round(
            analyzedLeads.reduce((acc, l) => acc + l.aiRiskScore, 0) / analyzedLeads.length
          )
        : 0;

    return { totalCount, totalPipelineValue, highPriorityCount, avgRiskScore };
  }, [leads]);

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="CRM Leads & Sales Pipeline"
        subtitle="Manage account pipelines, review AI risk profiles, and prioritize commercial follow-ups"
        badge={
          <StatusBadge variant="primary">
            <Sparkles className="w-3 h-3" />
            <span>AI Profiler Ready</span>
          </StatusBadge>
        }
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add B2B Lead</span>
          </button>
        }
      />

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CommonCard
          title="Total Active Leads"
          value={String(metrics.totalCount)}
          subtitle="Pipeline accounts logged"
          icon={Users}
        />
        <CommonCard
          title="Total Pipeline Value"
          value={`₹ ${metrics.totalPipelineValue.toLocaleString("en-IN")}`}
          color="text-success"
          subtitle="Combined deal opportunity"
          icon={TrendingUp}
        />
        <CommonCard
          title="High Priority Deals"
          value={String(metrics.highPriorityCount)}
          color={metrics.highPriorityCount > 0 ? "text-destructive" : "text-foreground"}
          subtitle="Flagged by AI Profiler"
          icon={AlertCircle}
        />
        <CommonCard
          title="Avg Deal Risk Score"
          value={`${metrics.avgRiskScore} / 100`}
          color={
            metrics.avgRiskScore <= 30
              ? "text-success"
              : metrics.avgRiskScore <= 65
                ? "text-warning"
                : "text-destructive"
          }
          subtitle="Sentiment & stage weighted"
          icon={Sparkles}
        />
      </div>

      {/* Filter & Stage Strip */}
      <div className="p-4 rounded-lg bg-card border border-border surface-shadow flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search company, contact, mobile, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-3 w-full text-xs sm:text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
          {STAGE_OPTIONS.map((stg) => (
            <button
              key={stg.id}
              type="button"
              onClick={() => setStageFilter(stg.id)}
              className={`h-7 px-3 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                stageFilter === stg.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              {stg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Register */}
      <TableWrapper loading={loading} totalItems={filteredLeads.length}>
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-2.5">Account / Company</th>
              <th className="px-4 py-2.5">Stage</th>
              <th className="px-4 py-2.5 text-right">Deal Value</th>
              <th className="px-4 py-2.5">Risk Score</th>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5 hidden xl:table-cell">AI Summary</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => handleOpenDrawer(lead.id)}
                  className="elevated-table-row cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary-text shrink-0" />
                      <span>{lead.companyName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lead.contactName || "No contact"}
                      {lead.mobile ? ` · ${lead.mobile}` : ""}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge variant={getStageVariant(lead.stage)}>
                      {lead.stage.replace(/_/g, " ")}
                    </StatusBadge>
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground tabular-nums whitespace-nowrap">
                    ₹ {Number(lead.dealValue || 0).toLocaleString("en-IN")}
                  </td>

                  <td className="px-4 py-3">
                    {lead.aiRiskScore !== null && lead.aiRiskScore !== undefined ? (
                      <StatusBadge variant={getRiskScoreVariant(lead.aiRiskScore)} className="tabular-nums">
                        {lead.aiRiskScore} / 100
                      </StatusBadge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not analyzed</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {lead.aiPriority ? (
                      <StatusBadge variant={getPriorityVariant(lead.aiPriority)}>
                        {lead.aiPriority}
                      </StatusBadge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 max-w-xs hidden xl:table-cell">
                    {lead.aiSummary ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {lead.aiSummary}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary-text" />
                        <span>Open drawer to analyze</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer(lead.id);
                      }}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-primary-text cursor-pointer transition-colors"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-xs">
                  No leads matching your current search or stage filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>

      {/* Detail Slide-Over Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedLeadId(null);
        }}
        onLeadUpdated={(updated) => syncLeadInStore(updated)}
      />

      {/* Add Lead Modal */}
      <CommonModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New B2B Lead"
        size="lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <ValidationMessage
            type="error"
            message={formError}
            onDismiss={() => setFormError("")}
            className="mt-0!"
          />

          <div>
            <label className={LABEL_CLASS}>Company / Account Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp India"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={LABEL_CLASS}>Contact Person Name</label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={`${INPUT_CLASS} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Email Address</label>
              <input
                type="email"
                placeholder="rajesh@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Deal Value (₹)</label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className={`${INPUT_CLASS} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Deal Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="NEW">NEW - Fresh Opportunity</option>
              <option value="QUALIFIED">QUALIFIED - Discovery Completed</option>
              <option value="PROPOSAL_SENT">PROPOSAL_SENT - Proposal Shared</option>
              <option value="NEGOTIATION">NEGOTIATION - Contract Review</option>
              <option value="CLOSED_WON">CLOSED_WON - Deal Signed</option>
              <option value="CLOSED_LOST">CLOSED_LOST - Opportunity Lost</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Initial Account Notes</label>
            <textarea
              rows={3}
              placeholder="Enter discovery notes, requirements, and budget scope..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="h-8 px-3.5 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Saving..." : "Save Lead & Open Details"}
            </button>
          </div>
        </form>
      </CommonModal>
    </div>
  );
}
