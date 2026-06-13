import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";
import { Check, Loader2, CreditCard, ShieldAlert } from "lucide-react";

function PricingPlans() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // Store references
  const user = useStore((state) => state.user);
  const verifyStatus = useStore((state) => state.verifyStatus);
  const activeSub = user?.subscription;

  // Local States
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Simulation Overlay States
  const isSimulating = searchParams.get("simulate_checkout") === "true";
  const simCompanyId = searchParams.get("companyId");
  const simPlanCode = searchParams.get("planCode");
  const simPrice = searchParams.get("price");
  const simPlanName = searchParams.get("planName");

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);

        // If returning from a successful checkout, refresh subscription state first
        const checkoutStatus = searchParams.get("checkout");
        if (checkoutStatus === "success") {
          await verifyStatus().catch(() => {});
          setMessage("Subscription updated successfully! Welcome to your new tier.");
          setMessageType("success");
        } else if (checkoutStatus === "cancelled") {
          setMessage("Subscription checkout was cancelled.");
          setMessageType("warning");
        }

        const [plansRes, historyRes] = await Promise.all([
          api.get("/billing/plans"),
          api.get("/billing/history").catch(() => ({ data: [] }))
        ]);
        setPlans(plansRes.data);
        setInvoices(historyRes.data);
      } catch (err) {
        console.error("Failed to load billing data:", err);
        setMessage("Failed to load plans from the server.");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };
    fetchBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planCode) => {
    try {
      setCheckoutLoading(planCode);
      const res = await api.post("/billing/checkout", { planCode });

      if (res.data.gateway === "MOCK_SANDBOX") {
        // Direct local redirect to simulate checkout
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = res.data.url;
        return;
      }

      if (res.data.gateway === "RAZORPAY") {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setMessage("Failed to load Razorpay SDK. Check your network.");
          setMessageType("error");
          return;
        }

        const options = {
          key: res.data.keyId,
          amount: res.data.amount,
          currency: res.data.currency,
          name: "Groww You ERP",
          description: res.data.description,
          order_id: res.data.orderId,
          prefill: {
            name: user?.name || "",
            email: user?.email || ""
          },
          theme: {
            color: "#3B82F6"
          },
          handler: async function (response) {
            try {
              setLoading(true);
              // Call verify payment API
              await api.post("/billing/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planCode: res.data.planCode
              });

              // Refresh subscription status in store (updates user.subscription)
              await verifyStatus();

              // Re-fetch plans and billing history so the UI reflects the new active plan
              const [plansRes, historyRes] = await Promise.all([
                api.get("/billing/plans"),
                api.get("/billing/history").catch(() => ({ data: [] }))
              ]);
              setPlans(plansRes.data);
              setInvoices(historyRes.data);

              setMessage("Payment verified and subscription activated successfully!");
              setMessageType("success");
            } catch (verifyErr) {
              console.error("Payment verification failed:", verifyErr);
              setMessage(verifyErr.response?.data?.message || "Payment verification failed.");
              setMessageType("error");
            } finally {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error("Checkout redirection failed:", err);
      setMessage("Checkout failed. Please contact support.");
      setMessageType("error");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setLoading(true);
      const mockEventId = "evt_mock_" + Math.random().toString(36).substring(2, 11);
      
      // Post simulated payload to local webhook route
      await api.post("/billing/webhooks", {
        simulated: true,
        secret: "SIMULATED_SECRET_KEY",
        id: mockEventId,
        type: "order.paid",
        data: {
          object: {
            id: "cs_mock_" + Math.random().toString(36).substring(2, 11),
            customer: "cus_mock_" + Math.random().toString(36).substring(2, 11),
            subscription: "sub_mock_" + Math.random().toString(36).substring(2, 11),
            simulatedMetadata: {
              companyId: simCompanyId,
              planCode: simPlanCode,
              price: parseFloat(simPrice)
            }
          }
        }
      });

      // Reload user status from backend
      await verifyStatus();
      
      // Clear simulation parameters and reload
      navigate("/pricing?checkout=success");
    } catch (err) {
      console.error("Simulation failed:", err);
      setMessage("Payment simulation failed on server.");
      setMessageType("error");
      setLoading(false);
    }
  };

  if (isSimulating) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-card text-foreground border border-border p-8 rounded-2xl w-full max-w-md shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-yellow-500 animate-pulse" />
          
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Stripe Sandbox Simulation</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You are in a development environment. Simulate a Stripe callback to finalize your subscription.
          </p>

          <div className="bg-muted/50 p-4 rounded-xl text-left text-sm space-y-2 mb-6 border border-border">
            <div><span className="text-muted-foreground font-semibold">Plan:</span> {simPlanName}</div>
            <div><span className="text-muted-foreground font-semibold">Plan Code:</span> {simPlanCode}</div>
            <div><span className="text-muted-foreground font-semibold">Amount:</span> ₹ {simPrice}</div>
            <div><span className="text-muted-foreground font-semibold">Company ID:</span> {simCompanyId}</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSimulatePayment}
                className="bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-lg font-bold transition shadow-md w-full cursor-pointer"
              >
                Complete Mock Payment
              </button>
              <button
                onClick={() => navigate("/pricing?checkout=cancelled")}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 py-3 rounded-lg font-semibold transition w-full cursor-pointer"
              >
                Cancel Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight">SaaS Subscription Management</h1>
        <p className="text-muted-foreground">
          Scale your business seamlessly. Choose the perfect tier for your shop or enterprise operations.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-white font-medium shadow-sm transition max-w-2xl mx-auto ${
            messageType === "success"
              ? "bg-emerald-600"
              : messageType === "warning"
              ? "bg-amber-500"
              : "bg-destructive"
          }`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card border border-border rounded-2xl h-[450px] animate-pulse p-6 space-y-4">
              <div className="h-6 w-1/3 bg-muted rounded" />
              <div className="h-10 w-2/3 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded mt-8" />
              <div className="space-y-2 mt-8">
                <div className="h-4 w-5/6 bg-muted rounded" />
                <div className="h-4 w-4/5 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isActive = activeSub?.planCode === plan.code;
              const features = plan.features || {};

              const activePlan = plans.find((p) => p.code === activeSub?.planCode);
              const activePlanPrice = activePlan ? activePlan.price : 0;
              const isDowngrade = plan.price < activePlanPrice;
              const isFreeTrial = plan.price === 0;

              let buttonText = "Upgrade Plan";
              if (isActive) {
                buttonText = "Active Plan";
              } else if (isDowngrade) {
                buttonText = isFreeTrial ? "Trial Expired" : "Downgrade Plan";
              }

              const isButtonDisabled = isActive || (isFreeTrial && activePlanPrice > 0) || checkoutLoading === plan.code;

              return (
                <div
                  key={plan.id}
                  className={`bg-card text-foreground rounded-2xl p-6 border flex flex-col justify-between relative shadow-sm hover:shadow-md transition duration-300 ${
                    isActive 
                      ? "border-primary ring-2 ring-primary/20 scale-[1.02]" 
                      : "border-border"
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-3 right-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                      Current Plan
                    </span>
                  )}

                  <div>
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-extrabold">₹ {plan.price}</span>
                      <span className="text-muted-foreground text-sm">
                        / {plan.interval.toLowerCase() === "yearly" ? "year" : "month"}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-sm mb-6">
                      Provides support for up to {plan.branchLimit} branches and {plan.staffLimit > 1000 ? "unlimited" : plan.staffLimit} staff members.
                    </p>

                    {/* Features checklist */}
                    <ul className="space-y-3 mb-8 text-sm">
                      {features.maxInvoicesPerMonth && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>Max {features.maxInvoicesPerMonth} invoices / mo</span>
                        </li>
                      )}
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Fast Billing Matrix</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Customer/Vendor Ledgers</span>
                      </li>
                      <li className={`${features.ewayBill ? "text-foreground" : "text-muted-foreground/50 line-through"} flex items-center gap-2`}>
                        <Check className={`w-4 h-4 ${features.ewayBill ? "text-emerald-500" : "text-muted-foreground/30"} shrink-0`} />
                        <span>E-Way Bill Integration</span>
                      </li>
                      <li className={`${features.gstFiling ? "text-foreground" : "text-muted-foreground/50 line-through"} flex items-center gap-2`}>
                        <Check className={`w-4 h-4 ${features.gstFiling ? "text-emerald-500" : "text-muted-foreground/30"} shrink-0`} />
                        <span>GSTR-1 & GSTR-3B Filing</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    disabled={isButtonDisabled}
                    onClick={() => handleSubscribe(plan.code)}
                    className={`w-full py-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                      isButtonDisabled
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : isDowngrade
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "bg-primary text-primary-foreground hover:bg-primary/95"
                    }`}
                  >
                    {checkoutLoading === plan.code ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        {buttonText}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Billing History */}
          <div className="bg-card text-foreground rounded-2xl border border-border p-6 shadow-sm max-w-4xl">
            <h2 className="text-xl font-bold mb-4">Billing & Invoice History</h2>
            
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No past billing statements found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-secondary-foreground border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Invoice No</th>
                      <th className="text-right p-3 font-semibold">Amount</th>
                      <th className="text-center p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border hover:bg-muted/30 transition">
                        <td className="p-3 text-muted-foreground">
                          {new Date(inv.billingDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="p-3 font-mono font-semibold">{inv.invoiceNo}</td>
                        <td className="p-3 text-right font-semibold">₹ {inv.amount}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PricingPlans;
