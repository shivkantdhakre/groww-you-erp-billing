import { useState } from "react";
import api from "../../utils/api";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import ValidationMessage from "../../components/common/ValidationMessage";
import { CreditCard, Loader2 } from "lucide-react";

const INPUT_CLASS = "erp-input";
const LABEL_CLASS = "erp-label";

/**
 * Sandbox payment gateway diagnostic screen verifying Razorpay order creation & HMAC signature verification.
 */
function RazorpayCheckoutTest() {
  const user = useStore((state) => state.user);
  const [amount, setAmount] = useState("10.00");
  const [receipt, setReceipt] = useState("");
  const [description, setDescription] = useState("Groww You ERP - General Payment");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState("info");

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (Number.isNaN(amountInPaise) || amountInPaise < 100) {
      setStatusMessage("Amount must be at least ₹1.00 (100 paise).");
      setStatusType("error");
      setLoading(false);
      return;
    }

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setStatusMessage("Failed to load Razorpay SDK. Please check your internet connection.");
        setStatusType("error");
        setLoading(false);
        return;
      }

      const orderRes = await api.post("/create-order", {
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt || `rec_test_${Date.now()}`,
      });

      const { order_id, currency } = orderRes.data;
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_T1svq75Ex6nHGA";

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency,
        name: "Groww You ERP",
        description,
        order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2D5A47",
        },
        modal: {
          ondismiss: function () {
            setStatusMessage("Payment cancelled by user.");
            setStatusType("warning");
            setLoading(false);
          },
        },
        handler: async function (response) {
          try {
            setLoading(true);
            setStatusMessage("Verifying payment signature...");
            setStatusType("warning");

            const verifyRes = await api.post("/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              setStatusMessage(`Payment verified. Reference ID: ${response.razorpay_payment_id}`);
              setStatusType("success");
            } else {
              setStatusMessage("Payment verification failed.");
              setStatusType("error");
            }
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            setStatusMessage(
              verifyErr.response?.data?.message || "Payment signature verification failed."
            );
            setStatusType("error");
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        console.error("Razorpay Payment Failure:", resp.error);
        setStatusMessage(
          `Payment failed: ${resp.error.description || "Unknown failure reason."}`
        );
        setStatusType("error");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Order creation failed:", err);
      setStatusMessage(
        err.response?.data?.message || "Checkout session initialization failed."
      );
      setStatusType("error");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5 text-foreground">
      <CommonPageHeader
        title="Razorpay Checkout Verification"
        subtitle="Execute a sandbox payment flow to test order creation and signature verification"
      />

      <ValidationMessage
        type={statusType}
        message={statusMessage}
        onDismiss={() => setStatusMessage(null)}
        className="mt-0!"
      />

      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow p-5 sm:p-6">
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-border/70">
          <div className="p-2 rounded-md bg-primary/10 border border-primary/20 text-primary-text">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Gateway Parameters</h2>
            <p className="text-xs text-muted-foreground">
              Currency: INR | Environment: Sandbox
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className={LABEL_CLASS}>
                Amount (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${INPUT_CLASS} pl-7 font-mono tabular-nums`}
                  required
                  disabled={loading}
                />
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Minimum ₹ 1.00 (100 paise)
              </span>
            </div>

            <div>
              <label htmlFor="receipt" className={LABEL_CLASS}>
                Receipt Reference
              </label>
              <input
                type="text"
                id="receipt"
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
                placeholder="Optional (e.g. rec_1001)"
                className={`${INPUT_CLASS} font-mono`}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={LABEL_CLASS}>
              Payment Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={INPUT_CLASS}
              required
              disabled={loading}
            />
          </div>

          <div className="pt-4 border-t border-border/70 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing\u2026</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay with Razorpay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RazorpayCheckoutTest;
