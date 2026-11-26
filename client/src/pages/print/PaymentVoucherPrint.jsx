import A4VoucherTemplate from "./A4VoucherTemplate";

/**
 * Printable A4 Payment Voucher sheet backed by live voucher data.
 */
export default function PaymentVoucherPrint() {
  return <A4VoucherTemplate voucherType="PAYMENT" />;
}
