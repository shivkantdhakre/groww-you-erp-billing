import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import CommonModal from "../../components/common/CommonModal";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { Plus, Trash2, Printer, Barcode, Save, CheckCircle2 } from "lucide-react";

const ITEM_GRID_COLS =
  "grid grid-cols-[minmax(195px,1.8fr)_50px_72px_82px_48px_92px_40px] items-center gap-2";

/**
 * Virtualized sales line-item table with synchronized CSS grid columns.
 */
function InvoiceTable({
  invoiceItems,
  items,
  updateItemDetails,
  clearItemDetails,
  updateItemQty,
  deleteRow,
  addRow,
  itemSearchRefs,
  quantityRefs,
}) {
  const user = useStore((state) => state.user);
  const ROW_HEIGHT = 56;
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

  const virtualRows = shouldVirtualize
    ? virtualizer.getVirtualItems()
    : invoiceItems.map((_, index) => ({
        index,
        start: index * ROW_HEIGHT,
        size: ROW_HEIGHT,
      }));

  return (
    <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Invoice Line Items</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scan item barcodes directly or search by product name / SKU
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Row</span>
          <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] rounded bg-primary-foreground/15 font-mono">
            Alt+N
          </kbd>
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[630px]">
          {/* Column Headers */}
          <div
            className={`${ITEM_GRID_COLS} px-3.5 py-2.5 bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border`}
          >
            <div>Item / SKU</div>
            <div className="text-right">Stock</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Rate</div>
            <div className="text-right">GST %</div>
            <div className="text-right">Line Total</div>
            <div className="text-center">Act</div>
          </div>

          {/* Virtualized Rows Container */}
          <div
            ref={parentRef}
            className="overflow-y-auto scrollbar-thin divide-y divide-border/70"
            style={{
              maxHeight: shouldVirtualize ? `${MAX_VISIBLE_ROWS * ROW_HEIGHT}px` : undefined,
            }}
          >
            <div
              style={{
                height: shouldVirtualize ? `${virtualizer.getTotalSize()}px` : undefined,
                position: shouldVirtualize ? "relative" : undefined,
              }}
              className="divide-y divide-border/70"
            >
              {virtualRows.map((virtualRow) => {
                const item = invoiceItems[virtualRow.index];
                return (
                  <div
                    key={item.id}
                    className={`${ITEM_GRID_COLS} px-3.5 py-2 elevated-table-row transition-colors text-sm`}
                    style={
                      shouldVirtualize
                        ? {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }
                        : undefined
                    }
                  >
                    <div className="min-w-0">
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
                        placeholder="Search item or SKU..."
                        selectedId={item.itemId}
                        searchFields={["name", "sku"]}
                        customRender={(opt) => {
                          const stock = user?.branchId
                            ? opt.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0
                            : opt.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;
                          return (
                            <div className="flex justify-between w-full gap-2 text-xs">
                              <span className="font-medium text-foreground truncate">{opt.name}</span>
                              <span className="text-muted-foreground font-mono tabular-nums shrink-0">
                                Stock: {stock} · ₹{opt.salePrice}
                              </span>
                            </div>
                          );
                        }}
                        onSelect={(opt) => updateItemDetails(item.id, opt)}
                        onClear={() => clearItemDetails(item.id)}
                      />
                    </div>

                    <div className="text-right font-mono text-xs font-semibold tabular-nums">
                      {item.itemId ? (
                        <span className={item.currentStock <= 0 ? "text-destructive" : "text-foreground"}>
                          {item.currentStock}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>

                    <div className="flex justify-end">
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
                        className="h-9 pl-2 pr-1 rounded-md w-[70px] text-right border border-input bg-card text-foreground font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                      />
                    </div>

                    <div className="text-right font-mono text-xs font-medium text-foreground tabular-nums whitespace-nowrap">
                      {item.itemId ? `₹ ${item.rate.toFixed(2)}` : "-"}
                    </div>

                    <div className="text-right font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {item.itemId ? `${item.gstPercentage}%` : "-"}
                    </div>

                    <div className="text-right font-mono text-xs sm:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {item.itemId ? `₹ ${item.amount.toFixed(2)}` : "-"}
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(item.id)}
                        title="Remove line item"
                        aria-label="Remove line item"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Right-hand billing summary card displaying tax breakdown, totals, and F2 save trigger.
 */
function InvoiceSummaryCard({
  invoiceDate,
  setInvoiceDate,
  customerId,
  setCustomerId,
  customers,
  totalItems,
  totalQty,
  subtotalAmount,
  gstAmount,
  grandTotal,
  handleSaveInvoice,
  customerSearchRef,
}) {
  return (
    <div className="bg-card p-5 rounded-lg border border-border surface-shadow space-y-5 text-foreground">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Invoice Summary</h2>
        <span className="text-[11px] font-mono text-muted-foreground">B2B / Retail Tax</span>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Invoice No
          </label>
          <input
            type="text"
            value="[Auto-Generated]"
            readOnly
            className="h-9 px-3 rounded-md w-full border border-border bg-muted text-muted-foreground font-mono text-xs cursor-not-allowed focus:outline-none"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Customer
            </label>
            <kbd className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
              Alt+C
            </kbd>
          </div>
          <Autocomplete
            inputRef={customerSearchRef}
            options={customers}
            labelKey="name"
            valueKey="id"
            placeholder="Search customer..."
            selectedId={customerId}
            searchFields={["name", "mobile"]}
            customRender={(opt) => (
              <div className="flex justify-between w-full gap-2 text-xs">
                <span className="font-medium text-foreground truncate">{opt.name}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{opt.mobile}</span>
              </div>
            )}
            onSelect={(opt) => setCustomerId(opt.id)}
            onClear={() => setCustomerId(null)}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-secondary/40 p-4 rounded-md border border-border space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Line Items / Qty</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            {totalItems} / {totalQty}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Taxable Subtotal</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            ₹ {subtotalAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Total GST</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            ₹ {gstAmount.toFixed(2)}
          </span>
        </div>
        <div className="border-t border-border pt-2.5 mt-2.5 flex justify-between items-baseline">
          <span className="font-semibold text-foreground">Grand Total</span>
          <span className="font-mono text-xl font-semibold text-success tabular-nums">
            ₹ {grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSaveInvoice}
        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors font-medium text-sm cursor-pointer flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        <span>Save Sales Invoice</span>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-foreground/15">
          F2
        </kbd>
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        Shortcuts: <span className="font-mono">Alt+N</span> row · <span className="font-mono">Ctrl+P</span> print last thermal
      </p>
    </div>
  );
}

function SalesInvoice() {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
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
      currentStock: 0,
    },
  ]);

  const [savedInvoices, setSavedInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const customerSearchRef = useRef(null);
  const itemSearchRefs = useRef({});
  const quantityRefs = useRef({});
  const [focusTarget, setFocusTarget] = useState(null);

  const customers = useStore((state) => state.customers);
  const items = useStore((state) => state.items);
  const fetchCustomers = useStore((state) => state.fetchCustomers);
  const fetchItems = useStore((state) => state.fetchItems);
  const user = useStore((state) => state.user);

  const fetchSalesInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await api.get("/transactions/sales-invoices");
      setSavedInvoices(res.data.data || []);
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
        window.open(res.data.pdfUrl, "_blank");
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
          qty: item.qty,
        })),
      };

      await api.post("/transactions/sales-invoices", payload);

      await fetchItems(true);
      await fetchCustomers(true);
      fetchSalesInvoices();

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
          currentStock: 0,
        },
      ]);

      setMessage("Sales Invoice created successfully.");
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
      currentStock: 0,
    };
    setInvoiceItems((prev) => [...prev, newRow]);
    setFocusTarget({ id: newId, type: "item" });
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    const timer = setTimeout(() => {
      fetchSalesInvoices();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers, fetchItems, fetchSalesInvoices]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addRow();
      }
      if (e.key === "F2") {
        e.preventDefault();
        handleSaveInvoice();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (savedInvoices.length > 0) {
          handlePrintInvoice(savedInvoices[0].id, "thermal");
        } else {
          setMessage("No invoices saved to print.");
          setMessageType("warning");
        }
      }
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
    setInvoiceItems(invoiceItems.filter((item) => item.id !== id));
  };

  const updateItemDetails = (id, dbItem) => {
    const updatedItems = invoiceItems.map((item) => {
      if (item.id === id) {
        const qty = Number(item.qty) || 1;
        const rate = Number(dbItem.salePrice) || 0;
        const gstPct = Number(dbItem.gstPercentage) || 0;
        const subtotal = rate * qty;
        const gstAmount = Math.round(((subtotal * gstPct) / 100) * 100) / 100;
        const stock = user?.branchId
          ? dbItem.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0
          : dbItem.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;
        return {
          ...item,
          itemId: dbItem.id,
          itemName: dbItem.name,
          rate,
          gstPercentage: gstPct,
          amount: Math.round((subtotal + gstAmount) * 100) / 100,
          currentStock: stock,
        };
      }
      return item;
    });
    setInvoiceItems(updatedItems);
    setFocusTarget({ id, type: "qty" });
  };

  const handleBarcodeScanned = (dbItem) => {
    const stock = user?.branchId
      ? dbItem.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0
      : dbItem.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;

    setInvoiceItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.itemId === dbItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const item = updated[existingIndex];
        const newQty = item.qty + 1;

        if (newQty > stock) {
          setMessage(`Cannot add. Insufficient stock for ${dbItem.name}. Available: ${stock}`);
          setMessageType("error");
          return prevItems;
        }

        const subtotal = item.rate * newQty;
        const gstAmount = Math.round(((subtotal * item.gstPercentage) / 100) * 100) / 100;
        updated[existingIndex] = {
          ...item,
          qty: newQty,
          amount: Math.round((subtotal + gstAmount) * 100) / 100,
        };
        setMessage(`Incremented ${dbItem.name} quantity.`);
        setMessageType("success");
        setFocusTarget({ id: item.id, type: "qty" });
        return updated;
      }

      if (stock < 1) {
        setMessage(`Cannot add ${dbItem.name}: Out of stock.`);
        setMessageType("error");
        return prevItems;
      }

      const lastRow = prevItems[prevItems.length - 1];
      const rate = Number(dbItem.salePrice) || 0;
      const gstPct = Number(dbItem.gstPercentage) || 0;
      const subtotal = rate * 1;
      const gstAmount = Math.round(((subtotal * gstPct) / 100) * 100) / 100;
      const newId = lastRow && !lastRow.itemId ? lastRow.id : Date.now();
      const filledRow = {
        id: newId,
        itemId: dbItem.id,
        itemName: dbItem.name,
        qty: 1,
        rate,
        gstPercentage: gstPct,
        amount: Math.round((subtotal + gstAmount) * 100) / 100,
        currentStock: stock,
      };

      setMessage(`Added ${dbItem.name} to invoice.`);
      setMessageType("success");
      setFocusTarget({ id: newId, type: "qty" });
      if (lastRow && !lastRow.itemId) {
        return [...prevItems.slice(0, -1), filledRow];
      }
      return [...prevItems, filledRow];
    });
  };

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
    setInvoiceItems(
      invoiceItems.map((item) =>
        item.id === id
          ? {
              ...item,
              itemId: "",
              itemName: "",
              rate: 0,
              gstPercentage: 0,
              amount: 0,
              currentStock: 0,
            }
          : item
      )
    );
  };

  const updateItemQty = (id, qtyValue) => {
    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.id === id) {
          const qty = parseInt(qtyValue, 10) || 0;
          const rate = Number(item.rate) || 0;
          const gstPct = Number(item.gstPercentage) || 0;
          const subtotal = rate * qty;
          const gstAmount = Math.round(((subtotal * gstPct) / 100) * 100) / 100;
          return {
            ...item,
            qty,
            amount: Math.round((subtotal + gstAmount) * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const subtotalAmount =
    Math.round(
      invoiceItems.reduce(
        (total, item) => total + (Number(item.rate) || 0) * (Number(item.qty) || 0),
        0
      ) * 100
    ) / 100;
  const grandTotal =
    Math.round(invoiceItems.reduce((total, item) => total + Number(item.amount), 0) * 100) / 100;
  const gstAmount = Math.max(0, Math.round((grandTotal - subtotalAmount) * 100) / 100);
  const totalItems = invoiceItems.length;
  const totalQty = invoiceItems.reduce((total, item) => total + (Number(item.qty) || 0), 0);

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Sales Invoice"
        subtitle="Create GST tax invoices with real-time branch stock deduction and POS shortcuts"
        actions={
          <StatusBadge variant="success">
            <Barcode className="w-3.5 h-3.5" />
            <span>HID Barcode Ready</span>
          </StatusBadge>
        }
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {/* Entry Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2">
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

        <div className="xl:col-span-1">
          <InvoiceSummaryCard
            invoiceDate={invoiceDate}
            setInvoiceDate={setInvoiceDate}
            customerId={customerId}
            setCustomerId={setCustomerId}
            customers={customers}
            totalItems={totalItems}
            totalQty={totalQty}
            subtotalAmount={subtotalAmount}
            gstAmount={gstAmount}
            grandTotal={grandTotal}
            handleSaveInvoice={handleSaveInvoice}
            customerSearchRef={customerSearchRef}
          />
        </div>
      </div>

      {/* Saved Invoices Register */}
      <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Saved Sales Invoices</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {savedInvoices.length} invoices
          </span>
        </div>

        {loadingInvoices ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading invoices...</div>
        ) : savedInvoices.length > 0 ? (
          <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Invoice No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5 text-right">Items</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Grand Total</th>
                  <th className="px-4 py-2.5 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {savedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 text-foreground font-mono text-xs font-semibold">
                      {invoice.invoiceNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">
                      {invoice.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {invoice.totalItems}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {invoice.totalQty}
                    </td>
                    <td className="px-4 py-2.5 text-right text-success font-mono font-semibold tabular-nums">
                      ₹ {Number(invoice.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(invoice.id, "A4")}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-primary-text transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>A4</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(invoice.id, "Thermal")}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-accent transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>80mm</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No sales invoices recorded yet
          </div>
        )}
      </div>

      <CommonModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Sales Invoice Saved"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Sales Invoice has been posted and branch stock quantities have been updated.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </CommonModal>
    </div>
  );
}

export default SalesInvoice;
