import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function VendorLedger() {
  const vendors = useStore((state) => state.vendors);
  const fetchVendors = useStore((state) => state.fetchVendors);

  const [selectedVendor, setSelectedVendor] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const loadLedger = async () => {
    if (!selectedVendor) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/reports/ledger?vendorId=${selectedVendor}&fromDate=${fromDate}&toDate=${toDate}`
      );
      setLedgerData(res.data);
    } catch (err) {
      console.error("Failed to load vendor ledger:", err);
      alert("Failed to load ledger data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVendor) {
      loadLedger();
    } else {
      setLedgerData(null);
    }
  }, [selectedVendor]);

  const totalDebit =
    ledgerData?.transactions
      .filter((tx) => !tx.isCancelled)
      .reduce((total, tx) => total + tx.debit, 0) || 0;

  const totalCredit =
    ledgerData?.transactions
      .filter((tx) => !tx.isCancelled)
      .reduce((total, tx) => total + tx.credit, 0) || 0;

  const outstandingBalance = (ledgerData?.openingBalance || 0) + totalCredit - totalDebit;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Vendor Ledger
      </h1>

      <div className="bg-white p-5 rounded-xl shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-2 font-medium">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="border p-3 rounded-lg w-full"
            >
              <option value="">Select Vendor</option>
              {vendors.filter(v => v.isActive).map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border p-3 rounded-lg w-full"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border p-3 rounded-lg w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadLedger}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg w-full cursor-pointer"
            >
              Search
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedVendor("");
                setFromDate("");
                setToDate("");
                setSearchTerm("");
                setLedgerData(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg w-full cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center mt-6 text-gray-500 font-semibold">
          Loading ledger records...
        </div>
      )}

      {ledgerData && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Opening Balance</p>
              <p className="text-2xl font-bold text-blue-600">
                ₹ {ledgerData.openingBalance.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Purchase (Cr)</p>
              <p className="text-2xl font-bold text-green-600">
                ₹ {totalCredit.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Paid/Returned (Dr)</p>
              <p className="text-2xl font-bold text-orange-600">
                ₹ {totalDebit.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">
                ₹ {outstandingBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow mt-6">
            <h2 className="text-xl font-bold mb-4">
              Ledger Transactions
            </h2>

            <div className="flex justify-between mb-4">
              <input
                type="text"
                placeholder="Search Reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border p-2 rounded-lg w-72"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                >
                  Print Ledger
                </button>
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Reference / Details</th>
                  <th className="p-3">Voucher Type</th>
                  <th className="p-3">Debit (Dr)</th>
                  <th className="p-3">Credit (Cr)</th>
                  <th className="p-3">Running Balance</th>
                </tr>
              </thead>

              <tbody>
                <tr className="bg-gray-50 font-semibold border-b">
                  <td className="p-3" colSpan="3">Opening Balance Forward</td>
                  <td className="p-3">₹ 0.00</td>
                  <td className="p-3">₹ 0.00</td>
                  <td className="p-3 text-blue-600">₹ {ledgerData.openingBalance.toFixed(2)}</td>
                </tr>
                {ledgerData.transactions
                  .filter((tx) =>
                    tx.reference
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((tx, index) => (
                    <tr key={index} className={`border-t text-center ${tx.isCancelled ? "bg-red-50 text-gray-400 line-through" : ""}`}>
                      <td className="p-3">{tx.date}</td>
                      <td className="p-3 text-left">{tx.reference}</td>
                      <td className="p-3">
                        {tx.type}
                        {tx.isCancelled && <span className="text-red-500 text-xs font-bold ml-1">(Voided)</span>}
                      </td>
                      <td className="p-3 text-orange-600">₹ {tx.debit.toFixed(2)}</td>
                      <td className="p-3 text-green-600">₹ {tx.credit.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-blue-600">₹ {tx.balance.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default VendorLedger;