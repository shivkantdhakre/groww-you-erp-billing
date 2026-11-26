/**
 * Standardized interactive button supporting variant styles and backward-compatible
 * `{ text, onClick, color }` props.
 */
const VARIANT_CLASSES = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent shadow-xs",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
  outline:
    "bg-card text-foreground hover:bg-secondary/70 border border-border",
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent shadow-xs",
};

const SIZE_CLASSES = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-md",
  lg: "h-10 px-5 text-sm gap-2 rounded-lg",
};

function CommonButton({
  text,
  children,
  onClick,
  color,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const customColorClass =
    color && color !== "bg-blue-600" ? `${color} text-white` : VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        SIZE_CLASSES[size] || SIZE_CLASSES.md
      } ${customColorClass} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children || text}
    </button>
  );
}

export default CommonButton;
