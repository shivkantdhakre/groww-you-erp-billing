import { useState, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import CommonModal from "../../components/common/CommonModal";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

// Sub-component for Purchase Items Table (Virtualized)
function InvoiceTable({
  purchaseItems,
  items,
  updateItemDetails,
  clearItemDetails,
  updateItemQty,
  removeRow,
  addRow
}) {
  const ROW_HEIGHT = 60;
  const MAX_VISIBLE_ROWS = 8;
  const parentRef = useRef(null);
  const shouldVirtualize = purchaseItems.length > MAX_VISIBLE_ROWS;

  const virtualizer = useVirtualizer({
    count: purchaseItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm overflow-x-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-foreground">Purchase Items</h2>
        <button
          onClick={addRow}
          className="bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl transition duration-200 font-semibold shadow-md shadow-primary/15 flex items-center gap-1.5 cursor-pointer text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Sticky header table */}
      <table className="w-full min-w-[700px] text-sm">
        <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
          <tr>
            <th className="p-3 text-left font-semibold">Item</th>
            <th className="p-3 text-right font-semibold w-32">Current Stock</th>
            <th className="p-3 text-right font-semibold w-28">Qty</th>
            <th className="p-3 text-right font-semibold w-36">Purchase Rate</th>
            <th className="p-3 text-right font-semibold w-24">GST %</th>
            <th className="p-3 text-right font-semibold w-36">Total (incl. GST)</th>
            <th className="p-3 text-center font-semibold w-24">Action</th>
          </tr>
        </thead>
      </table>

      {/* Virtualized scrollable body */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{
          maxHeight: shouldVirtualize ? `${MAX_VISIBLE_ROWS * ROW_HEIGHT}px` : undefined,
        }}
      >
        <table className="w-full min-w-[700px] mb-4 text-sm">
          <tbody
            className="divide-y divide-border"
            style={{
              height: shouldVirtualize ? `${virtualizer.getTotalSize()}px` : undefined,
              width: "100%",
              position: "relative",
            }}
          >
            {(shouldVirtualize ? virtualizer.getVirtualItems() : purchaseItems.map((item, index) => ({ index, start: index * ROW_HEIGHT, size: ROW_HEIGHT }))).map((virtualRow) => {
              const item = purchaseItems[virtualRow.index];
              return (
                <tr
                  key={item.id}
                  className="elevated-table-row transition-colors duration-150"
                  style={shouldVirtualize ? {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "table-row",
                  } : undefined}
                >
                <td className="p-3 align-top min-w-[200px]">
                  <Autocomplete
                    options={items}
                    labelKey="name"
                    valueKey="id"
                    placeholder="Search Item..."
                    selectedId={item.itemId}
                    searchFields={["name", "sku"]}
                    customRender={(opt) => (
                      <div className="flex justify-between w-full text-xs">
                        <span className="font-semibold text-foreground">{opt.name}</span>
                        <span className="text-muted-foreground font-mono">
                          Stock: {opt.openingStock} | Cost: ₹{opt.purchasePrice}
                        </span>
                      </div>
                    )}
                    onSelect={(opt) => updateItemDetails(item.id, opt)}
                    onClear={() => clearItemDetails(item.id)}
                  />
                </td>

                <td className="p-3 text-right align-middle font-mono font-semibold text-foreground">
                  {item.itemId ? item.currentStock : "-"}
                </td>

                <td className="p-3 text-right align-middle">
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateItemQty(item.id, e.target.value)}
                    className="border border-border p-2 rounded-lg w-20 text-right bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                  />
                </td>

                <td className="p-3 text-right align-middle font-mono font-semibold text-foreground">
                  {item.itemId ? `₹ ${item.rate.toFixed(2)}` : "-"}
                </td>

                <td className="p-3 text-right align-middle font-mono font-semibold text-muted-foreground">
                  {item.itemId ? `${item.gstPercentage}%` : "-"}
                </td>

                <td className="p-3 text-right align-middle font-mono font-bold text-foreground">
                  {item.itemId ? `₹ ${item.amount.toFixed(2)}` : "-"}
                </td>

                <td className="p-3 text-center align-middle">
                  <button
                    onClick={() => removeRow(item.id)}
                    className="bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 text-xs font-semibold cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Sub-component for Invoice Summary Panel
function InvoiceSummaryCard({
  purchaseDate,
  setPurchaseDate,
  customInvoiceNo,
  setCustomInvoiceNo,
  vendorId,
  setVendorId,
  vendors,
  selectedVendor,
  totalItems,
  totalQty,
  grandTotal,
  savePurchase
}) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6 text-foreground">
      <h2 className="text-xl font-bold border-b border-border pb-3">Invoice Details</h2>

      {/* Invoice Meta */}
      <div className="space-y-4">
        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Invoice Number (Ref)
          </label>
          <input
            type="text"
            placeholder="e.g. VEN-9871 (Optional)"
            value={customInvoiceNo}
            onChange={(e) => setCustomInvoiceNo(e.target.value)}
            className="border border-border p-3 rounded-lg w-full bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="border border-border p-3 rounded-lg w-full bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Vendor Name
          </label>
          <Autocomplete
            options={vendors}
            labelKey="name"
            valueKey="id"
            placeholder="Select Vendor..."
            selectedId={vendorId}
            searchFields={["name", "mobile"]}
            customRender={(opt) => (
              <div className="flex justify-between w-full text-xs">
                <span className="font-semibold text-foreground">{opt.name}</span>
                <span className="text-muted-foreground">{opt.mobile}</span>
              </div>
            )}
            onSelect={(opt) => setVendorId(opt.id)}
            onClear={() => setVendorId(null)}
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Vendor GSTIN
          </label>
          <input
            type="text"
            value={selectedVendor?.gstin || "N/A"}
            readOnly
            className="border border-border p-3 rounded-lg w-full bg-secondary/30 text-muted-foreground font-mono text-sm cursor-not-allowed"
          />
        </div>
      </div>

      {/* Total Calculations */}
      <div className="bg-secondary/25 p-4 rounded-xl border border-border space-y-3 shadow-inner">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Total Items:</span>
          <span className="font-mono font-bold">{totalItems}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Total Quantity:</span>
          <span className="font-mono font-bold">{totalQty}</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="font-bold">Grand Total:</span>
          <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-500">
            ₹ {grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        onClick={savePurchase}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl transition font-bold shadow-lg shadow-emerald-600/10 cursor-pointer active:scale-98"
      >
        Save Purchase Invoice
      </button>
    </div>
  );
}

function PurchaseInvoice() {
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customInvoiceNo, setCustomInvoiceNo] = useState("");
  const [vendorId, setVendorId] = useState(null);
  
  const [purchaseItems, setPurchaseItems] = useState([
    {
      id: Date.now(),
      itemId: "",
      itemName: "",
      qty: 1,
      rate: 0,
      gstPercentage: 0,
      amount: 0,
      currentStock: 0
    },
  ]);

  const [savedPurchases, setSavedPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Zustand Master Data Cache
  const vendors = useStore((state) => state.vendors);
  const items = useStore((state) => state.items);
  const fetchVendors = useStore((state) => state.fetchVendors);
  const fetchItems = useStore((state) => state.fetchItems);

  // Fetch Masters and Purchases on Mount
  useEffect(() => {
    fetchVendors();
    fetchItems();
    fetchPurchaseInvoices();
  }, []);

  const fetchPurchaseInvoices = async () => {
    setLoadingPurchases(true);
    try {
      const res = await api.get("/transactions/purchase-invoices");
      setSavedPurchases(res.data.data);
    } catch (err) {
      console.error("Failed to fetch purchase invoices:", err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handlePrintInvoice = async (invoiceId, layout) => {
    try {
      const res = await api.get(`/pdf/invoices/${invoiceId}?layout=${layout}`);
      if (res.data.pdfUrl) {
        window.open(res.data.pdfUrl, '_blank');
      } else {
        setMessage("Failed to retrieve PDF invoice link.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Print Error:", err);
      setMessage("Error generating PDF invoice.");
      setMessageType("error");
    }
  };

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  const addRow = () => {
    const newRow = {
      id: Date.now(),
      itemId: "",
      itemName: "",
      qty: 1,
      rate: 0,
      gstPercentage: 0,
      amount: 0,
      currentStock: 0
    };
    setPurchaseItems([...purchaseItems, newRow]);
  };

  const removeRow = (id) => {
    if (purchaseItems.length === 1) {
      setMessage("At least one item row is required");
      setMessageType("warning");
      return;
    }
    const updatedItems = purchaseItems.filter((item) => item.id !== id);
    setPurchaseItems(updatedItems);
  };

  const updateItemDetails = (id, dbItem) => {
    const updatedItems = purchaseItems.map((item) => {
      if (item.id === id) {
        const qty = Number(item.qty) || 1;
        const rate = Number(dbItem.purchasePrice) || 0;
        const gstPct = Number(dbItem.gstPercentage) || 0;
        const subtotal = rate * qty;
        const gstAmount = Math.round((subtotal * gstPct / 100) * 100) / 100;
        return {
          ...item,
          itemId: dbItem.id,
          itemName: dbItem.name,
          rate,
          gstPercentage: gstPct,
          amount: Math.round((subtotal + gstAmount) * 100) / 100,
          currentStock: dbItem.openingStock
        };
      }
      return item;
    });
    setPurchaseItems(updatedItems);
  };

  const clearItemDetails = (id) => {
    const updatedItems = purchaseItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          itemId: "",
          itemName: "",
          rate: 0,
          gstPercentage: 0,
          amount: 0,
          currentStock: 0
        };
      }
      return item;
    });
    setPurchaseItems(updatedItems);
  };

  const updateItemQty = (id, qtyValue) => {
    const updatedItems = purchaseItems.map((item) => {
      if (item.id === id) {
        const qty = parseInt(qtyValue) || 0;
        const rate = Number(item.rate) || 0;
        const gstPct = Number(item.gstPercentage) || 0;
        const subtotal = rate * qty;
        const gstAmount = Math.round((subtotal * gstPct / 100) * 100) / 100;
        return {
          ...item,
          qty,
          amount: Math.round((subtotal + gstAmount) * 100) / 100
        };
      }
      return item;
    });
    setPurchaseItems(updatedItems);
  };

  const grandTotal = Math.round(
    purchaseItems.reduce((total, item) => total + Number(item.amount), 0) * 100
  ) / 100;

  const totalItems = purchaseItems.length;

  const totalQty = purchaseItems.reduce(
    (total, item) => total + (Number(item.qty) || 0),
    0
  );

  const savePurchase = async () => {
    if (!purchaseDate) {
      setMessage("Purchase Date is required");
      setMessageType("error");
      return;
    }

    if (!vendorId) {
      setMessage("Vendor selection is required");
      setMessageType("error");
      return;
    }

    const hasInvalidItem = purchaseItems.some(
      (item) => !item.itemId || Number(item.qty) <= 0
    );

    if (hasInvalidItem) {
      setMessage("Please select a valid Item and enter Quantity for all rows");
      setMessageType("warning");
      return;
    }

    try {
      const payload = {
        vendorId,
        invoiceDate: purchaseDate,
        invoiceNo: customInvoiceNo || undefined,
        items: purchaseItems.map((item) => ({
          itemId: item.itemId,
          qty: item.qty
        }))
      };

      await api.post("/transactions/purchase-invoices", payload);

      // Force refresh of Master Items to get updated database stock levels!
      await fetchItems(true);
      await fetchVendors(true);

      // Reload saved purchases table
      fetchPurchaseInvoices();

      // Reset Form state
      setVendorId(null);
      setCustomInvoiceNo("");
      setPurchaseItems([
        {
          id: Date.now(),
          itemId: "",
          itemName: "",
          qty: 1,
          rate: 0,
          gstPercentage: 0,
          amount: 0,
          currentStock: 0
        },
      ]);

      setMessage("Purchase Invoice saved successfully!");
      setMessageType("success");
      setShowSaveModal(true);

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to create purchase invoice:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to save purchase invoice";
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Purchase Invoice</h1>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl mb-4 text-white font-medium shadow-lg transition-all duration-300 animate-fade-in-up ${
            messageType === "success"
              ? "bg-emerald-600 shadow-emerald-600/10"
              : messageType === "warning"
              ? "bg-amber-500 shadow-amber-500/10"
              : "bg-rose-600 shadow-rose-600/10"
          }`}
        >
          {message}
        </div>
      )}

      {/* Grid Layout: Left is Invoice Items, Right is Vendor / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <InvoiceTable
            purchaseItems={purchaseItems}
            items={items}
            updateItemDetails={updateItemDetails}
            clearItemDetails={clearItemDetails}
            updateItemQty={updateItemQty}
            removeRow={removeRow}
            addRow={addRow}
          />
        </div>

        <div className="lg:col-span-1">
          <InvoiceSummaryCard
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            customInvoiceNo={customInvoiceNo}
            setCustomInvoiceNo={setCustomInvoiceNo}
            vendorId={vendorId}
            setVendorId={setVendorId}
            vendors={vendors}
            selectedVendor={selectedVendor}
            totalItems={totalItems}
            totalQty={totalQty}
            grandTotal={grandTotal}
            savePurchase={savePurchase}
          />
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-foreground">Purchase History</h2>
        {loadingPurchases ? (
          <div className="text-center py-6 text-muted-foreground">Loading purchase history...</div>
        ) : savedPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 text-left font-semibold">Purchase No</th>
                  <th className="p-3 text-left font-semibold">Date</th>
                  <th className="p-3 text-left font-semibold">Vendor</th>
                  <th className="p-3 text-right font-semibold">Items count</th>
                  <th className="p-3 text-right font-semibold">Qty</th>
                  <th className="p-3 text-right font-semibold">Grand Total</th>
                  <th className="p-3 text-center font-semibold w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {savedPurchases.map((purchase) => (
                  <tr key={purchase.id} className="elevated-table-row transition-colors duration-150">
                    <td className="p-3 text-foreground font-mono font-semibold">
                      {purchase.invoiceNo}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(purchase.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-foreground font-medium">
                      {purchase.vendor?.name || "-"}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{purchase.totalItems}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{purchase.totalQty}</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-500 font-mono font-bold">
                      ₹ {purchase.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handlePrintInvoice(purchase.id, 'A4')}
                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-200 text-xs font-semibold cursor-pointer"
                      >
                        Print A4
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(purchase.id, 'Thermal')}
                        className="bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-xs font-semibold cursor-pointer"
                      >
                        Thermal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">No purchases saved yet</div>
        )}
      </div>

      <CommonModal isOpen={showSaveModal} title="Purchase Invoice Saved">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            The Purchase Invoice has been successfully recorded. Stock levels have been incremented.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowSaveModal(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-semibold transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </CommonModal>
    </div>
  );
}

export default PurchaseInvoice;