import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";

function OutstandingReport() {
  const [activeTab, setActiveTab] = useState("customer");

  const [customerData, setCustomerData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOutstandingReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/outstanding");
      setCustomerData(res.data.customers || []);
      setVendorData(res.data.vendors || []);
    } catch (err) {
      console.error("Failed to load outstanding report:", err);
      alert("Failed to load outstanding report");
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

  const totalReceivable = customerData.reduce(
    (total, item) => total + item.outstanding,
    0
  );

  const totalPayable = vendorData.reduce(
    (total, item) => total + item.outstanding,
    0
  );

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Outstanding Report
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track receivables and payables
        </p>
      </div>

      {loading && (
        <div className="text-center mt-6 text-muted-foreground font-semibold flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading outstanding balances...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Receivable (Customers)</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                ₹ {totalReceivable.toFixed(2)}
              </p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Payable (Vendors)</p>
              <p className="text-3xl font-bold text-destructive mt-1">
                ₹ {totalPayable.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 no-print">
            <button
              onClick={() => setActiveTab("customer")}
              className={`px-5 py-2.5 rounded-lg cursor-pointer font-semibold transition-colors text-sm shadow-sm ${
                activeTab === "customer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Customer Outstanding
            </button>

            <button
              onClick={() => setActiveTab("vendor")}
              className={`px-5 py-2.5 rounded-lg cursor-pointer font-semibold transition-colors text-sm shadow-sm ${
                activeTab === "vendor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Vendor Outstanding
            </button>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-4 text-left font-semibold">Name</th>
                    <th className="p-4 text-center font-semibold">Mobile</th>
                    <th className="p-4 text-right font-semibold">Outstanding Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {(activeTab === "customer" ? customerData : vendorData).map(
                    (item, index) => (
                      <tr key={index} className="hover:bg-secondary/20 transition-colors duration-150">
                        <td className="p-4 text-left font-medium text-foreground">{item.name}</td>
                        <td className="p-4 text-center text-muted-foreground">{item.mobile || "-"}</td>
                        <td className={`p-4 text-right font-mono font-bold ${activeTab === "customer" ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}>
                          ₹ {item.outstanding.toFixed(2)}
                        </td>
                      </tr>
                    )
                  )}
                  {(activeTab === "customer" ? customerData : vendorData).length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-muted-foreground font-medium">
                        No outstanding balances found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OutstandingReport;