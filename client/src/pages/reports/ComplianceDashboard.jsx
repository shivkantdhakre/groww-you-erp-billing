import { useState, useEffect } from "react";
import axios from "axios";
import { useStore } from "../../store/useStore";
import "./ComplianceDashboard.css"; // We will create a beautiful style sheet for this page

export default function ComplianceDashboard() {
  const token = useStore((state) => state.token);
  const [month, setMonth] = useState("06");
  const [year, setYear] = useState("2026");
  
  // State variables
  const [healthStatus, setHealthStatus] = useState({ blockFiling: false, issues: { items: [], customers: [], branches: [] } });
  const [gstr3b, setGstr3b] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  
  // Dialog / Modal states
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
  const [authSession, setAuthSession] = useState({ token: null, expiresAt: null });

  // Axios config with headers
  const getAxiosConfig = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  // 1. Fetch data on load or date change
  const loadComplianceData = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // Fetch data health status
      const healthRes = await axios.get(
        `http://localhost:5000/api/compliance/gst/health?month=${month}&year=${year}`,
        getAxiosConfig()
      );
      setHealthStatus(healthRes.data);

      // Fetch Sales Invoices for E-way filtering
      const salesRes = await axios.get(
        "http://localhost:5000/api/transactions/sales",
        getAxiosConfig()
      );
      // Filter invoices for current month and company
      const currentMonthInvoices = salesRes.data.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        const invMonth = String(invDate.getMonth() + 1).padStart(2, "0");
        const invYear = String(invDate.getFullYear());
        return invMonth === month && invYear === year;
      });
      setInvoices(currentMonthInvoices);

      // Try fetching GSTR-3B summary (will fail with 401 if portal token expired)
      try {
        const gstrRes = await axios.get(
          `http://localhost:5000/api/compliance/gst/gstr3b/summary?month=${month}&year=${year}`,
          getAxiosConfig()
        );
        setGstr3b(gstrRes.data);
      } catch (err) {
        if (err.response?.data?.error === "GSTN_SESSION_EXPIRED") {
          console.log("Portal session expired. OTP Authentication required.");
          setGstr3b(null);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error("Error loading compliance details:", err);
      setErrorMsg("Failed to load compliance details. Authenticate with GST portal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadComplianceData();
    }
  }, [month, year, token]);

  // Request GSTN OTP
  const handleRequestOtp = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await axios.post(
        "http://localhost:5000/api/compliance/gst/otp/request",
        {},
        getAxiosConfig()
      );
      setSuccessMsg("OTP request sent successfully! Enter code below.");
    } catch (err) {
      setErrorMsg("Failed to trigger portal OTP. Check GSP configurations.");
    }
  };

  // Submit GSTN OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!otp) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/api/compliance/gst/otp/verify",
        { otp },
        getAxiosConfig()
      );
      setAuthSession({ token: res.data.token, expiresAt: new Date(res.data.expiresAt) });
      setSuccessMsg("Portal session established successfully!");
      setShowOtpModal(false);
      setOtp("");
      // Reload details now that session is active
      loadComplianceData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "OTP verification failed.");
    }
  };

  // Preview GSTR-1 JSON
  const handlePreviewGstr1 = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await axios.get(
        `http://localhost:5000/api/compliance/gst/gstr1/preview?month=${month}&year=${year}`,
        getAxiosConfig()
      );
      setPreviewData(res.data);
    } catch (err) {
      setErrorMsg("Failed to load GSTR-1 preview data.");
    }
  };

  // File GSTR-1 Upload
  const handleFileGstr1 = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/compliance/gst/gstr1/file",
        { month, year },
        getAxiosConfig()
      );
      setSuccessMsg(`GSTR-1 successfully uploaded! Ref: ${res.data.referenceId}`);
      setPreviewData(null);
      loadComplianceData();
    } catch (err) {
      if (err.response?.data?.error === "GSTN_SESSION_EXPIRED") {
        setShowOtpModal(true);
      } else {
        setErrorMsg(err.response?.data?.message || err.response?.data?.error || "GSTR-1 filing failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger E-way Modal
  const openEwayModal = (inv) => {
    setSelectedInvoice(inv);
    setTransporterId("");
    setTransporterName("");
    setTransportMode("ROAD");
    setVehicleNo("");
    setDistanceKm("150");
    setShowEwayModal(true);
  };

  // Generate E-way Bill
  const handleGenerateEwayBill = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const distVal = parseInt(distanceKm);

    if (isNaN(distVal) || distVal < 1 || distVal > 4000) {
      setErrorMsg("Distance must be a valid number between 1 and 4000 km.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `http://localhost:5000/api/compliance/ewaybill/generate/${selectedInvoice.id}`,
        {
          transporterId,
          transporterName,
          transportMode,
          vehicleNo,
          distanceKm: distVal,
        },
        getAxiosConfig()
      );
      setSuccessMsg(`E-Way Bill successfully generated! Number: ${res.data.ewayBillNo}`);
      setShowEwayModal(false);
      loadComplianceData();
    } catch (err) {
      if (err.response?.data?.error === "GSTN_SESSION_EXPIRED") {
        setShowEwayModal(false);
        setShowOtpModal(true);
      } else {
        setErrorMsg(err.response?.data?.message || err.response?.data?.error || "E-Way Bill generation failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compliance-container">
      <div className="compliance-header">
        <h2>GST & E-Way Bill Compliance Console</h2>
        <div className="date-selectors">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="selector-input">
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="selector-input">
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {errorMsg && <div className="alert-box error-alert">{errorMsg}</div>}
      {successMsg && <div className="alert-box success-alert">{successMsg}</div>}

      {/* 1. Portal Status Toolbar */}
      <div className="status-toolbar card-blur">
        <div className="status-indicator">
          <span className={`status-dot ${gstr3b ? "active" : "inactive"}`}></span>
          <span>GSTN Connection: <strong>{gstr3b ? "Active Portal Session" : "Session Expired"}</strong></span>
        </div>
        {!gstr3b && (
          <button onClick={() => setShowOtpModal(true)} className="btn btn-primary">
            Authenticate GST Portal
          </button>
        )}
      </div>

      {/* 2. Data Health Blocks Warning */}
      {healthStatus.blockFiling && (
        <div className="alert-box warning-alert">
          <h3>⚠️ Data Health Blockers Detected</h3>
          <p>The GST staging portal will reject transactions containing defaults. Resolve the following legacy parameters before uploading GSTR-1 or E-way bills:</p>
          <div className="issues-grid">
            {healthStatus.issues.items.length > 0 && (
              <div className="issue-block">
                <strong>Items missing HSN (HSN="000000"):</strong>
                <ul>
                  {healthStatus.issues.items.map(i => <li key={i.id}>{i.name} (SKU: {i.sku})</li>)}
                </ul>
              </div>
            )}
            {healthStatus.issues.customers.length > 0 && (
              <div className="issue-block">
                <strong>Customers missing Pincode (PIN="000000"):</strong>
                <ul>
                  {healthStatus.issues.customers.map(c => <li key={c.id}>{c.name} (Mob: {c.mobile})</li>)}
                </ul>
              </div>
            )}
            {healthStatus.issues.branches.length > 0 && (
              <div className="issue-block">
                <strong>Branches missing Pincode (PIN="000000"):</strong>
                <ul>
                  {healthStatus.issues.branches.map(b => <li key={b.id}>{b.name}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. GSTR-3B scorecards */}
      <div className="metrics-grid">
        <div className="metric-card card-blur">
          <h4>Outward Sales Tax (GSTR-3B Liability)</h4>
          {gstr3b ? (
            <div className="metric-content">
              <span className="metric-value">₹{gstr3b.summary.outwardSupplies.taxableValue.toLocaleString()}</span>
              <div className="tax-split">
                <span>CGST: ₹{gstr3b.summary.outwardSupplies.cgst.toLocaleString()}</span>
                <span>SGST: ₹{gstr3b.summary.outwardSupplies.sgst.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <span className="no-data">Session Auth Required</span>
          )}
        </div>

        <div className="metric-card card-blur">
          <h4>Input Tax Credit (ITC Claims)</h4>
          {gstr3b ? (
            <div className="metric-content">
              <span className="metric-value value-green">₹{(gstr3b.summary.eligibleItc.cgst + gstr3b.summary.eligibleItc.sgst).toLocaleString()}</span>
              <div className="tax-split">
                <span>CGST: ₹{gstr3b.summary.eligibleItc.cgst.toLocaleString()}</span>
                <span>SGST: ₹{gstr3b.summary.eligibleItc.sgst.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <span className="no-data">Session Auth Required</span>
          )}
        </div>
      </div>

      {/* 4. GST Filing Section */}
      <div className="section-panel card-blur">
        <h3>GSTR-1 Monthly Filing</h3>
        <p>Prepare outward sales summaries for registered (B2B) and unregistered (B2CS) returns.</p>
        
        <div className="actions-row">
          <button onClick={handlePreviewGstr1} className="btn btn-secondary">
            Preview GSTR-1 Payload
          </button>
          <button 
            onClick={handleFileGstr1} 
            disabled={healthStatus.blockFiling || loading} 
            className="btn btn-success"
          >
            {loading ? "Uploading..." : "File GSTR-1 to Staging"}
          </button>
        </div>

        {previewData && (
          <div className="json-preview">
            <h4>GSTR-1 Raw Payload Preview:</h4>
            <pre>{JSON.stringify(previewData, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* 5. E-Way Bill Generation Panel */}
      <div className="section-panel card-blur">
        <h3>E-Way Bill Generation</h3>
        <p>Invoices exceeding the ₹50,000 threshold requirement for inter-state cargo transits.</p>
        <table className="eway-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>E-Way Bill No</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.filter(inv => inv.grandTotal >= 50000).map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNo}</td>
                <td>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                <td>{inv.customer?.name}</td>
                <td>₹{inv.grandTotal.toLocaleString()}</td>
                <td>{inv.ewayBillNo || <span className="text-gray">Not Generated</span>}</td>
                <td>
                  {!inv.ewayBillNo ? (
                    <button 
                      onClick={() => openEwayModal(inv)} 
                      disabled={healthStatus.blockFiling}
                      className="btn btn-primary btn-sm"
                    >
                      Generate E-Way
                    </button>
                  ) : (
                    <span className="text-green font-bold">Generated</span>
                  )}
                </td>
              </tr>
            ))}
            {invoices.filter(inv => inv.grandTotal >= 50000).length === 0 && (
              <tr>
                <td colSpan="6" className="no-rows">No invoices exceeding the ₹50,000 threshold found this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* OTP AUTH MODAL */}
      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal-content card-blur">
            <h3>Portal Authentication OTP</h3>
            <p>A verification code was sent by the GSP system to your registered mobile.</p>
            
            <button onClick={handleRequestOtp} className="btn btn-secondary btn-sm mb-4">
              Send Portal OTP
            </button>

            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label>Enter 6-Digit OTP:</label>
                <input 
                  type="text" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="e.g. 123456" 
                  className="form-control"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowOtpModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Verify & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E-WAY PARAMETERS MODAL */}
      {showEwayModal && (
        <div className="modal-overlay">
          <div className="modal-content card-blur">
            <h3>Generate E-Way Bill - {selectedInvoice?.invoiceNo}</h3>
            <p>Target Destination: <strong>{selectedInvoice?.customer?.name}</strong> (PIN: {selectedInvoice?.customer?.pincode})</p>
            
            <form onSubmit={handleGenerateEwayBill}>
              <div className="form-group">
                <label>Transporter GSTIN:</label>
                <input 
                  type="text" 
                  value={transporterId} 
                  onChange={(e) => setTransporterId(e.target.value)} 
                  placeholder="e.g. 09ABCDE1234F1Z5" 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Transporter Name:</label>
                <input 
                  type="text" 
                  value={transporterName} 
                  onChange={(e) => setTransporterName(e.target.value)} 
                  placeholder="e.g. VRL Logistics" 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Number:</label>
                <input 
                  type="text" 
                  value={vehicleNo} 
                  onChange={(e) => setVehicleNo(e.target.value)} 
                  placeholder="e.g. UP80AT1234" 
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>Transport Mode:</label>
                <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)} className="form-control">
                  <option value="ROAD">Road</option>
                  <option value="RAIL">Rail</option>
                  <option value="AIR">Air</option>
                  <option value="SHIP">Ship</option>
                </select>
              </div>
              <div className="form-group">
                <label>Transit Distance (km) - Auto Calculator Override:</label>
                <input 
                  type="number" 
                  value={distanceKm} 
                  onChange={(e) => setDistanceKm(e.target.value)} 
                  min="1"
                  max="4000"
                  className="form-control"
                  required
                />
                <small className="help-text">You may override NIC mapping calculations (Max distance: 4000 km)</small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowEwayModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate E-Way Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
