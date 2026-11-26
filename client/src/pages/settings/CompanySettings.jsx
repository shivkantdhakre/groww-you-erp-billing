import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import ValidationMessage from "../../components/common/ValidationMessage";
import { Building, Loader2, Save, Lock } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Organization legal entity, GSTIN, invoice numbering prefix, and financial year lock controls.
 */
function CompanySettings() {
  const fetchCompany = useStore((state) => state.fetchCompany);
  const updateCompany = useStore((state) => state.updateCompany);
  const loading = useStore((state) => state.loadingCompany);

  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [currentFinancialYearStart, setCurrentFinancialYearStart] = useState("");
  const [financialYearLocked, setFinancialYearLocked] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchCompany()
      .then((data) => {
        if (data) {
          setCompanyName(data.name || "");
          setGstNumber(data.gstNumber || "");
          setMobile(data.mobileNumber || "");
          setAddress(data.address || "");
          setFinancialYear(data.financialYear || "");
          setInvoicePrefix(data.invoicePrefix || "");
          setFinancialYearLocked(data.financialYearLocked || false);
          setCurrentFinancialYearStart(
            data.currentFinancialYearStart ? data.currentFinancialYearStart.split("T")[0] : ""
          );
        }
      })
      .catch((err) => {
        console.error("Failed to load company settings:", err);
        setMessage("Failed to load company settings from server.");
        setMessageType("error");
      });
  }, [fetchCompany]);

  const saveSettings = async () => {
    if (!companyName) {
      setMessage("Company Name is required");
      setMessageType("error");
      return;
    }

    const trimmedGst = gstNumber.trim().toUpperCase();
    if (trimmedGst) {
      if (trimmedGst.length !== 15) {
        setMessage("Invalid GST Number (must be 15 characters)");
        setMessageType("error");
        return;
      }
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(trimmedGst)) {
        setMessage(
          "Invalid GST Number Format (e.g. 07ABCDE1234F2Z5). The 14th character must be 'Z'."
        );
        setMessageType("error");
        return;
      }
    }

    if (mobile && mobile.length !== 10) {
      setMessage("Invalid Mobile Number (must be 10 digits)");
      setMessageType("error");
      return;
    }

    try {
      await updateCompany({
        name: companyName,
        gstNumber: trimmedGst,
        mobileNumber: mobile,
        address,
        financialYear,
        invoicePrefix,
        financialYearLocked,
        currentFinancialYearStart: currentFinancialYearStart
          ? new Date(currentFinancialYearStart).toISOString()
          : null,
      });
      setMessage("Company settings saved successfully.");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to save company settings:", err);
      const serverError = err.response?.data;
      let errMsg = "Failed to save settings. Please try again.";
      if (serverError) {
        if (serverError.error === "Validation failed" && Array.isArray(serverError.details)) {
          errMsg = `Validation failed: ${serverError.details
            .map((d) => `${d.field}: ${d.message}`)
            .join(", ")}`;
        } else {
          errMsg = serverError.message || serverError.error || errMsg;
        }
      }
      setMessage(errMsg);
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
        <span>Loading company configuration...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5 text-foreground">
      <CommonPageHeader
        title="Company Settings"
        subtitle="Configure legal organization profile, GST registration, invoice prefixes, and period locks"
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow divide-y divide-border">
        {/* Section 1: Legal Details */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary-text" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Organization & GST Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Company Name *</label>
              <input
                type="text"
                placeholder="Legal entity name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>GSTIN Number</label>
              <input
                type="text"
                placeholder="15-character GSTIN"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                className={`${INPUT_CLASS} font-mono uppercase`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Registered Mobile</label>
              <input
                type="text"
                placeholder="10-digit contact number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={`${INPUT_CLASS} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Invoice Series Prefix</label>
              <input
                type="text"
                placeholder="e.g. GY-"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Registered Address</label>
              <textarea
                placeholder="Registered office street, city, state and pincode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="p-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial Year */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary-text" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Financial Year & Lock Control</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Financial Year Label</label>
              <input
                type="text"
                placeholder="e.g. 2026-27"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>FY Start Date</label>
              <input
                type="date"
                value={currentFinancialYearStart}
                onChange={(e) => setCurrentFinancialYearStart(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <label
            htmlFor="fyLocked"
            className="flex items-start gap-2.5 p-3 rounded-md bg-secondary/40 border border-border cursor-pointer select-none"
          >
            <input
              type="checkbox"
              id="fyLocked"
              checked={financialYearLocked}
              onChange={(e) => setFinancialYearLocked(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-ring cursor-pointer"
            />
            <div>
              <span className="text-xs sm:text-sm font-medium text-foreground block">
                Lock Financial Year Period
              </span>
              <span className="text-xs text-muted-foreground">
                Prevent invoices and vouchers from being posted prior to the FY Start Date.
              </span>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-secondary/25 flex justify-end">
          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Company Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanySettings;
