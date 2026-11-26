import { useState, useEffect } from "react";
import api from "../utils/api";
import { useStore } from "../store/useStore";
import BrandLogo from "../components/common/BrandLogo";
import ValidationMessage from "../components/common/ValidationMessage";
import { Mail, Lock, Building, Phone, Eye, EyeOff, Sun, Moon, ShieldCheck } from "lucide-react";

const INPUT_CLASS = "erp-input h-10 px-3.5";
const LABEL_CLASS = "erp-label flex items-center gap-1.5";

/**
 * Multi-tenant authentication & GSTIN/mobile-verified password recovery portal.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const login = useStore((state) => state.login);

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [forgotErrors, setForgotErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;
      login(token, user);
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const trimmedGst = gstNumber.trim().toUpperCase();
    const errors = {};

    if (!forgotEmail) {
      errors.email = "Registered email is required.";
    }
    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters long.";
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (!trimmedGst && !mobileNumber) {
      errors.verification =
        "Either Company GSTIN or Registered Mobile is required for tenant verification.";
    }

    if (Object.keys(errors).length > 0) {
      setForgotErrors(errors);
      setError("Please resolve the validation errors below.");
      return;
    }

    setForgotErrors({});
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", {
        email: forgotEmail,
        newPassword,
        gstNumber: trimmedGst || null,
        mobileNumber: mobileNumber || null,
      });

      setSuccess(res.data.message || "Password reset successful. You can now sign in.");
      setForgotEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setGstNumber("");
      setMobileNumber("");
      setForgotErrors({});
      setShowForgot(false);
    } catch (err) {
      console.error("Forgot password failed:", err);
      setError(
        err.response?.data?.error || "Password reset failed. Verify your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col justify-between p-4 sm:p-6">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <BrandLogo size={36} showText={true} />
        <button
          type="button"
          onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          className="h-8 w-8 rounded-md border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground erp-focus-ring transition-colors cursor-pointer"
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Sun className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-card border border-border rounded-xl popover-shadow p-6 sm:p-8 space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-text">
              Workspace Access
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mt-1">
              {showForgot ? "Reset Account Password" : "Sign in to Groww You ERP"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {showForgot
                ? "Verify your tenant GSTIN or registered mobile to authorize a password change."
                : "Enter your workspace credentials to manage billing, ledgers, and compliance."}
            </p>
          </div>

          <ValidationMessage
            type="error"
            message={error}
            onDismiss={() => setError("")}
            className="mt-0!"
          />
          <ValidationMessage
            type="success"
            message={success}
            onDismiss={() => setSuccess("")}
            className="mt-0!"
          />

          {!showForgot ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={LABEL_CLASS}>
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className={INPUT_CLASS}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`${LABEL_CLASS} mb-0!`}>
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setError("");
                      setSuccess("");
                      setConfirmPassword("");
                      setForgotErrors({});
                      setShowPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }}
                    className="text-xs text-primary-text hover:underline cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`${INPUT_CLASS} pr-10`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded erp-focus-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-md erp-focus-ring transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "Signing In\u2026" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              {forgotErrors.verification && (
                <ValidationMessage
                  type="error"
                  message={forgotErrors.verification}
                  className="mt-0!"
                />
              )}

              <div>
                <label className={LABEL_CLASS}>
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Registered Email</span>
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className={`${INPUT_CLASS} ${
                    forgotErrors.email ? "border-destructive focus:ring-destructive" : ""
                  }`}
                  required
                />
                {forgotErrors.email && (
                  <span className="text-xs text-destructive mt-1 block">{forgotErrors.email}</span>
                )}
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  <Building className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Company GSTIN (Tenant Verification)</span>
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="27AAACG1234D1Z5"
                  className={`${INPUT_CLASS} font-mono uppercase ${
                    forgotErrors.verification ? "border-destructive" : ""
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                <span className="h-px flex-1 bg-border" />
                <span>OR</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Registered Mobile</span>
                </label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile"
                  className={`${INPUT_CLASS} font-mono tabular-nums ${
                    forgotErrors.verification ? "border-destructive" : ""
                  }`}
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`${INPUT_CLASS} pr-10 ${
                      forgotErrors.newPassword ? "border-destructive" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {forgotErrors.newPassword && (
                  <span className="text-xs text-destructive mt-1 block">
                    {forgotErrors.newPassword}
                  </span>
                )}
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Confirm New Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`${INPUT_CLASS} pr-10 ${
                      forgotErrors.confirmPassword ? "border-destructive" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {forgotErrors.confirmPassword && (
                  <span className="text-xs text-destructive mt-1 block">
                    {forgotErrors.confirmPassword}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-md erp-focus-ring cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {loading ? "Resetting\u2026" : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setError("");
                    setSuccess("");
                    setConfirmPassword("");
                    setForgotErrors({});
                    setShowPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="h-9 px-4 bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 font-medium text-sm rounded-md cursor-pointer transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <footer className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-text" />
          <span>Tenant-isolated PostgreSQL & GST compliance platform</span>
        </span>
        <span>Groww You ERP</span>
      </footer>
    </div>
  );
}
