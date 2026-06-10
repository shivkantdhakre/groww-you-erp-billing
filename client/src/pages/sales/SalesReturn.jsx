import { useState, useEffect } from "react";
import CommonModal from "../../components/common/CommonModal";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function SalesReturn() {
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [customerId, setCustomerId] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [reason, setReason] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState(0);

  const [returns, setReturns] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Zustand Cache
  const customers = useStore((state) => state.customers);
  const items = useStore((state) => state.items);
  const fetchCustomers = useStore((state) => state.fetchCustomers);
  const fetchItems = useStore((state) => state.fetchItems);

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchSalesReturns();
  }, []);

  const fetchSalesReturns = async () => {
    setLoadingReturns(true);
    try {
      const res = await api.get("/transactions/sales-returns");
      setReturns(res.data);
    } catch (err) {
      console.error("Failed to fetch sales returns:", err);
    } finally {
      setLoadingReturns(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedItem = items.find((i) => i.id === itemId);

  const amount = (parseFloat(qty) || 0) * rate;

  const handleSaveReturn = async () => {
    if (!customerId) {
      setMessage("Please select a Customer");
      setMessageType("error");
      return;
    }
    if (!itemId) {
      setMessage("Please select a Product");
      setMessageType("error");
      return;
    }
    const returnQty = parseInt(qty) || 0;
    if (returnQty <= 0) {
      setMessage("Return quantity must be greater than 0");
      setMessageType("warning");
      return;
    }

    try {
      const payload = {
        customerId,
        itemId,
        qty: returnQty,
        invoiceNo,
        reason,
        returnDate
      };

      await api.post("/transactions/sales-returns", payload);

      // Force refresh of Master Items (stock increase) & Customers (outstanding balance decrease)
      await fetchItems(true);
      await fetchCustomers(true);

      // Reload returns list
      fetchSalesReturns();

      // Reset form
      setCustomerId(null);
      setItemId(null);
      setInvoiceNo("");
      setReason("");
      setQty("");
      setRate(0);

      setMessage("Sales Return saved successfully!");
      setMessageType("success");
      setShowSaveModal(true);

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to save sales return:", err);
      const errText = err.response?.data?.error || err.response?.data?.message || "Failed to save return";
      setMessage(errText);
      setMessageType("error");
    }
  };

  const totalReturnAmount = Math.round(
    returns.reduce((total, item) => total + (Number(item.grandTotal) || 0), 0) * 100
  ) / 100;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Sales Return</h1>

      {message && (
        <div
          className={`p-4 rounded-lg mb-4 text-white font-medium shadow-md transition-all duration-300 ${
            messageType === "success"
              ? "bg-emerald-600"
              : messageType === "warning"
              ? "bg-amber-500"
              : "bg-rose-600"
          }`}
        >
          {message}
        </div>
      )}

      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Return No</label>
            <input
              type="text"
              value="[Auto-Generated]"
              readOnly
              className="border border-gray-200 p-3 rounded-lg w-full bg-gray-50 text-gray-500 font-mono"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Return Date</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Customer Name</label>
            <Autocomplete
              options={customers}
              labelKey="name"
              valueKey="id"
              placeholder="Select Customer..."
              selectedId={customerId}
              searchFields={["name", "mobile"]}
              customRender={(opt) => (
                <div className="flex justify-between w-full">
                  <span className="font-semibold text-gray-800">{opt.name}</span>
                  <span className="text-sm text-gray-500">
                    Bal: ₹{opt.outstandingBalance}
                  </span>
                </div>
              )}
              onSelect={(opt) => setCustomerId(opt.id)}
              onClear={() => setCustomerId(null)}
            />
            {selectedCustomer && (
              <p className="text-xs text-gray-500 mt-1">
                Outstanding Balance: <span className="font-bold text-gray-700">₹{selectedCustomer.outstandingBalance}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Invoice Number</label>
            <input
              type="text"
              placeholder="e.g. GY-0001 (Optional)"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Reason</label>
            <input
              type="text"
              placeholder="e.g. Damaged during shipping"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Product</label>
            <Autocomplete
              options={items}
              labelKey="name"
              valueKey="id"
              placeholder="Select Product..."
              selectedId={itemId}
              searchFields={["name", "sku"]}
              customRender={(opt) => (
                <div className="flex justify-between w-full">
                  <span className="font-semibold text-gray-800">{opt.name}</span>
                  <span className="text-sm text-gray-500">
                    Stock: {opt.openingStock} | Price: ₹{opt.salePrice}
                  </span>
                </div>
              )}
              onSelect={(opt) => {
                setItemId(opt.id);
                setRate(opt.salePrice);
              }}
              onClear={() => {
                setItemId(null);
                setRate(0);
              }}
            />
            {selectedItem && (
              <p className="text-xs text-gray-500 mt-1">
                Current Stock: <span className="font-bold text-gray-700">{selectedItem.openingStock}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Qty</label>
            <input
              type="number"
              placeholder="Qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Rate</label>
            <input
              type="text"
              value={itemId ? `₹ ${rate}` : "-"}
              readOnly
              className="border border-gray-200 p-3 rounded-lg w-full bg-gray-50 text-gray-500 font-semibold"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Return Amount</label>
            <input
              type="text"
              value={`₹ ${amount.toFixed(2)}`}
              readOnly
              className="border border-gray-200 p-3 rounded-lg w-full bg-gray-50 text-gray-700 font-bold"
            />
          </div>
        </div>

        <button
          onClick={handleSaveReturn}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg mt-6 font-bold shadow-md transition"
        >
          Save Return
        </button>
      </div>

      {/* SUMMARY */}
      <div className="bg-white p-5 rounded-xl shadow border border-gray-100 w-72">
        <h3 className="text-gray-500 text-sm font-semibold">Total Return Amount</h3>
        <p className="text-3xl font-extrabold text-rose-600 mt-1">₹ {totalReturnAmount}</p>
      </div>

      {/* TABLE */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Saved Returns</h2>
        {loadingReturns ? (
          <div className="text-center py-6 text-gray-500">Loading returns...</div>
        ) : returns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left font-semibold text-sm">Return No</th>
                  <th className="p-3 text-left font-semibold text-sm">Date</th>
                  <th className="p-3 text-left font-semibold text-sm">Customer</th>
                  <th className="p-3 text-left font-semibold text-sm">Invoice Ref</th>
                  <th className="p-3 text-left font-semibold text-sm">Item</th>
                  <th className="p-3 text-left font-semibold text-sm">Qty</th>
                  <th className="p-3 text-left font-semibold text-sm">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-3 font-mono font-semibold text-gray-900">{item.returnNo}</td>
                    <td className="p-3 text-gray-600">{new Date(item.returnDate).toLocaleDateString()}</td>
                    <td className="p-3 text-gray-700 font-medium">{item.customer?.name || "-"}</td>
                    <td className="p-3 text-gray-600 font-mono">{item.invoiceNo || "-"}</td>
                    <td className="p-3 text-gray-700">{item.items?.[0]?.item?.name || "-"}</td>
                    <td className="p-3 text-gray-600">{item.totalQty}</td>
                    <td className="p-3 text-rose-600 font-bold">₹ {item.grandTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">No returns saved yet</div>
        )}
      </div>

      <CommonModal isOpen={showSaveModal} title="Sales Return Saved">
        <p className="mb-4 text-gray-600">
          The Sales Return has been successfully saved. Inventory levels and customer outstanding balances have been updated.
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowSaveModal(false)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold transition"
          >
            OK
          </button>
        </div>
      </CommonModal>
    </div>
  );
}

export default SalesReturn;