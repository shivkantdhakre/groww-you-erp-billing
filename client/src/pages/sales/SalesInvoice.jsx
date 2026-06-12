import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import CommonModal from "../../components/common/CommonModal";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";

// Sub-component for Invoice Items Table (Virtualized)
function InvoiceTable({
  invoiceItems,
  items,
  updateItemDetails,
  clearItemDetails,
  updateItemQty,
  deleteRow,
  addRow,
  itemSearchRefs,
  quantityRefs
}) {
  const ROW_HEIGHT = 60;
  const MAX_VISIBLE_ROWS = 8;
  const parentRef = useRef(null);
  const shouldVirtualize = invoiceItems.length > MAX_VISIBLE_ROWS;

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: invoiceItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

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

      {/* Sticky header table */}
      <table className="w-full min-w-[700px] text-sm">
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
            {(shouldVirtualize ? virtualizer.getVirtualItems() : invoiceItems.map((item, index) => ({ index, start: index * ROW_HEIGHT, size: ROW_HEIGHT }))).map((virtualRow) => {
              const item = invoiceItems[virtualRow.index];
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
                    inputRef={(el) => {
                      if (el) {
                        itemSearchRefs.current[item.id] = el;
                      } else {
                        delete itemSearchRefs.current[item.id];
                      }
                    }}
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
                    ref={(el) => {
                      if (el) {
                        quantityRefs.current[item.id] = el;
                      } else {
                        delete quantityRefs.current[item.id];
                      }
                    }}
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateItemQty(item.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const idx = virtualRow.index;
                        if (idx === invoiceItems.length - 1) {
                          addRow();
                        } else {
                          const nextRow = invoiceItems[idx + 1];
                          if (nextRow && itemSearchRefs.current[nextRow.id]) {
                            itemSearchRefs.current[nextRow.id].focus();
                          }
                        }
                      }
                    }}
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
  invoiceDate,
  setInvoiceDate,
  customerId,
  setCustomerId,
  customers,
  totalItems,
  totalQty,
  grandTotal,
  handleSaveInvoice,
  customerSearchRef
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
            inputRef={customerSearchRef}
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
  const [invoiceItems, setInvoiceItems] = useState(() => [
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

  // Focus & Progression Refs
  const customerSearchRef = useRef(null);
  const itemSearchRefs = useRef({});
  const quantityRefs = useRef({});
  const [focusTarget, setFocusTarget] = useState(null);

  // Zustand Master Data Cache
  const customers = useStore((state) => state.customers);
  const items = useStore((state) => state.items);
  const fetchCustomers = useStore((state) => state.fetchCustomers);
  const fetchItems = useStore((state) => state.fetchItems);

  const fetchSalesInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await api.get("/transactions/sales-invoices");
      setSavedInvoices(res.data.data);
    } catch (err) {
      console.error("Failed to fetch sales invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const handlePrintInvoice = useCallback(async (invoiceId, layout) => {
    if (layout.toLowerCase() === "thermal") {
      const width = 450;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        `/print/thermal-invoice/${invoiceId}?type=sale`,
        "Thermal Invoice Print",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );
      return;
    }
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
  }, []);

  const handleSaveInvoice = useCallback(async () => {
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
  }, [invoiceDate, customerId, invoiceItems, fetchItems, fetchCustomers, fetchSalesInvoices]);

  const addRow = useCallback(() => {
    const newId = Date.now();
    const newRow = {
      id: newId,
      itemId: "",
      itemName: "",
      qty: 1,
      rate: 0,
      gstPercentage: 0,
      amount: 0,
      currentStock: 0
    };
    setInvoiceItems((prev) => [...prev, newRow]);
    setFocusTarget({ id: newId, type: "item" });
  }, []);

  // Fetch Masters and Invoices on Mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    const timer = setTimeout(() => {
      fetchSalesInvoices();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers, fetchItems, fetchSalesInvoices]);

  // Focus target useEffect
  useEffect(() => {
    if (focusTarget) {
      const { id, type } = focusTarget;
      const timer = setTimeout(() => {
        if (type === "item" && itemSearchRefs.current[id]) {
          itemSearchRefs.current[id].focus();
        } else if (type === "qty" && quantityRefs.current[id]) {
          quantityRefs.current[id].focus();
          quantityRefs.current[id].select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusTarget]);

  // Global keydown listeners (F2, Ctrl+P, Alt+N, Alt+C)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt+N -> Add a new item row
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addRow();
      }
      // F2 -> Save sales invoice
      if (e.key === "F2") {
        e.preventDefault();
        handleSaveInvoice();
      }
      // Ctrl+P -> Print last generated invoice (thermal)
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (savedInvoices.length > 0) {
          handlePrintInvoice(savedInvoices[0].id, "thermal");
        } else {
          setMessage("No invoices saved to print.");
          setMessageType("warning");
        }
      }
      // Alt+C -> Focus Customer search
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (customerSearchRef.current) {
          customerSearchRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [invoiceItems, savedInvoices, handlePrintInvoice, handleSaveInvoice, addRow]);

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

    // Auto-focus quantity input of the selected row
    setFocusTarget({ id, type: "qty" });
  };

  const handleBarcodeScanned = (dbItem) => {
    setInvoiceItems((prevItems) => {
      const existingIndex = prevItems.findIndex(item => item.itemId === dbItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const item = updated[existingIndex];
        const newQty = item.qty + 1;
        
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
        setFocusTarget({ id: item.id, type: "qty" });
        return updated;
      } else {
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
        const newId = lastRow && !lastRow.itemId ? lastRow.id : Date.now();
        const filledRow = {
          id: newId,
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
        setFocusTarget({ id: newId, type: "qty" });
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
            itemSearchRefs={itemSearchRefs}
            quantityRefs={quantityRefs}
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
            customerSearchRef={customerSearchRef}
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