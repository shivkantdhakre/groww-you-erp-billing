/**
 * Printable A4 Receipt Voucher sheet preserving 210mm physical dimensions.
 */
export default function ReceiptVoucherPrint() {
  return (
    <div style={{ padding: 20, background: "#EAE6DF", color: "#1C1F1C", minHeight: "100vh" }}>
      <div
        style={{
          width: "210mm",
          margin: "auto",
          background: "#FFFFFF",
          color: "#1C1F1C",
          padding: 30,
          border: "1px solid #D8D3C8",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", margin: 0 }}>Receipt Voucher</h2>
        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <p style={{ fontSize: 14, marginBottom: 8 }}>Receipt No: <strong>RV-001</strong></p>
        <p style={{ fontSize: 14, marginBottom: 8 }}>Date: 09-06-2026</p>
        <p style={{ fontSize: 14, marginBottom: 8 }}>Received From: <strong>ABC Customer</strong></p>

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <h3 style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          Amount: ₹ 3,000.00
        </h3>

        <div style={{ marginTop: 60, textAlign: "right", fontSize: 13, color: "#5C5F58" }}>
          Authorized Signatory
        </div>
      </div>
    </div>
  );
}
