import { useState } from "react";
import api from "../../utils/api";
import { useStore } from "../../store/useStore";
import { CreditCard, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

function RazorpayCheckoutTest() {
  const user = useStore((state) => state.user);
  const [amount, setAmount] = useState("10.00"); // in INR (default 10)
  const [receipt, setReceipt] = useState("");
  const [description, setDescription] = useState("Groww You ERP - General Payment");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState(null); // 'success', 'error', 'warning'

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if already loaded
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

    // Convert amount to paise (1 INR = 100 paise)
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    if (isNaN(amountInPaise) || amountInPaise < 100) {
      setStatusMessage("Amount must be at least ₹1.00 (100 paise).");
      setStatusType("error");
      setLoading(false);
      return;
    }

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setStatusMessage("Failed to load Razorpay SDK. Please check your internet connection.");
        setStatusType("error");
        setLoading(false);
        return;
      }

      // 2. Call backend create-order endpoint
      const orderRes = await api.post("/create-order", {
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt || `rec_test_${Date.now()}`
      });

      const { order_id, currency } = orderRes.data;

      // 3. Open Razorpay payment modal
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_T1svq75Ex6nHGA";

      const options = {
        key: keyId,
        amount: amountInPaise,
        currency: currency,
        name: "Groww You ERP",
        description: description,
        order_id: order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || ""
        },
        theme: {
          color: "#3B82F6"
        },
        modal: {
          ondismiss: function () {
            setStatusMessage("Payment cancelled by the user.");
            setStatusType("warning");
            setLoading(false);
          }
        },
        handler: async function (response) {
          try {
            setLoading(true);
            setStatusMessage("Verifying cryptographic payment signature...");
            setStatusType("warning");

            // 4. Send payment signatures to verification endpoint
            const verifyRes = await api.post("/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data.success) {
              setStatusMessage(`Payment successful! Reference ID: ${response.razorpay_payment_id}`);
              setStatusType("success");
            } else {
              setStatusMessage("Payment verification failed.");
              setStatusType("error");
            }
          } catch (verifyErr) {
            console.error("Payment verification failed:", verifyErr);
            setStatusMessage(verifyErr.response?.data?.message || "Payment signature verification failed.");
            setStatusType("error");
          } finally {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on("payment.failed", function (resp) {
        console.error("Razorpay Payment Failure:", resp.error);
        setStatusMessage(`Payment failed: ${resp.error.description || "Unknown failure reason."}`);
        setStatusType("error");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Order creation failed:", err);
      setStatusMessage(err.response?.data?.message || "Checkout session initialization failed.");
      setStatusType("error");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-card text-foreground rounded-2xl border border-border shadow-xl p-6 md:p-8 relative overflow-hidden backdrop-blur-md">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Razorpay Checkout Test</h2>
            <p className="text-sm text-muted-foreground">Process a standard web payment using Razorpay's sandbox gateway.</p>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border mb-6 transition-all duration-300 text-sm ${
              statusType === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : statusType === "warning"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            {statusType === "success" ? (
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleCheckout} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="amount" className="block text-sm font-semibold mb-2">
                Amount (INR) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-muted-foreground font-medium">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-medium"
                  required
                  disabled={loading}
                />
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">Min ₹1.00 (100 paise)</span>
            </div>

            <div>
              <label htmlFor="receipt" className="block text-sm font-semibold mb-2">
                Receipt Reference
              </label>
              <input
                type="text"
                id="receipt"
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
                placeholder="Optional receipt ID (e.g. rec_1001)"
                className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-medium placeholder:text-muted-foreground/60"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold mb-2">
              Payment Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-medium"
              required
              disabled={loading}
            />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Pay with Razorpay</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RazorpayCheckoutTest;
