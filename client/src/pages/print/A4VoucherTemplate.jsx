import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import PrintSelectorCard from "./PrintSelectorCard";
import { usePrintSelectorState } from "./usePrintSelectorState";

const formatINR = (num) =>
  `₹ ${Number(num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Shared live-data A4 voucher template for Payment and Receipt Vouchers.
 * Resolves exact IDs safely across all paginated pages (preserving company & branch isolation),
 * and presents a selection list when no voucher ID is provided so nothing prints silently.
 */
export default function A4VoucherTemplate({ voucherType = "PAYMENT" }) {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isReceipt = voucherType === "RECEIPT";
  const requestedId = paramId || searchParams.get("id");
  const autoPrint = searchParams.get("autoprint") === "1";

  const [voucher, setVoucher] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selection mode state when no voucher ID is present in the URL
  const [voucherList, setVoucherList] = useState([]);
  const [selectorPagination, setSelectorPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const {
    page: selectorPage,
    searchQuery,
    setPage: setSelectorPage,
    setSearchQuery,
  } = usePrintSelectorState(`${voucherType}:${requestedId || ""}`);

  useEffect(() => {
    let active = true;

    const loadVoucherOrList = async () => {
      try {
        setLoading(true);
        setError("");
        setVoucher(null);

        if (!requestedId) {
          const [compRes, listRes] = await Promise.all([
            api.get("/company"),
            api.get(
              `/transactions/vouchers?type=${voucherType}&fromDate=2000-01-01&limit=25&page=${selectorPage}`
            ),
          ]);
          if (!active) return;
          setCompany(compRes.data);
          setVoucherList(listRes.data?.data || []);
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
          setError("Requested voucher ID is invalid.");
          return;
        }

        const compRes = await api.get("/company");
        if (!active) return;
        setCompany(compRes.data);

        // Server currently exposes paginated GET /transactions/vouchers without GET /vouchers/:id;
        // paginate boundedly through totalPages so historical vouchers beyond record 200 are found
        // while preserving server-enforced companyId and branchId isolation.
        let page = 1;
        let totalPages = 1;
        let matched = null;

        while (page <= totalPages && !matched) {
          const listRes = await api.get(
            `/transactions/vouchers?type=${voucherType}&fromDate=2000-01-01&limit=200&page=${page}`
          );
          if (!active) return;
          const rows = listRes.data?.data || [];
          totalPages = Math.max(1, Number(listRes.data?.pagination?.totalPages || 1));
          matched = rows.find((v) => String(v.id) === String(numericId)) || null;
          if (matched || rows.length === 0) break;
          page += 1;
        }

        if (!matched) {
          setError("Requested voucher not found in the active branch.");
        }
        setVoucher(matched);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load voucher print:", err);
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to fetch voucher details from server."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVoucherOrList();
    return () => {
      active = false;
    };
  }, [voucherType, requestedId, selectorPage]);

  useEffect(() => {
    if (requestedId && autoPrint && voucher && company && !loading && !error) {
      const timer = setTimeout(() => window.print(), 450);
      return () => clearTimeout(timer);
    }
  }, [requestedId, autoPrint, voucher, company, loading, error]);

  const backRoute = isReceipt ? "/receipt-voucher" : "/payment-voucher";
  const printBaseRoute = isReceipt ? "/print/receipt-voucher" : "/print/payment-voucher";
  const docLabel = isReceipt ? "Receipt Voucher" : "Payment Voucher";

  if (loading) {
    return (
      <div style={container} className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#1C1F1C]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{requestedId ? "Loading voucher print sheet\u2026" : `Loading ${docLabel.toLowerCase()}s\u2026`}</span>
        </div>
      </div>
    );
  }

  // Explicit voucher selection view when no ID is supplied in the URL
  if (!requestedId) {
    const query = searchQuery.trim().toLowerCase();
    const filteredVouchers = voucherList.filter((v) => {
      if (!query) return true;
      const party = (isReceipt ? v.customer?.name : v.vendor?.name) || "";
      return (
        String(v.voucherNo || "").toLowerCase().includes(query) ||
        party.toLowerCase().includes(query) ||
        String(v.paymentMode || "").toLowerCase().includes(query) ||
        String(v.referenceNo || "").toLowerCase().includes(query)
      );
    });

    return (
      <PrintSelectorCard
        backRoute={backRoute}
        backLabel={`Back to ${docLabel}s`}
        companyName={company?.name}
        selectorTag={`A4 ${docLabel} Selector`}
        title={`Select a ${docLabel} to Print A4`}
        subtitle="No voucher ID was specified. Choose an explicit voucher below to open its A4 print sheet."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={"Filter by number or party\u2026"}
        error={error}
        items={filteredVouchers}
        totalFetchedCount={voucherList.length}
        emptyBranchMessage={`No ${docLabel.toLowerCase()}s recorded in the active branch yet.`}
        emptyFilterMessage="No vouchers matched your filter on this page."
        emptyActionLabel={`Go to ${docLabel}s`}
        onNavigate={navigate}
        columns={[
          { label: "Voucher No" },
          { label: "Date" },
          { label: isReceipt ? "Received From" : "Paid To" },
          { label: "Mode" },
          { label: "Amount", align: "right" },
        ]}
        getRowClassName={(v) => (v.isCancelled ? "opacity-60 bg-[#FDF3F2]" : "hover:bg-[#FAF9F5]")}
        renderRowCells={(v) => (
          <>
            <td className="px-4 py-2.5 font-mono font-semibold text-[#1C1F1C] whitespace-nowrap">
              {v.voucherNo}
              {v.isCancelled && (
                <span className="ml-2 text-[10px] font-sans uppercase px-1.5 py-0.5 rounded bg-[#FADAD7] text-[#9A2F28]">
                  Voided
                </span>
              )}
            </td>
            <td className="px-4 py-2.5 text-[#5C5F58] whitespace-nowrap tabular-nums">
              {new Date(v.voucherDate).toLocaleDateString("en-IN")}
            </td>
            <td className="px-4 py-2.5 text-[#1C1F1C]">
              {(isReceipt ? v.customer?.name : v.vendor?.name) || "-"}
            </td>
            <td className="px-4 py-2.5 text-[#5C5F58]">{v.paymentMode || "-"}</td>
            <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#2D5A47] whitespace-nowrap tabular-nums">
              {formatINR(v.amount)}
            </td>
          </>
        )}
        getOpenRoute={(v) => `${printBaseRoute}/${v.id}`}
        pagination={selectorPagination}
        page={selectorPage}
        onPageChange={setSelectorPage}
        pageContainerStyle={container}
      />
    );
  }

  if (error || !voucher) {
    return (
      <div style={container} className="flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-[#B63A32]">
          {error || "Requested voucher not found in the active branch."}
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
            onClick={() => navigate(backRoute)}
            className="px-4 py-2 rounded-md bg-[#2D5A47] text-white text-xs font-medium cursor-pointer"
          >
            Back to {docLabel}s
          </button>
        </div>
      </div>
    );
  }

  const partyName = isReceipt
    ? voucher.customer?.name || "Customer"
    : voucher.vendor?.name || "Vendor";

  return (
    <div style={container}>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: #FFFFFF !important; margin: 0 !important; }
          .no-print { display: none !important; }
          .voucher-sheet { border: none !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between gap-2 bg-white border border-[#D8D3C8] rounded-lg px-4 py-2.5 shadow-sm text-[#1C1F1C]">
        <button
          type="button"
          onClick={() => navigate(backRoute)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5F58] hover:text-[#1C1F1C] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {docLabel}s</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(printBaseRoute)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#D8D3C8] bg-[#F5F3EE] hover:bg-[#E9E5DC] text-xs font-medium text-[#1C1F1C] cursor-pointer"
          >
            <span>All {docLabel}s</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-[#2D5A47] hover:bg-[#24493A] text-white text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      <div className="voucher-sheet" style={sheet}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#2D5A47", marginBottom: 4 }}>
            {isReceipt ? "RECEIPT VOUCHER" : "PAYMENT VOUCHER"}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{company?.name || "GROWW YOU ERP"}</h2>
          {company?.address && (
            <p style={{ marginTop: 4, fontSize: 12, color: "#5C5F58" }}>{company.address}</p>
          )}
        </div>

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
          <div>
            Voucher No: <strong style={{ fontFamily: "monospace" }}>{voucher.voucherNo}</strong>
            {voucher.isCancelled && (
              <span style={{ marginLeft: 8, fontSize: 11, color: "#B63A32", fontWeight: 700 }}>
                [VOIDED]
              </span>
            )}
          </div>
          <div>
            Date: <strong>{new Date(voucher.voucherDate).toLocaleDateString("en-IN")}</strong>
          </div>
        </div>

        <p style={line}>
          {isReceipt ? "Received From" : "Paid To"}: <strong>{partyName}</strong>
        </p>
        {voucher.paymentMode && (
          <p style={line}>
            Mode: <strong>{voucher.paymentMode}</strong>
            {voucher.referenceNo ? ` | Ref: ${voucher.referenceNo}` : ""}
          </p>
        )}
        {voucher.remarks && <p style={line}>Remarks: {voucher.remarks}</p>}

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <h3 style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 18, color: "#2D5A47" }}>
          Amount: {formatINR(voucher.amount)}
        </h3>

        <div style={{ marginTop: 64, display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5C5F58" }}>
          <span>Receiver&apos;s Signature</span>
          <span>Authorized Signatory</span>
        </div>
      </div>
    </div>
  );
}

const container = { background: "#EAE6DF", color: "#1C1F1C", minHeight: "100vh", padding: 20 };
const sheet = {
  width: "210mm",
  maxWidth: "100%",
  margin: "auto",
  background: "#FFFFFF",
  color: "#1C1F1C",
  padding: 32,
  border: "1px solid #D8D3C8",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};
const line = { fontSize: 14, marginBottom: 8 };
