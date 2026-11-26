/**
 * Printable A4 Payment Voucher sheet preserving 210mm physical dimensions.
 */
export default function PaymentVoucherPrint() {
  return (
    <div style={container}>
      <div style={sheet}>
        <h2 style={center}>Payment Voucher</h2>
        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <p style={line}>Voucher No: <strong>PV-001</strong></p>
        <p style={line}>Date: 09-06-2026</p>
        <p style={line}>Paid To: <strong>XYZ Vendor</strong></p>

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <h3 style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          Amount: ₹ 5,000.00
        </h3>

        <div style={{ marginTop: 60, textAlign: "right", fontSize: 13, color: "#5C5F58" }}>
          Authorized Signatory
        </div>
      </div>
    </div>
  );
}

const container = { background: "#EAE6DF", color: "#1C1F1C", minHeight: "100vh", padding: 20 };
const sheet = {
  width: "210mm",
  margin: "auto",
  background: "#FFFFFF",
  color: "#1C1F1C",
  padding: 30,
  border: "1px solid #D8D3C8",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};
const center = { textAlign: "center", margin: 0 };
const line = { fontSize: 14, marginBottom: 8 };
