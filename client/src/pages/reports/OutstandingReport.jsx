import { useState, useEffect } from "react";
import api from "../../utils/api";

function OutstandingReport() {
  const [activeTab, setActiveTab] = useState("customer");

  const [customerData, setCustomerData] = useState([]);
  const [vendorData, setVendorData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOutstandingReport();
  }, []);

  const loadOutstandingReport = async () => {
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
  };

  const totalReceivable = customerData.reduce(
    (total, item) => total + item.outstanding,
    0
  );

  const totalPayable = vendorData.reduce(
    (total, item) => total + item.outstanding,
    0
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Outstanding Report
      </h1>

      <p className="text-gray-500 mb-6">
        Track receivables and payables
      </p>

      {loading && (
        <div className="text-center mt-6 text-gray-500 font-semibold">
          Loading outstanding balances...
        </div>
      )}

      {!loading && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Receivable (Customers)</p>
              <p className="text-3xl font-bold text-green-600">
                ₹ {totalReceivable.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Payable (Vendors)</p>
              <p className="text-3xl font-bold text-red-600">
                ₹ {totalPayable.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab("customer")}
              className={`px-5 py-2 rounded-lg cursor-pointer font-medium transition-colors ${
                activeTab === "customer"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Customer Outstanding
            </button>

            <button
              onClick={() => setActiveTab("vendor")}
              className={`px-5 py-2 rounded-lg cursor-pointer font-medium transition-colors ${
                activeTab === "vendor"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Vendor Outstanding
            </button>
          </div>

          {/* Table */}
          <div className="bg-white p-5 rounded-xl shadow">
            <table className="w-full text-center">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Outstanding Amount</th>
                </tr>
              </thead>

              <tbody>
                {(activeTab === "customer" ? customerData : vendorData).map(
                  (item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 text-left font-medium">{item.name}</td>
                      <td className="p-3">{item.mobile}</td>
                      <td className="p-3 font-semibold text-red-600">
                        ₹ {item.outstanding.toFixed(2)}
                      </td>
                    </tr>
                  )
                )}
                {(activeTab === "customer" ? customerData : vendorData).length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-6 text-gray-500 text-center">
                      No outstanding balances found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default OutstandingReport;