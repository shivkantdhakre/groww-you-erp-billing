# Groww You ERP — Design System Specification

> **Identity:** *Atelier Ledger* — an understated, precision-oriented enterprise financial and operations interface inspired by modern operational software (Linear, Stripe Dashboard, Ramp, Vercel). Built for long-hour desktop data entry, GST accounting, inventory control, and branch-isolated operations without visual noise.

---

## 1. Visual Principles

1. **Operational Clarity Over Decoration**: No gradient hero cards, neon accents, glowing blurs, or decorative glassmorphism. Every visual treatment signals hierarchy, state, or action.
2. **Surface Discipline**: Warm limestone canvas (`#F5F3EE`) grounds elevated warm-paper cards (`#FDFCF9`) in light mode; deep obsidian slate (`#131614` / `#1B1F1C`) provides balanced low-glare contrast in dark mode without simply inverting light colors.
3. **Tabular Precision**: All monetary values (`₹`), quantities, percentages, invoice numbers, and tax splits use `tabular-nums` alignment (`font-variant-numeric: tabular-nums`) and explicit directional indicators (`Dr` / `Cr`, `+` / `-`, icons) rather than relying on color alone.
4. **High-Density Ergonomics**: Compact `36px` (`h-9`) filter/table controls and `40px` (`h-10`) primary form inputs keep operational matrices fast and scannable across 1440px, 1280px, 1024px, 768px, and 390px viewports.

---

## 2. Color Tokens (HSL CSS Custom Properties)

### Brand & Accent
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--primary` | `155 33% 26%` (`#2D5A47`) | `155 34% 33%` (`#377058`) | Primary actions, active nav indicator, primary focus |
| `--primary-foreground` | `150 25% 98%` (`#F8FBF9`) | `150 25% 98%` (`#F8FBF9`) | Text/icons on `--primary` |
| `--primary-text` | `155 33% 26%` (`#2D5A47`) | `155 38% 60%` (`#72BE9D`) | Links, interactive text accents, highlighted metrics |
| `--accent` | `23 46% 43%` (`#9F623B`) | `26 52% 56%` (`#C88356`) | Restrained copper secondary highlight (brand mark, tags) |
| `--accent-foreground` | `30 33% 98%` (`#FCF9F6`) | `24 25% 10%` (`#1F1813`) | Text on `--accent` |

### Surfaces & Text Hierarchy
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `43 26% 95%` (`#F5F3EE`) | `140 8% 8%` (`#131614`) | Application canvas |
| `--sidebar` | `42 22% 92%` (`#EFECE4`) | `140 7% 9%` (`#161917`) | Persistent left navigation rail |
| `--card` / `--popover` | `40 40% 99%` (`#FDFCF9`) | `135 7% 11%` (`#1B1F1C`) | Elevated surfaces, modals, drawers, dropdowns |
| `--secondary` / `--muted` | `42 23% 90%` (`#ECE8DF`) | `132 7% 15%` (`#232824`) | Recessed wells, table headers, subtle pills |
| `--foreground` | `120 6% 13%` (`#202420`) | `44 20% 90%` (`#EAE7DF`) | Primary headings, body text, amounts |
| `--muted-foreground` | `83 4% 37%` (`#5E6159`) | `80 4% 60%` (`#9A9D94`) | Field labels, table headers, secondary metadata |

### Borders & Semantic Colors
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--border` | `42 18% 84%` (`#DED9CD`) | `132 5% 19%` (`#2D322E`) | Hairline structural dividers |
| `--input` | `41 16% 78%` (`#D0CABD`) | `132 5% 23%` (`#373D38`) | Input control borders |
| `--success` | `151 50% 28%` (`#236B48`) | `150 38% 48%` (`#4CA97B`) | Posted invoices, healthy margin, Cr/receipts |
| `--warning` | `32 78% 36%` (`#A36114`) | `36 68% 54%` (`#D99B3B`) | Stale cache, trial notice, low-priority alert |
| `--destructive` | `4 57% 45%` (`#B63A32`) | `4 64% 63%` (`#DF6C64`) | Validation errors, voided records, low stock, Dr/dues |

---

