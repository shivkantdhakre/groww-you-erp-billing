import { useEffect } from "react";
import { X } from "lucide-react";

const MODAL_SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Accessible dialog overlay supporting optional close callback and Escape dismissal.
 */
function CommonModal({
  isOpen,
  title,
  description,
  children,
  onClose,
  size = "md",
  className = "",
}) {
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 overscroll-contain"
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-card text-foreground border border-border rounded-xl w-full ${
          MODAL_SIZES[size] || MODAL_SIZES.md
        } popover-shadow max-h-[90dvh] flex flex-col overflow-hidden animate-erp-modal ${className}`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold tracking-tight text-foreground leading-snug">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary erp-focus-ring transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="p-5 overflow-y-auto overscroll-contain scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

export default CommonModal;
