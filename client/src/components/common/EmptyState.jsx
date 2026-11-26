import { Inbox } from "lucide-react";

/**
 * Clean enterprise empty state with optional action control.
 */
function EmptyState({
  icon,
  message = "No records found",
  description,
  buttonText,
  onButtonClick,
  action,
  className = "",
}) {
  const showButton = Boolean(onButtonClick && buttonText);

  return (
    <div
      className={`bg-card border border-border rounded-lg py-10 px-6 text-center surface-shadow ${className}`}
    >
      <div className="mx-auto w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground mb-3">
        {icon || <Inbox className="w-5 h-5" />}
      </div>

      <h3 className="text-sm font-semibold text-foreground">{message}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>
      )}

      {action ? (
        <div className="mt-4">{action}</div>
      ) : showButton ? (
        <button
          type="button"
          onClick={onButtonClick}
          className="mt-4 inline-flex items-center justify-center h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          {buttonText}
        </button>
      ) : null}
    </div>
  );
}

export default EmptyState;
