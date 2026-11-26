import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Accessible in-app confirmation modal replacing native window.confirm() calls.
 */
export default function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen || !onCancel) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const confirmClasses =
    variant === "destructive"
      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      : "bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (!loading && onCancel && e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="bg-card text-foreground border border-border rounded-xl w-full max-w-sm popover-shadow p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {message && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{message}</p>
              )}
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              aria-label="Close confirmation"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border/70">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-8 px-3 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`h-8 px-3.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${confirmClasses}`}
          >
            {loading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
