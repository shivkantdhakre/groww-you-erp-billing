import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonModal from "../../components/common/CommonModal";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  FileJson,
  UploadCloud,
  Truck,
  Link2,
  Loader2,
} from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

/**
 * GST compliance, GSTR-3B readiness, GSTR-1 return filing, orphan credit-note reconciliation,
 * and >= ₹50,000 E-Way Bill dispatch console.
 */
export default function ComplianceDashboard() {
  const token = useStore((state) => state.token);
  const [month, setMonth] = useState(() =>
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [year, setYear] = useState(() => String(new Date().getFullYear()));

  const [healthStatus, setHealthStatus] = useState({
    blockFiling: false,
    issues: { items: [], customers: [], branches: [] },
  });
  const [gstr3b, setGstr3b] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [showEwayModal, setShowEwayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [transporterId, setTransporterId] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [transportMode, setTransportMode] = useState("ROAD");
  const [vehicleNo, setVehicleNo] = useState("");
  const [distanceKm, setDistanceKm] = useState("150");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [otpCooldown, setOtpCooldown] = useState(0);
  const [proactiveWarning, setProactiveWarning] = useState(false);
  const [orphanedReturns, setOrphanedReturns] = useState([]);
  const [reconcilingReturn, setReconcilingReturn] = useState(null);
  const [legacyInvoiceNo, setLegacyInvoiceNo] = useState("");
  const [legacyInvoiceDate, setLegacyInvoiceDate] = useState("");
  const [mappingError, setMappingError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  const loadComplianceData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const [healthRes, salesRes] = await Promise.all([
        api.get(`/compliance/gst/health?month=${month}&year=${year}`),
        api.get("/transactions/sales-invoices?limit=100"),
      ]);

      setHealthStatus(
        healthRes.data || { blockFiling: false, issues: { items: [], customers: [], branches: [] } }
      );

      const salesList = Array.isArray(salesRes.data)
        ? salesRes.data
        : salesRes.data?.data || [];

      const currentMonthInvoices = salesList.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        const invMonth = String(invDate.getMonth() + 1).padStart(2, "0");
        const invYear = String(invDate.getFullYear());
        return invMonth === month && invYear === year;
      });
      setInvoices(currentMonthInvoices);

      try {
        const sessionStatusRes = await api.get("/compliance/gst/session-status");
        const { active: isSessionActive, expiresAt: sessionExpiresAt } = sessionStatusRes.data;
        if (isSessionActive && sessionExpiresAt) {
          const remainingMs = new Date(sessionExpiresAt).getTime() - Date.now();
          setProactiveWarning(remainingMs > 0 && remainingMs < 30 * 60 * 1000);
        } else {
          setProactiveWarning(false);
        }
      } catch (err) {
        console.error("Error fetching session status:", err);
      }

      try {
        const orphansRes = await api.get("/compliance/orphans");
        setOrphanedReturns(orphansRes.data || []);
      } catch (err) {
        console.error("Error fetching orphaned returns:", err);
      }

      try {
        const gstrRes = await api.get(
          `/compliance/gst/gstr3b/summary?month=${month}&year=${year}`
        );
        setGstr3b(gstrRes.data);
      } catch (err) {
        if (err.response?.data?.error === "GSTN_SESSION_EXPIRED") {
          setGstr3b(null);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error("Error loading compliance details:", err);
      setErrorMsg("Failed to load compliance details. Verify GST portal authentication.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => {
        loadComplianceData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [token, loadComplianceData]);

  useEffect(() => {
    const expiry = localStorage.getItem("gsp_otp_cooldown_expiry");
    if (expiry) {
      const remaining = Math.ceil((parseInt(expiry, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        const timer = setTimeout(() => {
          setOtpCooldown(remaining);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.removeItem("gsp_otp_cooldown_expiry");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const handleRequestOtp = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.post("/compliance/gst/otp/request", {});
      setSuccessMsg("OTP request dispatched. Enter the 6-digit verification code below.");
      const expiry = Date.now() + 180 * 1000;
      localStorage.setItem("gsp_otp_cooldown_expiry", String(expiry));
      setOtpCooldown(180);
    } catch (err) {
      console.error("Failed to trigger portal OTP:", err);
      setErrorMsg("Failed to dispatch GST portal OTP. Verify GSP credentials.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!otp) return;

    try {
      await api.post("/compliance/gst/otp/verify", { otp });
      setSuccessMsg("GST portal session established.");
      setShowOtpModal(false);
      setOtp("");
      localStorage.removeItem("gsp_otp_cooldown_expiry");
      setOtpCooldown(0);
      loadComplianceData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "OTP verification failed.");
    }
  };

  const handleWriteOff = async (returnId) => {
    setErrorMsg("");
    setSuccessMsg("");
    setResolvingId(returnId);
    try {
      await api.post("/compliance/orphans/resolve", {
        returnId,
        action: "WRITE_OFF",
      });
      setSuccessMsg("Credit return written off and excluded from GSTR-1 staging.");
      loadComplianceData();
    } catch (err) {
      console.error("Write off failed:", err);
      setErrorMsg("Failed to write off return record.");
    } finally {
      setResolvingId(null);
    }
  };

  const handleMapSubmit = async (e) => {
    e.preventDefault();
    setMappingError("");
    setErrorMsg("");
    setSuccessMsg("");

    const retDate = new Date(reconcilingReturn.returnDate);
    const invDate = new Date(legacyInvoiceDate);
    if (invDate > retDate) {
      setMappingError("Original invoice date cannot be after the credit return date.");
      return;
    }

    setResolvingId(reconcilingReturn.id);
    try {
      await api.post("/compliance/orphans/resolve", {
        returnId: reconcilingReturn.id,
        action: "MAP_INVOICE",
        invoiceNo: legacyInvoiceNo,
        invoiceDate: legacyInvoiceDate,
      });
      setSuccessMsg("Orphaned return mapped to original invoice.");
      setReconcilingReturn(null);
      setLegacyInvoiceNo("");
      setLegacyInvoiceDate("");
      loadComplianceData();
    } catch (err) {
      setMappingError(
        err.response?.data?.message || err.response?.data?.error || "Failed to map return to invoice."
      );
    } finally {
      setResolvingId(null);
    }
  };

  const handlePreviewGstr1 = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await api.get(`/compliance/gst/gstr1/preview?month=${month}&year=${year}`);
      setPreviewData(res.data);
    } catch (err) {
      console.error("Preview GSTR-1 failed:", err);
      setErrorMsg("Failed to load GSTR-1 payload preview.");
    }
  };

  const handleFileGstr1 = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await api.post("/compliance/gst/gstr1/file", { month, year });
      setSuccessMsg(`GSTR-1 uploaded successfully. Filing Ref: ${res.data.referenceId}`);
      setPreviewData(null);
      loadComplianceData();
    } catch (err) {
      if (err.response?.data?.error === "GSTN_SESSION_EXPIRED") {
        setShowOtpModal(true);
      } else {
        setErrorMsg(
          err.response?.data?.message || err.response?.data?.error || "GSTR-1 filing failed."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const openEwayModal = (inv) => {
    setSelectedInvoice(inv);
    setTransporterId("");
    setTransporterName("");
    setTransportMode("ROAD");
    setVehicleNo("");
    setDistanceKm("150");
    setShowEwayModal(true);
  };

  const handleGenerateEwayBill = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const distVal = parseInt(distanceKm, 10);

    if (Number.isNaN(distVal) || distVal < 1 || distVal > 4000) {
      setErrorMsg("Distance must be a valid number between 1 and 4000 km.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/compliance/ewaybill/generate/${selectedInvoice.id}`, {
        transporterId,
        transporterName,
        transportMode,
        vehicleNo,
        distanceKm: distVal,
      });
      setSuccessMsg(`E-Way Bill generated. EWB Number: ${res.data.ewayBillNo}`);
      setShowEwayModal(false);
      loadComplianceData();
    } catch (err) {
      if (err.response?.data?.error === "GSTN_SESSION_EXPIRED") {
        setShowEwayModal(false);
        setShowOtpModal(true);
      } else {
        setErrorMsg(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "E-Way Bill generation failed."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const highValueInvoices = invoices.filter((inv) => inv.grandTotal >= 50000);

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="GST & E-Way Compliance"
        subtitle="GSTR-3B tax liability, GSTR-1 monthly filing staging, credit-note reconciliation, and E-Way bills"
        badge={
          gstr3b ? (
            <StatusBadge variant="success">
              <CheckCircle2 className="w-3 h-3" />
              <span>GSTN Session Active</span>
            </StatusBadge>
          ) : (
            <StatusBadge variant="warning">Session Auth Required</StatusBadge>
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filing Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-foreground text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filing Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border bg-card text-foreground text-xs font-medium font-mono cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
            {!gstr3b && (
              <button
                type="button"
                onClick={() => setShowOtpModal(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Authenticate GST Portal</span>
              </button>
            )}
          </div>
        }
      />

      <ValidationMessage
        type="error"
        message={errorMsg}
        onDismiss={() => setErrorMsg("")}
        className="mt-0!"
      />
      <ValidationMessage
        type="success"
        message={successMsg}
        onDismiss={() => setSuccessMsg("")}
        className="mt-0!"
      />

      {/* Proactive Session Expiry Suggestion */}
      {proactiveWarning && (
        <div className="px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs sm:text-sm font-semibold">GSTN Session Expiring Soon</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current portal authorization expires in under 30 minutes. Refresh OTP before bulk filing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOtpModal(true)}
            className="h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer shrink-0"
          >
            Refresh OTP Session
          </button>
        </div>
      )}

      {/* Data Health Blockers */}
      {healthStatus.blockFiling && (
        <div className="p-4 sm:p-5 rounded-lg bg-warning/10 border border-warning/30 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Data Health Blockers Detected</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resolve missing HSN codes or pincodes below before filing GSTR-1 or generating E-Way bills.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {healthStatus.issues.items.length > 0 && (
              <div className="bg-card border border-border rounded-md p-3">
                <p className="text-xs font-semibold text-foreground mb-1.5">
                  Items missing HSN
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  {healthStatus.issues.items.map((i) => (
                    <li key={i.id}>
                      {i.name} ({i.sku})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {healthStatus.issues.customers.length > 0 && (
              <div className="bg-card border border-border rounded-md p-3">
                <p className="text-xs font-semibold text-foreground mb-1.5">
                  Customers missing Pincode
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  {healthStatus.issues.customers.map((c) => (
                    <li key={c.id}>
                      {c.name} ({c.mobile})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {healthStatus.issues.branches.length > 0 && (
              <div className="bg-card border border-border rounded-md p-3">
                <p className="text-xs font-semibold text-foreground mb-1.5">
                  Branches missing Pincode
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  {healthStatus.issues.branches.map((b) => (
                    <li key={b.id}>{b.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GSTR-3B Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CommonCard
          title="Outward Sales Tax (GSTR-3B Liability)"
          value={
            gstr3b
              ? `₹ ${gstr3b.summary.outwardSupplies.taxableValue.toLocaleString("en-IN")}`
              : "Auth Required"
          }
          color={gstr3b ? "text-foreground" : "text-muted-foreground"}
          subtitle={
            gstr3b
              ? `CGST: ₹ ${gstr3b.summary.outwardSupplies.cgst.toLocaleString("en-IN")} · SGST: ₹ ${gstr3b.summary.outwardSupplies.sgst.toLocaleString("en-IN")}`
              : "Authenticate GST portal session to retrieve live return summary"
          }
          icon={Shield}
        />

        <CommonCard
          title="Eligible Input Tax Credit (ITC)"
          value={
            gstr3b
              ? `₹ ${(gstr3b.summary.eligibleItc.cgst + gstr3b.summary.eligibleItc.sgst).toLocaleString("en-IN")}`
              : "Auth Required"
          }
          color={gstr3b ? "text-success" : "text-muted-foreground"}
          subtitle={
            gstr3b
              ? `CGST: ₹ ${gstr3b.summary.eligibleItc.cgst.toLocaleString("en-IN")} · SGST: ₹ ${gstr3b.summary.eligibleItc.sgst.toLocaleString("en-IN")}`
              : "Authenticate GST portal session to inspect ITC eligibility"
          }
          icon={CheckCircle2}
        />
      </div>

      {/* GSTR-1 Monthly Filing */}
      <div className="bg-card p-5 rounded-lg border border-border surface-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">GSTR-1 Monthly Return Staging</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preview B2B / B2CS outward payload or file return to GSTN staging
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewGstr1}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium cursor-pointer transition-colors"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Preview Payload</span>
            </button>
            <button
              type="button"
              onClick={handleFileGstr1}
              disabled={healthStatus.blockFiling || loading}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>{loading ? "Uploading..." : "File GSTR-1 to Staging"}</span>
            </button>
          </div>
        </div>

        {previewData && (
          <div className="bg-background border border-border rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                GSTR-1 JSON Payload Preview
              </span>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="text-xs font-mono text-foreground overflow-x-auto max-h-72 scrollbar-thin">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Orphaned Credit Notes Reconciliation */}
      {orphanedReturns.length > 0 && (
        <div className="bg-card rounded-lg border border-warning/40 surface-shadow overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-warning/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span>Pending Reconciliations: Orphaned Credit Notes</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                GSTN requires an original invoice number and date for CDNR returns.
              </p>
            </div>
            <StatusBadge variant="warning tabular-nums">{orphanedReturns.length} pending</StatusBadge>
          </div>

          <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Return No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {orphanedReturns.map((ret) => (
                  <tr key={ret.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                      {ret.returnNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {new Date(ret.returnDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {ret.customer?.name || "Walk-in Customer"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                      ₹ {Number(ret.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReconcilingReturn(ret)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Map Invoice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWriteOff(ret.id)}
                          disabled={resolvingId === ret.id}
                          className="h-7 px-2.5 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium cursor-pointer disabled:opacity-50"
                        >
                          {resolvingId === ret.id ? "Processing..." : "Write Off"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        </div>
      )}

      {/* E-Way Bill Generation */}
      <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-text" />
              <span>E-Way Bill Queue (Invoices &ge; ₹50,000)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mandatory transit permits for high-value invoices in the selected period
            </p>
          </div>
          <StatusBadge variant="neutral tabular-nums">
            {highValueInvoices.length} eligible
          </StatusBadge>
        </div>

        <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Invoice No</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">E-Way Bill No</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {highValueInvoices.map((inv) => (
                <tr key={inv.id} className="elevated-table-row transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                    {inv.invoiceNo}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {new Date(inv.invoiceDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {inv.customer?.name || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                    ₹ {Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {inv.ewayBillNo ? (
                      <span className="text-foreground font-semibold">{inv.ewayBillNo}</span>
                    ) : (
                      <span className="text-muted-foreground">Not generated</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!inv.ewayBillNo ? (
                      <button
                        type="button"
                        onClick={() => openEwayModal(inv)}
                        disabled={healthStatus.blockFiling}
                        className="h-7 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer disabled:opacity-50"
                      >
                        Generate E-Way
                      </button>
                    ) : (
                      <StatusBadge variant="success">Generated</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
              {highValueInvoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No invoices exceeding ₹50,000 found for {MONTHS.find((m) => m.value === month)?.label} {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

      {/* Portal OTP Modal */}
      <CommonModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="GST Portal OTP Authentication"
        description="A verification code is dispatched via your registered GSP contact."
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleRequestOtp}
            disabled={otpCooldown > 0}
            className="h-8 px-3 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {otpCooldown > 0
              ? `Resend OTP (${Math.floor(otpCooldown / 60)}:${String(otpCooldown % 60).padStart(
                  2,
                  "0"
                )})`
              : "Send Portal OTP"}
          </button>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 123456"
                className={`${INPUT_CLASS} font-mono tracking-widest`}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="h-8 px-3.5 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer"
              >
                Verify & Connect
              </button>
            </div>
          </form>
        </div>
      </CommonModal>

      {/* Orphan Invoice Mapping Modal */}
      <CommonModal
        isOpen={Boolean(reconcilingReturn)}
        onClose={() => {
          setReconcilingReturn(null);
          setLegacyInvoiceNo("");
          setLegacyInvoiceDate("");
          setMappingError("");
        }}
        title={
          reconcilingReturn ? `Map Original Invoice · ${reconcilingReturn.returnNo}` : "Map Invoice"
        }
        description="Link this return to an existing ERP invoice or external legacy bill number."
      >
        {reconcilingReturn && (
          <form onSubmit={handleMapSubmit} className="space-y-4">
            <ValidationMessage
              type="error"
              message={mappingError}
              onDismiss={() => setMappingError("")}
              className="mt-0!"
            />

            <div>
              <label className={LABEL_CLASS}>Original Invoice No *</label>
              <input
                type="text"
                value={legacyInvoiceNo}
                onChange={(e) => setLegacyInvoiceNo(e.target.value)}
                placeholder="e.g. GY-2026-0001"
                className={`${INPUT_CLASS} font-mono`}
                required
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Original Invoice Date *</label>
              <input
                type="date"
                value={legacyInvoiceDate}
                onChange={(e) => setLegacyInvoiceDate(e.target.value)}
                className={INPUT_CLASS}
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Must be on or before the return date (
                {new Date(reconcilingReturn.returnDate).toLocaleDateString()}).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => {
                  setReconcilingReturn(null);
                  setLegacyInvoiceNo("");
                  setLegacyInvoiceDate("");
                  setMappingError("");
                }}
                className="h-8 px-3.5 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolvingId === reconcilingReturn.id}
                className="h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {resolvingId === reconcilingReturn.id ? "Linking..." : "Link Invoice"}
              </button>
            </div>
          </form>
        )}
      </CommonModal>

      {/* E-Way Parameters Modal */}
      <CommonModal
        isOpen={showEwayModal}
        onClose={() => setShowEwayModal(false)}
        title={
          selectedInvoice ? `Generate E-Way Bill · ${selectedInvoice.invoiceNo}` : "Generate E-Way Bill"
        }
        description={
          selectedInvoice
            ? `Destination: ${selectedInvoice.customer?.name || "Party"} (PIN: ${
                selectedInvoice.customer?.pincode || "N/A"
              })`
            : ""
        }
      >
        <form onSubmit={handleGenerateEwayBill} className="space-y-3.5">
          <div>
            <label className={LABEL_CLASS}>Transporter GSTIN</label>
            <input
              type="text"
              value={transporterId}
              onChange={(e) => setTransporterId(e.target.value)}
              placeholder="e.g. 09ABCDE1234F1Z5"
              className={`${INPUT_CLASS} font-mono uppercase`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Transporter Name</label>
            <input
              type="text"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              placeholder="e.g. VRL Logistics"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Vehicle Number *</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g. UP80AT1234"
                className={`${INPUT_CLASS} font-mono uppercase`}
                required
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Transport Mode</label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                <option value="ROAD">Road</option>
                <option value="RAIL">Rail</option>
                <option value="AIR">Air</option>
                <option value="SHIP">Ship</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Transit Distance (km) *</label>
            <input
              type="number"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              min="1"
              max="4000"
              className={`${INPUT_CLASS} font-mono tabular-nums`}
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Override NIC distance calculation (1–4000 km).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
            <button
              type="button"
              onClick={() => setShowEwayModal(false)}
              className="h-8 px-3.5 rounded-md border border-border bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium cursor-pointer"
            >
              Generate E-Way Bill
            </button>
          </div>
        </form>
      </CommonModal>
    </div>
  );
}
