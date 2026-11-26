import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";

const formatINR = (num) =>
  `₹ ${Number(num || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Shared live-data A4 voucher template for Payment and Receipt Vouchers.
 */
export default function A4VoucherTemplate({ voucherType = "PAYMENT" }) {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isReceipt = voucherType === "RECEIPT";
  const requestedId = paramId || searchParams.get("id");

  const [voucher, setVoucher] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadVoucher = async () => {
      try {
        setLoading(true);
        setError("");
        const [compRes, listRes] = await Promise.all([
          api.get("/company"),
          api.get(`/transactions/vouchers?type=${voucherType}&fromDate=2000-01-01&limit=200&page=1`),
        ]);
        if (!active) return;
        setCompany(compRes.data);
        const rows = listRes.data?.data || [];
        const matched = requestedId
          ? rows.find((v) => String(v.id) === String(requestedId)) || null
          : rows[0] || null;
        if (requestedId && !matched) {
          setError("Requested voucher not found in the active branch.");
        }
        setVoucher(matched);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load voucher print:", err);
        setError("Failed to fetch voucher details from server.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadVoucher();
    return () => {
      active = false;
    };
  }, [voucherType, requestedId]);

  const backRoute = isReceipt ? "/receipt-voucher" : "/payment-voucher";

  if (loading) {
    return (
      <div style={container} className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#1C1F1C]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading voucher print sheet...</span>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div style={container} className="flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[#1C1F1C]">
          {error || `No ${isReceipt ? "receipt" : "payment"} vouchers recorded in this branch yet.`}
        </p>
        <button
          type="button"
          onClick={() => navigate(backRoute)}
          className="px-4 py-2 rounded-md bg-[#2D5A47] text-white text-xs font-medium cursor-pointer"
        >
          Back to {isReceipt ? "Receipt Vouchers" : "Payment Vouchers"}
        </button>
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
          <span>Back to {isReceipt ? "Receipt Vouchers" : "Payment Vouchers"}</span>
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
            {voucher.referenceNo ? ` · Ref: ${voucher.referenceNo}` : ""}
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
