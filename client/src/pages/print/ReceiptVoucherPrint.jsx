import A4VoucherTemplate from "./A4VoucherTemplate";

/**
 * Printable A4 Receipt Voucher sheet backed by live voucher data.
 */
export default function ReceiptVoucherPrint() {
  return <A4VoucherTemplate voucherType="RECEIPT" />;
}
