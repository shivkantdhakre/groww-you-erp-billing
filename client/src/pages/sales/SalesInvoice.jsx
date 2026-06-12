import { useState, useEffect } from "react";
import CommonModal from "../../components/common/CommonModal";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";

// Sub-component for Invoice Items Table
function InvoiceTable({
  invoiceItems,
  items,
  updateItemDetails,
  clearItemDetails,
  updateItemQty,
  deleteRow,
  addRow
}) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm overflow-x-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-foreground">Invoice Items</h2>
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

      <table className="w-full min-w-[700px] mb-4 text-sm">
        <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
          <tr>
            <th className="p-3 text-left font-semibold">Item</th>
            <th className="p-3 text-right font-semibold w-32">Available Stock</th>
            <th className="p-3 text-right font-semibold w-28">Qty</th>
            <th className="p-3 text-right font-semibold w-36">Rate</th>
            <th className="p-3 text-right font-semibold w-24">GST %</th>
            <th className="p-3 text-right font-semibold w-36">Total (incl. GST)</th>
            <th className="p-3 text-center font-semibold w-24">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {invoiceItems.map((item) => (
            <tr key={item.id} className="elevated-table-row transition-colors duration-150">
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
                        Stock: {opt.openingStock} | Price: ₹{opt.salePrice}
                      </span>
                    </div>
                  )}
                  onSelect={(opt) => updateItemDetails(item.id, opt)}
                  onClear={() => clearItemDetails(item.id)}
                />
              </td>

              <td className="p-3 text-right align-middle font-mono font-semibold text-foreground">
                {item.itemId ? (
                  <span className={item.currentStock <= 0 ? "text-destructive" : ""}>
                    {item.currentStock}
                  </span>
                ) : (
                  "-"
                )}
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
                  onClick={() => deleteRow(item.id)}
                  className="bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 text-xs font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Sub-component for Invoice Summary Panel
function InvoiceSummaryCard({
  invoiceDate,
  setInvoiceDate,
  customerId,
  setCustomerId,
  customers,
  totalItems,
  totalQty,
  grandTotal,
  handleSaveInvoice
}) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6 text-foreground">
      <h2 className="text-xl font-bold border-b border-border pb-3">Invoice Details</h2>

      {/* Invoice Meta */}
      <div className="space-y-4">
        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Invoice No
          </label>
          <input
            type="text"
            value="[Auto-Generated]"
            readOnly
            className="border border-border p-3 rounded-lg w-full bg-secondary/30 text-muted-foreground font-mono text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="border border-border p-3 rounded-lg w-full bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Customer Name
          </label>
          <Autocomplete
            options={customers}
            labelKey="name"
            valueKey="id"
            placeholder="Select Customer..."
            selectedId={customerId}
            searchFields={["name", "mobile"]}
            customRender={(opt) => (
              <div className="flex justify-between w-full text-xs">
                <span className="font-semibold text-foreground">{opt.name}</span>
                <span className="text-muted-foreground">{opt.mobile}</span>
              </div>
            )}
            onSelect={(opt) => setCustomerId(opt.id)}
            onClear={() => setCustomerId(null)}
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
        onClick={handleSaveInvoice}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl transition font-bold shadow-lg shadow-emerald-600/10 cursor-pointer active:scale-98"
      >
        Save Sales Invoice
      </button>
    </div>
  );
}

