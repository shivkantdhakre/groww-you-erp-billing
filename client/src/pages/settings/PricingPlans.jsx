import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import TableWrapper from "../../components/common/TableWrapper";
import api from "../../utils/api";
import { formatCount, formatCompactINR } from "../../utils/formatters";
import { Check, Loader2, CreditCard, ShieldAlert, X } from "lucide-react";

/**
 * SaaS subscription plan comparison, Razorpay checkout, sandbox simulator, and billing history.
 */
function PricingPlans() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const user = useStore((state) => state.user);
  const verifyStatus = useStore((state) => state.verifyStatus);
  const activeSub = user?.subscription;

  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const isSimulating = searchParams.get("simulate_checkout") === "true";
  const simCompanyId = searchParams.get("companyId");
  const simPlanCode = searchParams.get("planCode");
  const simPrice = searchParams.get("price");
  const simPlanName = searchParams.get("planName");
  const checkoutStatusParam = searchParams.get("checkout");

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);

        if (checkoutStatusParam === "success") {
          await verifyStatus().catch(() => {});
          setMessage("Subscription updated successfully.");
          setMessageType("success");
        } else if (checkoutStatusParam === "cancelled") {
          setMessage("Subscription checkout was cancelled.");
          setMessageType("warning");
        }

        const [plansRes, historyRes] = await Promise.all([
          api.get("/billing/plans"),
          api.get("/billing/history").catch(() => ({ data: [] })),
        ]);
        setPlans(plansRes.data || []);
        setInvoices(historyRes.data || []);
      } catch (err) {
        console.error("Failed to load billing data:", err);
        setMessage("Failed to load plans from the server.");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };
    fetchBillingData();
  }, [checkoutStatusParam, verifyStatus]);

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
        window.location.assign(res.data.url);
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
            email: user?.email || "",
          },
          theme: {
            color: "#2D5A47",
          },
          handler: async function (response) {
            try {
              setLoading(true);
              await api.post("/billing/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planCode: res.data.planCode,
              });

              await verifyStatus();

              const [plansRes, historyRes] = await Promise.all([
                api.get("/billing/plans"),
                api.get("/billing/history").catch(() => ({ data: [] })),
              ]);
              setPlans(plansRes.data || []);
              setInvoices(historyRes.data || []);

              setMessage("Payment verified and subscription activated.");
              setMessageType("success");
            } catch (verifyErr) {
              console.error("Payment verification failed:", verifyErr);
              setMessage(verifyErr.response?.data?.message || "Payment verification failed.");
              setMessageType("error");
            } finally {
              setLoading(false);
            }
          },
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
              price: parseFloat(simPrice),
            },
          },
        },
      });

      await verifyStatus();
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
        <div className="bg-card text-foreground border border-border p-6 sm:p-8 rounded-xl w-full max-w-md popover-shadow space-y-5 text-center">
          <div className="mx-auto w-11 h-11 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-center text-warning">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sandbox Payment Simulation</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Simulate a payment webhook callback in this local development workspace.
            </p>
          </div>

          <div className="bg-secondary/40 p-4 rounded-md text-left text-xs space-y-2 border border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-semibold text-foreground">{simPlanName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono text-foreground">{simPlanCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-mono font-semibold text-foreground tabular-nums">₹ {simPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company ID</span>
              <span className="font-mono text-foreground tabular-nums">{simCompanyId}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-6 h-6 text-primary-text animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md text-xs sm:text-sm font-medium transition-colors w-full cursor-pointer"
              >
                Complete Mock Payment
              </button>
              <button
                type="button"
                onClick={() => navigate("/pricing?checkout=cancelled")}
                className="bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 h-9 rounded-md text-xs sm:text-sm font-medium transition-colors w-full cursor-pointer"
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
    <div className="space-y-6 text-foreground">
      <CommonPageHeader
        title="Subscription & Billing"
        subtitle="Select your workspace tier, branch capacity, and GST filing entitlements"
        badge={
          activeSub?.planCode && (
            <StatusBadge variant="success">
              Active:{" "}
              {plans.find((p) => p.code === activeSub.planCode)?.name || activeSub.planCode}
            </StatusBadge>
          )
        }
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-card border border-border rounded-lg h-96 animate-pulse p-5 space-y-4"
            >
              <div className="h-5 w-1/3 bg-muted rounded" />
              <div className="h-8 w-2/3 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="space-y-2 pt-4">
                <div className="h-3.5 w-5/6 bg-muted rounded" />
                <div className="h-3.5 w-4/5 bg-muted rounded" />
                <div className="h-3.5 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {(() => {
            const standardPlans = plans.filter((p) => p.interval?.toLowerCase() !== "yearly");
            const annualPlans = plans.filter((p) => p.interval?.toLowerCase() === "yearly");
            const renderPlanCard = (plan) => {
              const isActive = activeSub?.planCode === plan.code;
              const features = plan.features || {};
              const activePlan = plans.find((p) => p.code === activeSub?.planCode);
              const activePlanPrice = activePlan ? activePlan.price : 0;
              const isDowngrade = plan.price < activePlanPrice;
              const isFreeTrial = plan.price === 0;

              let buttonText = "Upgrade Plan";
              if (isActive) buttonText = "Active Plan";
              else if (isDowngrade) buttonText = isFreeTrial ? "Trial Expired" : "Switch Plan";

              const isButtonDisabled =
                isActive ||
                (isFreeTrial && activePlanPrice > 0) ||
                checkoutLoading === plan.code;

              return (
                <div
                  key={plan.id}
                  className={`bg-card text-foreground rounded-lg p-5 border flex flex-col justify-between surface-shadow transition-colors ${
                    isActive ? "border-primary ring-1 ring-primary/30" : "border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                      {isActive && <StatusBadge variant="primary">Current Plan</StatusBadge>}
                    </div>

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl sm:text-3xl font-mono font-semibold tracking-tight tabular-nums">
                        {formatCompactINR(plan.price)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        / {plan.interval?.toLowerCase() === "yearly" ? "year" : "month"}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-xs leading-relaxed pb-4 mb-4 border-b border-border/70">
                      Up to {plan.branchLimit} branch{plan.branchLimit === 1 ? "" : "es"} and{" "}
                      {plan.staffLimit > 1000 ? "unlimited" : plan.staffLimit} staff seats.
                    </p>

                    <ul className="space-y-2.5 mb-6 text-xs sm:text-sm">
                      {features.maxInvoicesPerMonth && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                          <span>Up to {features.maxInvoicesPerMonth} invoices / mo</span>
                        </li>
                      )}
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                        <span>Billing &amp; POS Terminal</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                        <span>Customer &amp; Vendor Ledgers</span>
                      </li>
                      <li
                        className={`flex items-center gap-2 ${
                          features.ewayBill ? "text-foreground" : "text-muted-foreground/60"
                        }`}
                      >
                        {features.ewayBill ? (
                          <Check className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50 shrink-0" aria-hidden="true" />
                        )}
                        <span>E-Way Bill Integration</span>
                      </li>
                      <li
                        className={`flex items-center gap-2 ${
                          features.gstFiling ? "text-foreground" : "text-muted-foreground/60"
                        }`}
                      >
                        {features.gstFiling ? (
                          <Check className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50 shrink-0" aria-hidden="true" />
                        )}
                        <span>GSTR-1 &amp; GSTR-3B Filing</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isButtonDisabled}
                    onClick={() => handleSubscribe(plan.code)}
                    className={`w-full h-9 rounded-md text-xs sm:text-sm font-medium erp-focus-ring transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                      isButtonDisabled
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : isDowngrade
                          ? "bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {checkoutLoading === plan.code ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" aria-hidden="true" />
                        <span>{buttonText}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            };

            return (
              <div className="space-y-6">
                {standardPlans.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Trial &amp; Monthly Plans
                    </h2>
                    <div
                      className={`grid grid-cols-1 gap-5 ${
                        standardPlans.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
                      }`}
                    >
                      {standardPlans.map(renderPlanCard)}
                    </div>
                  </section>
                )}

                {annualPlans.length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Annual Billing Plans
                    </h2>
                    <div
                      className={`grid grid-cols-1 gap-5 ${
                        annualPlans.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
                      }`}
                    >
                      {annualPlans.map(renderPlanCard)}
                    </div>
                  </section>
                )}
              </div>
            );
          })()}

          {/* Billing History */}
          <div className="bg-card text-foreground rounded-lg border border-border surface-shadow overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Billing &amp; Invoice History</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatCount(invoices.length, "statement")}
              </span>
            </div>

            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-xs py-8 text-center">
                No past billing statements found.
              </p>
            ) : (
              <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Invoice No</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="elevated-table-row transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                          {new Date(inv.billingDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                          {inv.invoiceNo}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                          ₹ {Number(inv.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <StatusBadge variant="success">{inv.status}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PricingPlans;
