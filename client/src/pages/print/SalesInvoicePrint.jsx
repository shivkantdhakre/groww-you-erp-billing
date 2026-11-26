/**
 * Printable A4 Tax Invoice preview preserving 210mm x 297mm physical paper dimensions.
 */
function SalesInvoicePrint() {
  return (
    <div style={styles.page}>
      <div style={styles.sheet}>
        <div style={styles.header}>
          <h2 style={styles.company}>GROWW YOU ERP</h2>
          <p style={styles.address}>Agra, Uttar Pradesh, India</p>
        </div>

        <hr style={styles.divider} />

        <div style={styles.row}>
          <div>Invoice No: <strong>SI-001</strong></div>
          <div>Date: 09-06-2026</div>
        </div>

        <div style={styles.row}>
          <div>Customer: <strong>Rahul Traders</strong></div>
          <div>Mobile: 9876543210</div>
        </div>

        <hr style={styles.divider} />

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>Item</th>
              <th style={styles.thRight}>Qty</th>
              <th style={styles.thRight}>Rate</th>
              <th style={styles.thRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdLeft}>Product A</td>
              <td style={styles.tdRight}>2</td>
              <td style={styles.tdRight}>500.00</td>
              <td style={styles.tdRight}>1000.00</td>
            </tr>
            <tr>
              <td style={styles.tdLeft}>Product B</td>
              <td style={styles.tdRight}>1</td>
              <td style={styles.tdRight}>700.00</td>
              <td style={styles.tdRight}>700.00</td>
            </tr>
          </tbody>
        </table>

        <hr style={styles.divider} />

        <h3 style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", marginTop: 16 }}>
          Grand Total: ₹ 1,700.00
        </h3>

        <div style={styles.footer}>
          Authorized Signatory
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
    padding: 20,
  },
  sheet: {
    background: "#FFFFFF",
    color: "#1C1F1C",
    width: "210mm",
    minHeight: "297mm",
    margin: "auto",
    padding: "30px",
    border: "1px solid #D8D3C8",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  },
  header: {
    textAlign: "center",
    marginBottom: 12,
  },
  company: {
    textAlign: "center",
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  address: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
    color: "#5C5F58",
  },
  divider: {
    border: 0,
    borderTop: "1px solid #D8D3C8",
    margin: "14px 0",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  thLeft: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "1px solid #C5C0B4",
  },
  thRight: {
    textAlign: "right",
    padding: "8px 6px",
    borderBottom: "1px solid #C5C0B4",
  },
  tdLeft: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "1px solid #EFECE4",
  },
  tdRight: {
    textAlign: "right",
    padding: "8px 6px",
    borderBottom: "1px solid #EFECE4",
    fontVariantNumeric: "tabular-nums",
  },
  footer: {
    marginTop: 48,
    textAlign: "right",
    fontSize: 13,
    color: "#5C5F58",
  },
};

export default SalesInvoicePrint;