function SalesInvoice() {
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  const [customerId, setCustomerId] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([
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

  const [savedInvoices, setSavedInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Zustand Master Data Cache
  const customers = useStore((state) => state.customers);
  const items = useStore((state) => state.items);
  const fetchCustomers = useStore((state) => state.fetchCustomers);
  const fetchItems = useStore((state) => state.fetchItems);

  // Fetch Masters and Invoices on Mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchSalesInvoices();
  }, []);

  const fetchSalesInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await api.get("/transactions/sales-invoices");
      setSavedInvoices(res.data);
    } catch (err) {
      console.error("Failed to fetch sales invoices:", err);
    } finally {
      setLoadingInvoices(false);
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
    setInvoiceItems([...invoiceItems, newRow]);
  };

  const deleteRow = (id) => {
    if (invoiceItems.length === 1) {
      setMessage("At least one item row is required");
      setMessageType("warning");
      return;
    }
    const updatedItems = invoiceItems.filter((item) => item.id !== id);
    setInvoiceItems(updatedItems);
  };

  const updateItemDetails = (id, dbItem) => {
    const updatedItems = invoiceItems.map((item) => {
      if (item.id === id) {
        const qty = Number(item.qty) || 1;
        const rate = Number(dbItem.salePrice) || 0;
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
    setInvoiceItems(updatedItems);
  };

  const handleBarcodeScanned = (dbItem) => {
    setInvoiceItems((prevItems) => {
      // Check if item already exists in current rows
      const existingIndex = prevItems.findIndex(item => item.itemId === dbItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const item = updated[existingIndex];
        const newQty = item.qty + 1;
        
        // Stock warning check
        if (newQty > dbItem.openingStock) {
          setMessage(`Cannot add. Insufficient stock for ${dbItem.name}. Available: ${dbItem.openingStock}`);
          setMessageType("error");
          return prevItems;
        }
        
        const subtotal = item.rate * newQty;
        const gstAmount = Math.round((subtotal * item.gstPercentage / 100) * 100) / 100;
        updated[existingIndex] = {
          ...item,
          qty: newQty,
          amount: Math.round((subtotal + gstAmount) * 100) / 100
        };
        setMessage(`Incremented ${dbItem.name} quantity.`);
        setMessageType("success");
        return updated;
      } else {
        // Stock check
        if (dbItem.openingStock < 1) {
          setMessage(`Cannot add ${dbItem.name}: Out of stock.`);
          setMessageType("error");
          return prevItems;
        }

        const lastRow = prevItems[prevItems.length - 1];
        const rate = Number(dbItem.salePrice) || 0;
        const gstPct = Number(dbItem.gstPercentage) || 0;
        const subtotal = rate * 1;
        const gstAmount = Math.round((subtotal * gstPct / 100) * 100) / 100;
        const filledRow = {
          id: lastRow && !lastRow.itemId ? lastRow.id : Date.now(),
          itemId: dbItem.id,
          itemName: dbItem.name,
          qty: 1,
          rate,
          gstPercentage: gstPct,
          amount: Math.round((subtotal + gstAmount) * 100) / 100,
          currentStock: dbItem.openingStock
        };

        setMessage(`Added ${dbItem.name} to invoice.`);
        setMessageType("success");
        if (lastRow && !lastRow.itemId) {
          return [...prevItems.slice(0, -1), filledRow];
        } else {
          return [...prevItems, filledRow];
        }
      }
    });
  };

  // Register global hardware-accelerated barcode interceptor
  useBarcodeScanner((barcode) => {
    const matchedItem = items.find(
      (item) => item.sku === barcode || item.sku?.toLowerCase() === barcode.toLowerCase()
    );
    if (matchedItem) {
      handleBarcodeScanned(matchedItem);
    } else {
      setMessage(`Barcode "${barcode}" not matched in inventory.`);
      setMessageType("warning");
    }
  });

  const clearItemDetails = (id) => {
    const updatedItems = invoiceItems.map((item) => {
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
    setInvoiceItems(updatedItems);
  };

  const updateItemQty = (id, qtyValue) => {
    const updatedItems = invoiceItems.map((item) => {
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
    setInvoiceItems(updatedItems);
  };

  const grandTotal = Math.round(
    invoiceItems.reduce((total, item) => total + Number(item.amount), 0) * 100
  ) / 100;

  const totalItems = invoiceItems.length;

  const totalQty = invoiceItems.reduce(
    (total, item) => total + (Number(item.qty) || 0),
    0
  );

  const handleSaveInvoice = async () => {
    if (!invoiceDate) {
      setMessage("Invoice Date is required");
      setMessageType("error");
      return;
    }

    if (!customerId) {
      setMessage("Customer selection is required");
      setMessageType("error");
      return;
    }

    const hasInvalidItem = invoiceItems.some(
      (item) => !item.itemId || Number(item.qty) <= 0
    );

    if (hasInvalidItem) {
      setMessage("Please select a valid Item and enter Quantity for all rows");
      setMessageType("warning");
      return;
    }

    // Client-side stock check warning before submitting
    const stockErrorItem = invoiceItems.find(
      (item) => Number(item.qty) > item.currentStock
    );
    if (stockErrorItem) {
      setMessage(
        `Insufficient stock for ${stockErrorItem.itemName}. Available: ${stockErrorItem.currentStock}, Requested: ${stockErrorItem.qty}`
      );
      setMessageType("error");
      return;
    }

    try {
      const payload = {
        customerId,
        invoiceDate,
        items: invoiceItems.map((item) => ({
          itemId: item.itemId,
          qty: item.qty
        }))
      };

      await api.post("/transactions/sales-invoices", payload);

      // Force refresh of Master Items to get updated database stock levels!
      await fetchItems(true);
      await fetchCustomers(true);

      // Reload saved invoices table
      fetchSalesInvoices();

      // Reset Form state
      setCustomerId(null);
      setInvoiceItems([
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

      setMessage("Sales Invoice created successfully!");
      setMessageType("success");
      setShowSaveModal(true);

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to create sales invoice:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to create sales invoice";
      setMessage(errorMsg);
      setMessageType("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Sales Invoice</h1>
        <div className="flex items-center gap-2 bg-secondary/40 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground font-mono">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Barcode Scanner Active
        </div>
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

      {/* Grid Layout: Left is Invoice Items, Right is Customer / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <InvoiceTable
            invoiceItems={invoiceItems}
            items={items}
            updateItemDetails={updateItemDetails}
            clearItemDetails={clearItemDetails}
            updateItemQty={updateItemQty}
            deleteRow={deleteRow}
            addRow={addRow}
          />
        </div>

        <div className="lg:col-span-1">
          <InvoiceSummaryCard
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            customerId={customerId}
            setCustomerId={setCustomerId}
            customers={customers}
            totalItems={totalItems}
            totalQty={totalQty}
            grandTotal={grandTotal}
            handleSaveInvoice={handleSaveInvoice}
          />
        </div>
      </div>

      {/* Saved Invoices Table */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-xl font-bold mb-6 text-foreground">Saved Invoices</h2>
        {loadingInvoices ? (
          <div className="text-center py-6 text-muted-foreground">Loading invoices...</div>
        ) : savedInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3 text-left font-semibold">Invoice No</th>
                  <th className="p-3 text-left font-semibold">Date</th>
                  <th className="p-3 text-left font-semibold">Customer</th>
                  <th className="p-3 text-right font-semibold">Items count</th>
                  <th className="p-3 text-right font-semibold">Qty</th>
                  <th className="p-3 text-right font-semibold">Grand Total</th>
                  <th className="p-3 text-center font-semibold w-48">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {savedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="elevated-table-row transition-colors duration-150">
                    <td className="p-3 text-foreground font-mono font-semibold">
                      {invoice.invoiceNo}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-foreground font-medium">
                      {invoice.customer?.name || "-"}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{invoice.totalItems}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{invoice.totalQty}</td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-500 font-mono font-bold">
                      ₹ {invoice.grandTotal.toFixed(2)}
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handlePrintInvoice(invoice.id, 'A4')}
                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-200 text-xs font-semibold cursor-pointer"
                      >
                        Print A4
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(invoice.id, 'Thermal')}
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
          <div className="text-center py-6 text-muted-foreground text-sm">No invoices saved yet</div>
        )}
      </div>

      <CommonModal isOpen={showSaveModal} title="Invoice Saved">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            The Sales Invoice has been recorded and stock levels have been successfully updated.
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

export default SalesInvoice;