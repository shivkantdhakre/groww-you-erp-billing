import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { ArrowLeft, Printer, FileDown, Loader2 } from "lucide-react";
import PrintSelectorCard from "./PrintSelectorCard";
import { usePrintSelectorState } from "./usePrintSelectorState";

const formatINR = (num) =>
  `₹ ${Number(num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Shared live-data A4 print template for Sales Tax Invoices and Purchase Bills.
 * Requires an explicit `:id` or `?id=` to display/print an invoice, or renders an
 * explicit invoice selection list when opened without an ID (never silently printing the latest).
 */
export default function A4InvoiceTemplate({ invoiceType = "SALE" }) {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isPurchase = invoiceType === "PURCHASE";
  const requestedId = paramId || searchParams.get("id");
  const autoPrint = searchParams.get("autoprint") === "1";

  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // Selection mode state when no invoice ID is supplied in the URL
  const [invoiceList, setInvoiceList] = useState([]);
  const [selectorPagination, setSelectorPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const {
    page: selectorPage,
    searchQuery,
    setPage: setSelectorPage,
    setSearchQuery,
  } = usePrintSelectorState(`${isPurchase ? "PURCHASE" : "SALE"}:${requestedId || ""}`);

  useEffect(() => {
    let active = true;
    const loadInvoiceOrList = async () => {
      try {
        setLoading(true);
        setError("");
        setPdfError("");
        setInvoice(null);
        const listEndpoint = isPurchase
          ? "/transactions/purchase-invoices"
          : "/transactions/sales-invoices";

        if (!requestedId) {
          const [compRes, listRes] = await Promise.all([
            api.get("/company"),
            api.get(`${listEndpoint}?limit=25&page=${selectorPage}`),
          ]);
          if (!active) return;
          setCompany(compRes.data);
          setInvoiceList(listRes.data?.data || []);
          setSelectorPagination(
            listRes.data?.pagination || { total: 0, page: selectorPage, totalPages: 1 }
          );
          return;
        }

        const numericId = Number(requestedId);
        if (!Number.isInteger(numericId) || numericId <= 0) {
          const compRes = await api.get("/company");
          if (!active) return;
          setCompany(compRes.data);
          setError("Requested invoice ID is invalid.");
          return;
        }

        const [compRes, invRes] = await Promise.all([
          api.get("/company"),
          api.get(`${listEndpoint}/${numericId}`),
        ]);

        if (!active) return;
        setCompany(compRes.data);
        setInvoice(invRes.data);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load A4 print invoice:", err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to load invoice record for printing."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInvoiceOrList();
    return () => {
      active = false;
    };
  }, [isPurchase, requestedId, selectorPage]);

  useEffect(() => {
    if (requestedId && autoPrint && invoice && company && !loading && !error) {
      const timer = setTimeout(() => window.print(), 450);
      return () => clearTimeout(timer);
    }
  }, [requestedId, autoPrint, invoice, company, loading, error]);

  const handleDownloadPdf = async () => {
    if (!invoice?.id) return;
    try {
      setDownloadingPdf(true);
      setPdfError("");
      const res = await api.get(`/pdf/invoices/${invoice.id}?layout=A4`);
      if (res.data?.pdfUrl) {
        window.open(res.data.pdfUrl, "_blank");
      } else {
        setPdfError("PDF link unavailable for this invoice.");
      }
    } catch (err) {
      console.error("PDF download failed:", err);
      setPdfError(err.response?.data?.error || "Failed to generate PDF file.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const fallbackRoute = isPurchase ? "/purchase-invoice" : "/sales-invoice";
  const printBaseRoute = isPurchase ? "/print/purchase-invoice" : "/print/sales-invoice";
  const docLabel = isPurchase ? "Purchase Bill" : "Sales Invoice";

  if (loading) {
    return (
      <div style={styles.page} className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#1C1F1C]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{requestedId ? "Loading A4 invoice sheet\u2026" : `Loading ${docLabel.toLowerCase()}s\u2026`}</span>
        </div>
      </div>
    );
  }

  // Explicit selection view when no invoice ID is provided
  if (!requestedId) {
    const query = searchQuery.trim().toLowerCase();
    const filteredInvoices = invoiceList.filter((inv) => {
      if (!query) return true;
      const partyName = (isPurchase ? inv.vendor?.name : inv.customer?.name) || "";
      return (
        String(inv.invoiceNo || "").toLowerCase().includes(query) ||
        partyName.toLowerCase().includes(query)
      );
    });

    return (
      <PrintSelectorCard
        backRoute={fallbackRoute}
        backLabel={`Back to ${docLabel}`}
        companyName={company?.name}
        selectorTag={`A4 ${docLabel} Selector`}
        title={`Select a ${docLabel} to Print A4`}
        subtitle="No invoice ID was specified. Choose an explicit record below to preview, print, or download PDF."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={"Filter by invoice no or party\u2026"}
        error={error}
        items={filteredInvoices}
        totalFetchedCount={invoiceList.length}
        emptyBranchMessage={`No ${isPurchase ? "purchase" : "sales"} invoices recorded in the active branch yet.`}
        emptyFilterMessage="No invoices matched your filter on this page."
        emptyActionLabel={`Go to ${docLabel}`}
        onNavigate={navigate}
        columns={[
          { label: "Invoice No" },
          { label: "Date" },
          { label: isPurchase ? "Vendor" : "Customer" },
          { label: "Qty", align: "right" },
          { label: "Grand Total", align: "right" },
        ]}
        renderRowCells={(inv) => (
          <>
            <td className="px-4 py-2.5 font-mono font-semibold text-[#1C1F1C] whitespace-nowrap">
              {inv.invoiceNo}
            </td>
            <td className="px-4 py-2.5 text-[#5C5F58] whitespace-nowrap tabular-nums">
              {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
            </td>
            <td className="px-4 py-2.5 text-[#1C1F1C]">
              {(isPurchase ? inv.vendor?.name : inv.customer?.name) ||
                (isPurchase ? "Cash Supplier" : "Walk-in Customer")}
            </td>
            <td className="px-4 py-2.5 text-right text-[#5C5F58] tabular-nums">{inv.totalQty}</td>
            <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#2D5A47] whitespace-nowrap tabular-nums">
              {formatINR(inv.grandTotal)}
            </td>
          </>
        )}
        getOpenRoute={(inv) => `${printBaseRoute}/${inv.id}`}
        pagination={selectorPagination}
        page={selectorPage}
        onPageChange={setSelectorPage}
        pageContainerStyle={styles.page}
      />
    );
  }

  if (error || !invoice) {
    return (
      <div style={styles.page} className="flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-[#B63A32]">
          {error || `Requested ${docLabel.toLowerCase()} not found in the active branch.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(printBaseRoute)}
            className="px-4 py-2 rounded-md border border-[#D8D3C8] bg-white text-[#1C1F1C] text-xs font-medium cursor-pointer hover:bg-[#F5F3EE]"
          >
            Choose a {docLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate(fallbackRoute)}
            className="px-4 py-2 rounded-md bg-[#2D5A47] text-white text-xs font-medium cursor-pointer"
          >
            Back to {docLabel}s
          </button>
        </div>
      </div>
    );
  }

  const party = isPurchase ? invoice.vendor : invoice.customer;
  const lineItems = (invoice.items || []).map((line) => {
    const qty = Number(line.qty || 0);
    const rate = Number(line.price || 0);
    const subtotal = rate * qty;
    const gstPct = Number(line.gstPercentage || 0);
    const gstAmt =
      Number(line.gstAmount) > 0
        ? Number(line.gstAmount)
        : Math.round(((subtotal * gstPct) / 100) * 100) / 100;
    const total = Number(line.total || subtotal + gstAmt);
    return { ...line, qty, rate, subtotal, gstPct, gstAmt, total };
  });

  const taxableTotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalGst = lineItems.reduce((sum, item) => sum + item.gstAmt, 0);
  const halfGst = totalGst / 2;

  return (
    <div style={styles.page}>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: #FFFFFF !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .a4-sheet {
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .a4-table-scroll {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Action Toolbar */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-2 bg-white border border-[#D8D3C8] rounded-lg px-4 py-2.5 shadow-sm text-[#1C1F1C]">
        <button
          type="button"
          onClick={() => navigate(fallbackRoute)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5F58] hover:text-[#1C1F1C] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {isPurchase ? "Purchase Invoice" : "Sales Invoice"}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {pdfError && <span className="text-xs text-[#B63A32]">{pdfError}</span>}
          <button
            type="button"
            onClick={() => navigate(printBaseRoute)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#D8D3C8] bg-[#F5F3EE] hover:bg-[#E9E5DC] text-xs font-medium text-[#1C1F1C] cursor-pointer"
          >
            <span>All {docLabel}s</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#D8D3C8] bg-[#F5F3EE] hover:bg-[#E9E5DC] text-xs font-medium text-[#1C1F1C] cursor-pointer disabled:opacity-60"
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#2D5A47] hover:bg-[#24493A] text-white text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      {/* Physical A4 Sheet */}
      <div className="a4-sheet" style={styles.sheet}>
        <div style={styles.header}>
          <div style={styles.docBadge}>{isPurchase ? "PURCHASE BILL" : "TAX INVOICE"}</div>
          <h1 style={styles.company}>{company?.name || "GROWW YOU ERP"}</h1>
          {company?.address && <p style={styles.address}>{company.address}</p>}
          <p style={styles.metaLine}>
            {company?.gstNumber ? `GSTIN: ${company.gstNumber}` : ""}
            {company?.gstNumber && company?.mobileNumber ? "  |  " : ""}
            {company?.mobileNumber ? `Ph: ${company.mobileNumber}` : ""}
          </p>
        </div>

        <hr style={styles.divider} />

        <div style={styles.infoGrid}>
          <div>
            <div style={styles.label}>{isPurchase ? "SUPPLIER DETAILS" : "BILLED TO"}</div>
            <div style={styles.partyName}>{party?.name || (isPurchase ? "Cash Supplier" : "Walk-in Customer")}</div>
            {party?.address && <div style={styles.partyMeta}>{party.address}</div>}
            {party?.mobile && <div style={styles.partyMeta}>Mobile: {party.mobile}</div>}
            {party?.gstin && <div style={{ ...styles.partyMeta, fontFamily: "monospace" }}>GSTIN: {party.gstin}</div>}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={styles.label}>{isPurchase ? "PURCHASE INVOICE NO" : "INVOICE NUMBER"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", marginBottom: 6 }}>
              {invoice.invoiceNo}
            </div>
            <div style={styles.partyMeta}>
              Date:{" "}
              <strong>
                {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </strong>
            </div>
            {invoice.ewayBillNo && (
              <div style={{ ...styles.partyMeta, fontFamily: "monospace" }}>E-Way: {invoice.ewayBillNo}</div>
            )}
          </div>
        </div>

        <hr style={styles.divider} />

        <div className="a4-table-scroll overflow-x-auto">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.thLeft, width: 32 }}>#</th>
              <th style={styles.thLeft}>Item Description</th>
              <th style={styles.thLeft}>HSN</th>
              <th style={styles.thRight}>Qty</th>
              <th style={styles.thRight}>Rate</th>
              <th style={styles.thRight}>GST</th>
              <th style={styles.thRight}>Tax Amt</th>
              <th style={styles.thRight}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((line, idx) => (
              <tr key={line.id || idx}>
                <td style={styles.tdLeft}>{idx + 1}</td>
                <td style={styles.tdLeft}>
                  <strong>{line.item?.name || "Item"}</strong>
                  {line.item?.sku && (
                    <span style={{ display: "block", fontSize: 11, color: "#5C5F58", fontFamily: "monospace" }}>
                      SKU: {line.item.sku}
                    </span>
                  )}
                </td>
                <td style={{ ...styles.tdLeft, fontFamily: "monospace", fontSize: 12 }}>
                  {line.item?.hsnCode || "-"}
                </td>
                <td style={styles.tdRight}>
                  {line.qty} {line.item?.unit || ""}
                </td>
                <td style={styles.tdRight}>{formatINR(line.rate)}</td>
                <td style={styles.tdRight}>{line.gstPct}%</td>
                <td style={styles.tdRight}>{formatINR(line.gstAmt)}</td>
                <td style={{ ...styles.tdRight, fontWeight: 600 }}>{formatINR(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div style={styles.totalsWrapper}>
          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <span>Taxable Value</span>
              <span>{formatINR(taxableTotal)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>CGST</span>
              <span>{formatINR(halfGst)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>SGST</span>
              <span>{formatINR(halfGst)}</span>
            </div>
            <div style={{ ...styles.totalRow, ...styles.grandTotalRow }}>
              <span>Grand Total</span>
              <span>{formatINR(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ fontSize: 12, color: "#5C5F58" }}>
            <strong style={{ color: "#1C1F1C", display: "block", marginBottom: 4 }}>Declaration</strong>
            Certified that the particulars given above are true and correct.
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 36 }}>
              For {company?.name || "Groww You ERP"}
            </div>
            <div style={{ fontSize: 12, color: "#5C5F58", borderTop: "1px solid #D8D3C8", paddingTop: 4 }}>
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#EAE6DF",
    color: "#1C1F1C",
    minHeight: "100vh",
    padding: "20px 16px",
  },
  sheet: {
    background: "#FFFFFF",
    color: "#1C1F1C",
    width: "210mm",
    maxWidth: "100%",
    minHeight: "297mm",
    margin: "auto",
    padding: "28px 32px",
    border: "1px solid #D8D3C8",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    marginBottom: 8,
  },
  docBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#2D5A47",
    border: "1px solid #C5D6CD",
    background: "#F3F8F5",
    padding: "2px 10px",
    borderRadius: 4,
    marginBottom: 8,
  },
  company: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.03em",
  },
  address: {
    marginTop: 4,
    marginBottom: 4,
    fontSize: 13,
    color: "#5C5F58",
  },
  metaLine: {
    margin: 0,
    fontSize: 12,
    color: "#5C5F58",
    fontFamily: "monospace",
  },
  divider: {
    border: 0,
    borderTop: "1px solid #D8D3C8",
    margin: "14px 0",
  },
  infoGrid: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#5C5F58",
    marginBottom: 4,
  },
  partyName: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 3,
  },
  partyMeta: {
    fontSize: 12,
    color: "#3F433E",
    lineHeight: 1.5,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    marginTop: 4,
  },
  thLeft: {
    textAlign: "left",
    padding: "8px 6px",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#5C5F58",
    borderBottom: "1px solid #C5C0B4",
  },
  thRight: {
    textAlign: "right",
    padding: "8px 6px",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#5C5F58",
    borderBottom: "1px solid #C5C0B4",
  },
  tdLeft: {
    textAlign: "left",
    padding: "9px 6px",
    borderBottom: "1px solid #EFECE4",
    verticalAlign: "top",
  },
  tdRight: {
    textAlign: "right",
    padding: "9px 6px",
    borderBottom: "1px solid #EFECE4",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  },
  totalsWrapper: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  totalsBox: {
    width: 260,
    border: "1px solid #D8D3C8",
    borderRadius: 6,
    padding: "10px 14px",
    background: "#FAF9F5",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    padding: "3px 0",
    fontVariantNumeric: "tabular-nums",
  },
  grandTotalRow: {
    borderTop: "1px solid #C5C0B4",
    marginTop: 6,
    paddingTop: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#2D5A47",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 48,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 24,
  },
};
