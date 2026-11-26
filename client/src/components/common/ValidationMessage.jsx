import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const STATUS_STYLES = {
  error: {
    box: "bg-destructive/10 text-destructive border-destructive/25",
    Icon: AlertCircle,
  },
  success: {
    box: "bg-success/10 text-success border-success/25",
    Icon: CheckCircle2,
  },
  warning: {
    box: "bg-warning/10 text-warning border-warning/25",
    Icon: AlertTriangle,
  },
  info: {
    box: "bg-primary/10 text-primary-text border-primary/25",
    Icon: Info,
  },
};

/**
 * Inline status banner using semantic design tokens.
 */
function ValidationMessage({ type = "info", message, onDismiss, className = "" }) {
  if (!message) return null;

  const { box, Icon } = STATUS_STYLES[type] || STATUS_STYLES.info;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium mt-3 ${box} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span className="flex-1 leading-relaxed">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 erp-focus-ring transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default ValidationMessage;
