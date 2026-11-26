import { useState, useEffect, useCallback } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { Building2, Loader2, Printer, RotateCcw, Search } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Bank book cashflow register with account filter, Dr/Cr columns, and print support.
 */
function BankBook() {
  const [bankAccount, setBankAccount] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [bankEntries, setBankEntries] = useState([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBankBook = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/reports/bank-book?fromDate=${fromDate}&toDate=${toDate}`);
      setOpeningBalance(res.data.openingBank || 0);
      setBankEntries(res.data.bankEntries || []);
    } catch (err) {
      console.error("Failed to load bank book:", err);
      setError("Failed to load bank book data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBankBook();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadBankBook]);

  const filteredEntries = bankEntries.filter((entry) => {
    if (!bankAccount) return true;
    return entry.particulars.toLowerCase().includes(bankAccount.toLowerCase());
  });

  const totalDeposit = filteredEntries.reduce((total, item) => total + item.receipt, 0);
  const totalWithdrawal = filteredEntries.reduce((total, item) => total + item.payment, 0);
  const closingBalance = openingBalance + totalDeposit - totalWithdrawal;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Bank Book"
        subtitle="Track deposits, withdrawals, UPI settlements, and running bank ledger balances"
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-secondary/70 text-xs font-medium text-foreground cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Book</span>
          </button>
        }
      />

      <ValidationMessage
        type="error"
        message={error}
        onDismiss={() => setError("")}
        className="mt-0!"
      />

      <CommonFilter className="no-print mb-0!">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className={LABEL_CLASS}>Bank Account / Mode</label>
            <select
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All Bank Accounts</option>
              <option>HDFC Bank</option>
              <option>ICICI Bank</option>
              <option>UPI</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="button"
            onClick={loadBankBook}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBankAccount("");
              setFromDate("");
              setToDate("");
              setTimeout(() => {
                loadBankBook();
              }, 80);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </CommonFilter>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
          <span>Loading bank book records...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CommonCard
              title="Opening Balance"
              value={`₹ ${openingBalance.toFixed(2)}`}
              color="text-foreground"
              icon={Building2}
            />
            <CommonCard
              title="Total Deposits (Dr)"
              value={`₹ ${totalDeposit.toFixed(2)}`}
              color="text-success"
            />
            <CommonCard
              title="Total Withdrawals (Cr)"
              value={`₹ ${totalWithdrawal.toFixed(2)}`}
              color="text-destructive"
            />
            <CommonCard
              title="Closing Balance"
              value={`₹ ${closingBalance.toFixed(2)}`}
              color="text-primary-text"
            />
          </div>

          <TableWrapper>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Voucher No</th>
                  <th className="px-4 py-2.5">Particulars</th>
                  <th className="px-4 py-2.5 text-right">Deposit (Dr)</th>
                  <th className="px-4 py-2.5 text-right">Withdrawal (Cr)</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredEntries.map((item, index) => (
                  <tr key={index} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {item.date}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                      {item.voucherNo}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">{item.particulars}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-success tabular-nums">
                      {item.receipt > 0 ? (
                        <span>₹ {item.receipt.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-destructive tabular-nums">
                      {item.payment > 0 ? (
                        <span>₹ {item.payment.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground tabular-nums">
                      ₹ {item.balance.toFixed(2)}{" "}
                      <StatusBadge variant={item.balance >= 0 ? "success" : "destructive"} className="ml-1">
                        {item.balance >= 0 ? "Dr" : "Cr"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No bank transactions found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrapper>
        </>
      )}
    </div>
  );
}

export default BankBook;