## 3. Typography & Numeric Discipline

- **Primary Sans**: `'IBM Plex Sans', system-ui, -apple-system, sans-serif`
- **Monospace**: `'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace` (used for GSTIN, SKU, HSN, voucher numbers, invoice numbers, API codes)
- **Numeric Class**: `.tabular-nums` (`font-variant-numeric: tabular-nums`) applied on all currency amounts, quantities, tax percentages, totals, and counts.
- **Scale**:
  - Page Title (`h1`): `1.375rem` / `22px`, `font-semibold`, `tracking-[-0.02em]`
  - Section Heading (`h2`): `0.9375rem` / `15px`, `font-semibold`, `tracking-[-0.01em]`
  - Table Header (`th`): `0.6875rem` / `11px`, `font-semibold`, `uppercase`, `tracking-[0.06em]`
  - Body / Table Cell (`td`): `0.8125rem` / `13px`, `leading-[1.45]`
  - Field Label: `0.75rem` / `12px`, `font-medium`, `text-muted-foreground`

---

## 4. Layout, Spacing, Radius & Elevation

- **Border Radius**:
  - `--radius`: `0.5rem` (`8px`) — panels, cards, modals
  - `--radius-md`: `0.375rem` (`6px`) — inputs, buttons, select menus, dropdown items
  - `--radius-sm`: `0.25rem` (`4px`) — status badges, keycaps, checkboxes
- **Shadows**:
  - Restrained structural border (`1px solid hsl(var(--border))`) with subtle elevation `--shadow-xs: 0 1px 2px rgba(24, 26, 22, 0.04)` and `--shadow-popover: 0 8px 24px -4px rgba(24, 26, 22, 0.10)`.
- **Component Heights**:
  - Compact Toolbar / Table Control: `36px` (`h-9`)
  - Standard Form Input / Primary Button: `40px` (`h-10`)
  - Top Navbar: `56px` (`h-14`)
  - Sidebar Width: `248px` (`w-62`) desktop; `264px` slide-over drawer `< 1024px`
- **Breakpoints**: Mobile `390px`, Tablet `768px`, Tablet Landscape `1024px`, Laptop `1280px`, Desktop `1440px`.
- **Motion**: Crisp `150ms cubic-bezier(0.16, 1, 0.3, 1)` transitions for interactive states; `@media (prefers-reduced-motion: reduce)` disables non-essential transitions and animations.

---

## 5. Shared Component Architecture

All screens compose from consistent primitives under `client/src/components/common/`:
- `CommonPageHeader`: Unified title, optional description, breadcrumb integration, and right-aligned action/shortcut/status slot.
- `CommonButton`: Variants `primary | secondary | outline | ghost | danger | success`, sizes `sm | md | lg | icon`.
- `CommonCard`: Clean metric/KPI block with label, tabular value, optional icon/meta, and semantic accent indicator.
- `CommonFilter`: Compact horizontal filter bar with responsive grid/flex wrapping.
- `CommonModal` & `ConfirmDialog`: Accessible dialogs (`role="dialog"`, `aria-modal="true"`, Escape and backdrop close) replacing browser `alert()`/`window.confirm()`.
- `TableWrapper` & `CommonTable`: Unified table chrome (`border border-border rounded-lg bg-card overflow-x-auto`), loading skeleton state, and clean `EmptyState`.
- `ValidationMessage`: Inline status banner (`error | success | warning | info`) with dismiss control and semantic accessible contrast.
- `Autocomplete`: Portal-mounted combobox with keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`), clear action, and custom option rendering.
- `Breadcrumb`: Inline compact navigation trail (`text-xs`) with clickable route hierarchy.
- `Pagination`: Compact tabular page selector.

---

## 6. Print Isolation Contract

- All `/print/*` routes (`SalesInvoicePrint`, `PurchaseInvoicePrint`, `PaymentVoucherPrint`, `ReceiptVoucherPrint`, `ThermalInvoicePrint`) render outside the application shell (`App.jsx` `isPrintPage` check) with exact physical paper dimensions preserved (`210mm x 297mm` A4 sheets and `80mm` thermal cash memo with `@media print` `@page` rules).
