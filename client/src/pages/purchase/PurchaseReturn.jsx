import { useState, useEffect, useCallback } from "react";
import CommonModal from "../../components/common/CommonModal";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function PurchaseReturn() {
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [vendorId, setVendorId] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState("");
  const [reason, setReason] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState(0);

  const [returns, setReturns] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Zustand Cache
  const vendors = useStore((state) => state.vendors);
  const items = useStore((state) => state.items);
  const fetchVendors = useStore((state) => state.fetchVendors);
  const fetchItems = useStore((state) => state.fetchItems);
  const user = useStore((state) => state.user);

  const getBranchStock = (item) => {
    if (!item) return 0;
    return user?.branchId
      ? (item.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0)
      : (item.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0);
  };

  const fetchPurchaseReturns = useCallback(async () => {
    setLoadingReturns(true);
    try {
      const res = await api.get("/transactions/purchase-returns");
      setReturns(res.data.data);
    } catch (err) {
      console.error("Failed to fetch purchase returns:", err);
    } finally {
      setLoadingReturns(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchItems();
    const timer = setTimeout(() => {
      fetchPurchaseReturns();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVendors, fetchItems, fetchPurchaseReturns]);

  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const selectedItem = items.find((i) => i.id === itemId);

  const amount = (parseFloat(qty) || 0) * rate;

  const handleSaveReturn = async () => {
    if (!vendorId) {
      setMessage("Please select a Vendor");
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

    // Client-side stock check for return
    const stock = getBranchStock(selectedItem);
    if (selectedItem && returnQty > stock) {
      setMessage(
        `Insufficient stock to perform return. Available: ${stock}, Requested: ${returnQty}`
      );
      setMessageType("error");
      return;
    }

    try {
      const payload = {
        vendorId,
        itemId,
        qty: returnQty,
        invoiceNo: purchaseInvoiceNo,
        reason,
        returnDate
      };

      await api.post("/transactions/purchase-returns", payload);

      // Force refresh of Master Items (stock decrease) & Vendors (outstanding balance decrease)
      await fetchItems(true);
      await fetchVendors(true);

      // Reload returns list
      fetchPurchaseReturns();

      // Reset form
      setVendorId(null);
      setItemId(null);
      setPurchaseInvoiceNo("");
      setReason("");
      setQty("");
      setRate(0);

      setMessage("Purchase Return saved successfully!");
      setMessageType("success");
      setShowSaveModal(true);

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to save purchase return:", err);
      const errText = err.response?.data?.error || err.response?.data?.message || "Failed to save return";
      setMessage(errText);
      setMessageType("error");
    }
  };

  const totalReturnAmount = Math.round(
    returns.reduce((total, item) => total + (Number(item.grandTotal) || 0), 0) * 100
  ) / 100;

  return (
    <div className="space-y-6 text-foreground">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Purchase Return</h1>

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
      <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Return Number</label>
            <input
              type="text"
              value="[Auto-Generated]"
              readOnly
              className="border border-border p-3 rounded-lg w-full bg-muted text-muted-foreground font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Return Date</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="bg-card text-foreground border border-border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Vendor Name</label>
            <Autocomplete
              options={vendors}
              labelKey="name"
              valueKey="id"
              placeholder="Select Vendor..."
              selectedId={vendorId}
              searchFields={["name", "mobile"]}
              customRender={(opt) => (
                <div className="flex justify-between w-full">
                  <span className="font-semibold text-foreground">{opt.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Bal: ₹{opt.outstandingBalance}
                  </span>
                </div>
              )}
              onSelect={(opt) => setVendorId(opt.id)}
              onClear={() => setVendorId(null)}
            />
            {selectedVendor && (
              <p className="text-xs text-muted-foreground mt-1">
                Outstanding Balance: <span className="font-bold text-foreground">₹{selectedVendor.outstandingBalance}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Purchase Invoice No</label>
            <input
              type="text"
              placeholder="e.g. GY-PUR-0001 (Optional)"
              value={purchaseInvoiceNo}
              onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
              className="bg-card text-foreground border border-border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason</label>
            <input
              type="text"
              placeholder="e.g. Defective stock"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-card text-foreground border border-border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Product</label>
            <Autocomplete
              options={items}
              labelKey="name"
              valueKey="id"
              placeholder="Select Product..."
              selectedId={itemId}
              searchFields={["name", "sku"]}
              customRender={(opt) => (
                <div className="flex justify-between w-full">
                  <span className="font-semibold text-foreground">{opt.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Stock: {getBranchStock(opt)} | Cost: ₹{opt.purchasePrice}
                  </span>
                </div>
              )}
              onSelect={(opt) => {
                setItemId(opt.id);
                setRate(opt.purchasePrice);
              }}
              onClear={() => {
                setItemId(null);
                setRate(0);
              }}
            />
            {selectedItem && (
              <p className="text-xs text-muted-foreground mt-1">
                Current Stock: <span className="font-bold text-foreground">{getBranchStock(selectedItem)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Qty</label>
            <input
              type="number"
              placeholder="Qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="bg-card text-foreground border border-border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Purchase Rate</label>
            <input
              type="text"
              value={itemId ? `₹ ${rate}` : "-"}
              readOnly
              className="border border-border p-3 rounded-lg w-full bg-muted text-muted-foreground font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Return Amount</label>
            <input
              type="text"
              value={`₹ ${amount.toFixed(2)}`}
              readOnly
              className="border border-border p-3 rounded-lg w-full bg-muted text-foreground font-bold focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSaveReturn}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg mt-6 font-bold shadow-sm transition cursor-pointer"
        >
          Save Return
        </button>
      </div>

      {/* SUMMARY */}
      <div className="bg-card text-foreground p-5 rounded-xl border border-border shadow-sm w-72">
        <h3 className="text-muted-foreground text-sm font-semibold">Total Return Amount</h3>
        <p className="text-3xl font-extrabold text-rose-600 mt-1">₹ {totalReturnAmount}</p>
      </div>

      {/* TABLE */}
      <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Saved Returns</h2>
        {loadingReturns ? (
          <div className="text-center py-6 text-muted-foreground font-medium">Loading returns...</div>
        ) : returns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary text-secondary-foreground border-b border-border">
                <tr>
                  <th className="p-3 text-left font-semibold text-sm">Return Number</th>
                  <th className="p-3 text-left font-semibold text-sm">Return Date</th>
                  <th className="p-3 text-left font-semibold text-sm">Vendor</th>
                  <th className="p-3 text-left font-semibold text-sm">Purchase Invoice No</th>
                  <th className="p-3 text-left font-semibold text-sm">Item</th>
                  <th className="p-3 text-left font-semibold text-sm">Qty</th>
                  <th className="p-3 text-left font-semibold text-sm">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 border-b border-border transition">
                    <td className="p-3 font-mono font-semibold text-foreground">{item.returnNo}</td>
                    <td className="p-3 text-muted-foreground">{new Date(item.returnDate).toLocaleDateString()}</td>
                    <td className="p-3 text-foreground font-medium">{item.vendor?.name || "-"}</td>
                    <td className="p-3 text-muted-foreground font-mono">{item.invoiceNo || "-"}</td>
                    <td className="p-3 text-foreground">{item.items?.[0]?.item?.name || "-"}</td>
                    <td className="p-3 text-muted-foreground">{item.totalQty}</td>
                    <td className="p-3 text-rose-600 font-bold">₹ {item.grandTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">No returns saved yet</div>
        )}
      </div>

      <CommonModal isOpen={showSaveModal} title="Purchase Return Saved">
        <p className="mb-4 text-muted-foreground">
          The Purchase Return has been successfully saved. Inventory levels and vendor outstanding balances have been updated.
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowSaveModal(false)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold transition cursor-pointer"
          >
            OK
          </button>
        </div>
      </CommonModal>
    </div>
  );
}

export default PurchaseReturn;