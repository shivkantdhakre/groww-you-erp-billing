/**
 * Printable A4 Purchase Invoice preview preserving 210mm sheet width.
 */
export default function PurchaseInvoicePrint() {
  return (
    <div style={{ padding: 20, background: "#EAE6DF", color: "#1C1F1C", minHeight: "100vh" }}>
      <div
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "auto",
          background: "#FFFFFF",
          color: "#1C1F1C",
          padding: 30,
          border: "1px solid #D8D3C8",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", margin: 0, fontSize: 20, fontWeight: 700 }}>
          GROWW YOU ERP
        </h2>
        <p style={{ textAlign: "center", marginTop: 4, fontSize: 13, color: "#5C5F58" }}>
          Purchase Invoice
        </p>

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
          <div>Purchase No: <strong>PI-001</strong></div>
          <div>Date: 09-06-2026</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <div>Vendor: <strong>ABC Suppliers</strong></div>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #C5C0B4" }}>
                Item
              </th>
              <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid #C5C0B4" }}>
                Qty
              </th>
              <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid #C5C0B4" }}>
                Rate
              </th>
              <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid #C5C0B4" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #EFECE4" }}>
                Item A
              </td>
              <td style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid #EFECE4", fontVariantNumeric: "tabular-nums" }}>
                3
              </td>
              <td style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid #EFECE4", fontVariantNumeric: "tabular-nums" }}>
                400.00
              </td>
              <td style={{ textAlign: "right", padding: "8px 6px", borderBottom: "1px solid #EFECE4", fontVariantNumeric: "tabular-nums" }}>
                1200.00
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ border: 0, borderTop: "1px solid #D8D3C8", margin: "14px 0" }} />

        <h3 style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          Grand Total: ₹ 1,200.00
        </h3>

        <p style={{ textAlign: "right", marginTop: 48, fontSize: 13, color: "#5C5F58" }}>
          Authorized Signatory
        </p>
      </div>
    </div>
  );
}
