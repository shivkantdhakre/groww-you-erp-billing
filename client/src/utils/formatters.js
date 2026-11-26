/**
 * Shared frontend formatting utilities ensuring Indian GST accounting consistency
 * across invoices, vouchers, books, masters, and executive summaries.
 */

export function formatINR(value, options = {}) {
  const { decimals = 2, withSymbol = true } = options;
  const num = Number(value || 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  const formatted = safeNum.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSymbol ? `₹ ${formatted}` : formatted;
}

export function formatCompactINR(value) {
  return formatINR(value, { decimals: 0 });
}

export function formatDashboardINR(value) {
  const num = Number(value || 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  return `₹ ${safeNum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatCount(count, singular, plural = `${singular}s`) {
  const n = Number(count || 0);
  return `${n.toLocaleString("en-IN")} ${n === 1 ? singular : plural}`;
}

export function formatStageLabel(stage) {
  if (!stage) return "New";
  return String(stage)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
