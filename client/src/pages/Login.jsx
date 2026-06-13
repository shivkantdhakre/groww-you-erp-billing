import { useState } from "react";
import api from "../utils/api";
import { useStore } from "../store/useStore";
import BrandLogo from "../components/common/BrandLogo";
import { Mail, Lock, Building, Phone } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const login = useStore((state) => state.login);

  // Forgot Password States
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

      // Trigger global store login action (handles localStorage automatically)
      login(token, user);
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
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
      errors.verification = "Either Company GSTIN or Registered Mobile is required for tenant verification.";
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

      setSuccess(res.data.message || "Password reset successful! You can now log in.");
      // Clear states
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
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground transition-colors duration-300 font-sans relative overflow-hidden">
      {/* Decorative gradient glowing balls using theme-consistent token colors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 dark:bg-primary/25 rounded-full blur-3xl transition-colors duration-300"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl transition-colors duration-300"></div>

      <div className="relative w-full max-w-md p-8 glass-panel-blur border border-border rounded-2xl shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <BrandLogo size={44} showText={true} className="mb-2" />
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            {showForgot
              ? "Verify Tenant details to reset your password"
              : "Sign in to access your business operations"}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-6 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            {success}
          </div>
        )}

        {!showForgot ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Mail className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@growwyou.com"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lock className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
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
                  }}
                  className="text-xs text-primary hover:text-primary/80 cursor-pointer font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {forgotErrors.verification && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg font-semibold">
                ⚠️ {forgotErrors.verification}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Mail className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
                <span>Registered Email</span>
              </label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="admin@growwyou.com"
                className={`w-full px-4 py-2.5 rounded-lg bg-card border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  forgotErrors.email ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
                required
              />
              {forgotErrors.email && (
                <span className="text-xs text-destructive mt-1 block font-semibold">{forgotErrors.email}</span>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Building className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
                <span>Company GSTIN (Tenant Verification)</span>
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="27AAACG1234D1Z5"
                className={`w-full px-4 py-2.5 rounded-lg bg-card border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  forgotErrors.verification ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
              />
            </div>

            <div className="text-center text-xs text-muted-foreground/70 my-1 font-semibold">OR</div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Phone className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
                <span>Registered Mobile (Tenant Verification)</span>
              </label>
              <input
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="9876543210"
                className={`w-full px-4 py-2.5 rounded-lg bg-card border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  forgotErrors.verification ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Lock className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
                <span>New Password</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className={`w-full px-4 py-2.5 rounded-lg bg-card border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  forgotErrors.newPassword ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
                required
              />
              {forgotErrors.newPassword && (
                <span className="text-xs text-destructive mt-1 block font-semibold">{forgotErrors.newPassword}</span>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Lock className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} aria-hidden="true" />
                <span>Confirm New Password</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className={`w-full px-4 py-2.5 rounded-lg bg-card border text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  forgotErrors.confirmPassword ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
                required
              />
              {forgotErrors.confirmPassword && (
                <span className="text-xs text-destructive mt-1 block font-semibold">{forgotErrors.confirmPassword}</span>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-lg hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setError("");
                  setSuccess("");
                  setConfirmPassword("");
                  setForgotErrors({});
                }}
                className="py-3 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold rounded-lg shadow-lg focus:outline-none transition-all duration-200 cursor-pointer"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground/70 font-semibold">
          Secure, multi-tenant cloud operations enabled.
        </div>
      </div>
    </div>
  );
}
