import { useState, useEffect, useCallback } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { formatINR, formatCount } from "../../utils/formatters";
import { AlertCircle, Loader2, Printer, Users, Truck } from "lucide-react";

/**
 * Customer receivable and vendor payable balances register.
 */
function OutstandingReport() {
  const [activeTab, setActiveTab] = useState("customer");

  const [customerData, setCustomerData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOutstandingReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/reports/outstanding");
      setCustomerData(res.data.customers || []);
      setVendorData(res.data.vendors || []);
    } catch (err) {
      console.error("Failed to load outstanding report:", err);
      setError("Failed to load outstanding balances. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOutstandingReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOutstandingReport]);

  const totalReceivable = customerData.reduce((total, item) => total + item.outstanding, 0);
  const totalPayable = vendorData.reduce((total, item) => total + item.outstanding, 0);
  const activeRows = activeTab === "customer" ? customerData : vendorData;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Outstanding Balances"
        subtitle="Track overdue customer receivables and pending supplier payables"
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-secondary/70 text-xs font-medium text-foreground cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        }
      />

      <ValidationMessage
        type="error"
        message={error}
        onDismiss={() => setError("")}
        className="mt-0!"
      />

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
          <span>Loading outstanding balances&hellip;</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CommonCard
              title="Total Receivable (Customers)"
              value={formatINR(totalReceivable)}
              color="text-success"
              subtitle={formatCount(customerData.length, "customer account")}
              icon={Users}
            />
            <CommonCard
              title="Total Payable (Vendors)"
              value={formatINR(totalPayable)}
              color="text-destructive"
              subtitle={formatCount(vendorData.length, "supplier account")}
              icon={Truck}
            />
          </div>

          <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 no-print">
                <button
                  type="button"
                  onClick={() => setActiveTab("customer")}
                  className={`h-8 px-3.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "customer"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Customer Receivables ({customerData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("vendor")}
                  className={`h-8 px-3.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "vendor"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Vendor Payables ({vendorData.length})
                </button>
              </div>
              <StatusBadge variant="neutral">
                <AlertCircle className="w-3 h-3" />
                <span>{activeTab === "customer" ? "Receivable Dr" : "Payable Cr"}</span>
              </StatusBadge>
            </div>

            <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5">Party Name</th>
                    <th className="px-4 py-2.5">Mobile</th>
                    <th className="px-4 py-2.5 text-right">Outstanding Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {activeRows.map((item, index) => (
                    <tr key={index} className="elevated-table-row transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">
                        {item.mobile || "-"}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                          activeTab === "customer" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatINR(item.outstanding)}
                      </td>
                    </tr>
                  ))}
                  {activeRows.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-xs text-muted-foreground">
                        No outstanding balances found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrapper>
          </div>
        </>
      )}
    </div>
  );
}

export default OutstandingReport;
