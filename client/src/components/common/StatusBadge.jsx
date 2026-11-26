const BADGE_VARIANTS = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  destructive: "bg-destructive/10 text-destructive border-destructive/25",
  accent: "bg-accent/10 text-accent border-accent/25",
  primary: "bg-primary/10 text-primary-text border-primary/25",
};

/**
 * Crisp enterprise semantic status pill.
 */
export default function StatusBadge({ children, variant = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium leading-tight whitespace-nowrap ${
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}
