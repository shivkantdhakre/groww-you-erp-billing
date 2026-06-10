import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";

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
            data.currentFinancialYearStart
              ? data.currentFinancialYearStart.split("T")[0]
              : ""
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

    if (gstNumber && gstNumber.length !== 15) {
      setMessage("Invalid GST Number (must be 15 characters)");
      setMessageType("error");
      return;
    }

    if (mobile && mobile.length !== 10) {
      setMessage("Invalid Mobile Number (must be 10 digits)");
      setMessageType("error");
      return;
    }

    try {
      await updateCompany({
        name: companyName,
        gstNumber,
        mobileNumber: mobile,
        address,
        financialYear,
        invoicePrefix,
        financialYearLocked,
        currentFinancialYearStart: currentFinancialYearStart ? new Date(currentFinancialYearStart).toISOString() : null,
      });
      setMessage("Company Settings Saved Successfully");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to save company settings:", err);
      setMessage("Failed to save settings. Please try again.");
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-xl shadow">
        <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-600 font-medium">Loading settings...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Company Settings</h1>
      <p className="text-gray-500 mb-6">Manage company setup information and locks</p>

      {message && (
        <div
          className={`p-3 rounded-lg mb-6 text-white ${
            messageType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Company Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="border p-3 rounded-lg"
            />
            <input
              type="text"
              placeholder="GST Number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className="border p-3 rounded-lg"
            />
            <input
              type="text"
              placeholder="Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="border p-3 rounded-lg"
            />
            <input
              type="text"
              placeholder="Invoice Prefix (e.g. GY-)"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="border p-3 rounded-lg"
            />
          </div>
          <textarea
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border p-3 rounded-lg w-full mt-4"
            rows="3"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Financial Year Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Financial Year (e.g. 2026-27)"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="border p-3 rounded-lg"
            />
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1 ml-1">FY Start Date</label>
              <input
                type="date"
                value={currentFinancialYearStart}
                onChange={(e) => setCurrentFinancialYearStart(e.target.value)}
                className="border p-3 rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 ml-1">
            <input
              type="checkbox"
              id="fyLocked"
              checked={financialYearLocked}
              onChange={(e) => setFinancialYearLocked(e.target.checked)}
              className="h-5 w-5"
            />
            <label htmlFor="fyLocked" className="font-semibold text-gray-700">
              Lock Financial Year (Prevent postings before FY Start Date)
            </label>
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold cursor-pointer transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default CompanySettings;