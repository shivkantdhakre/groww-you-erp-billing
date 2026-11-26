# Design System — Atelier Ledger (Skills-Refined Edition)

> **Product:** Groww You ERP (Indian GST Billing, Inventory, Ledgers, Statutory Compliance & CRM)  
> **Direction:** Editorial precision meets tactile paper ledgers — calm warm neutral stone surfaces, deep Forest Trust (`#2D5A47`) primary authority, refined Copper (`#9F623B`) interactive warning/spotlight accents, `IBM Plex Sans` + `IBM Plex Mono` tabular typography, and subtle inset controls.  
> **Benchmark Alignment:** Keyboard ergonomics of TallyPrime + structured invoicing of Zoho Books + ledger alignment & restraint of Stripe / Xero + canvas-unified rail of Linear.

---

## 1. Surface & Depth Hierarchy (Four Deliberate Levels)

Rather than separating chrome with heavy borders or disparate shades, surfaces form an intentional light-to-dark hierarchy:

1. **Canvas Ground (`--background`)**
   - Light: `#F5F3EE` (`43 26% 95%`) — warm limestone / archival paper ground.
   - Dark: `#131614` (`140 8% 8%`) — deep slate-obsidian ground.
   - **Navigation Rail (`--sidebar`):** Shares the canvas ground (`--background`) and is separated strictly by a crisp hairline border (`--border`), removing two-tone chrome clutter while active items hold a warm neutral pill + vertical primary accent marker.
2. **Primary Panel / Card Surface (`--card`)**
   - Light: `#FDFCF9` (`40 40% 99%`) with `1px solid` hairline border (`#DCD7CA`) and micro ambient shadow.
   - Dark: `#1A1E1B` (`135 7% 11%`) with `#292E2A` hairline border.
3. **Interactive Control Inset (`--input-bg`)**
   - Light: `#F5F2EA` (`42 27% 94%`) inside elevated cards/forms — perceptibly inset below `#FDFCF9` so editable fields invite entry without heavy stroke weights.
   - Dark: `#121513` (`140 8% 7.5%`) — perceptibly recessed below `#1A1E1B`.
4. **Read-Only / Derived Ledger Well (`--muted`)**
   - Light: `#ECE8DF` (`42 20% 90%`) for auto-generated invoice numbers, derived tax sums, and disabled fields.
   - Dark: `#212622` (`140 6% 14%`).

---

## 2. Color Palette & Accessibility Contrast

| Role | Light Value | Dark Value | Intended Usage |
| :--- | :--- | :--- | :--- |
| Primary Authority (`--primary`) | `#2D5A47` | `#3D7A60` | Primary save/commit CTAs, active section emphasis, focus outlines |
| Primary Accessible Text (`--primary-text`) | `#224737` | `#6DB898` | Inline links, active nav text, interactive icons (`>= 4.5:1`) |
| Copper Accent (`--accent`) | `#9F623B` | `#C78052` | Pending approvals, high-attention operational states, secondary callouts |
| Ledger Credit / Positive (`--success`) | `#206346` | `#4CA880` | Revenue figures, cleared GST statuses, healthy stock |
| Ledger Debit / Risk (`--destructive`) | `#B63A32` | `#E06259` | Negative margins, overdue alerts, destructive confirmations |
| Hairline Border (`--border`) | `#DCD7CA` | `#292E2A` | Table rules, section dividers, panel frames |
| Control Border (`--input`) | `#CCC6B8` | `#343B36` | Editable input/select perimeter |

Native `<option>` elements inherit explicit `--card` background and `--foreground` text plus `color-scheme: light` / `dark` on `html` to prevent white-on-white or dark-on-light browser dropdown artifacts.

---

## 3. Typography & Optical Numerals (`IBM Plex Sans` + `IBM Plex Mono`)

- **UI Sans:** `IBM Plex Sans` with crisp display tracking (`-0.022em` on `h1`/`h2`) and `text-wrap: balance` on page titles.
- **Financial & Statutory Mono:** `IBM Plex Mono` paired with `font-variant-numeric: tabular-nums` on every currency figure, GSTIN, invoice ID, voucher number, HSN, date, and KPI counter.
- **Universal INR Standard:** Format every rupee amount through `formatINR()` (`₹ 1,24,500.00` via `en-IN`, two decimals everywhere transactional/tabular; whole-rupee option only for high-level dashboard cards when explicitly uniform).
- **Editorial restraint:** Never use middle-dot (`·`) joins for metadata rows or literal HTML arrows (`→`) in interactive UI buttons/links; pair clean labels with structural Lucide icons and semantic spacing.

---

## 4. Form & Control Standardization

Shared semantic utility classes in `client/src/index.css` replace duplicated per-file `INPUT_CLASS` constants:
- `.erp-input`: `h-9` (desktop) / `min-h-[44px]` or `16px` under `@media (pointer: coarse)`, `--input-bg` inset fill, `--input` border, smooth `border-color`/`background-color` transitions, `:focus-visible` ring (`2px` `--ring`), zero outline flash on mouse clicks.
- `.erp-readonly`: Recessed `--muted` surface with `--border`, monospaced tabular output, clear non-editable cursor.
- `.erp-label`: Balanced weight `11.5px` (`text-[11px] sm:text-xs font-medium text-muted-foreground`) avoiding shouty uppercase clutter where sentence/title labels scan faster.

---

## 5. Motion, Reduced Motion & Mobile-Native Rules

- **Custom Easing Curves:**
  - `--ease-out`: `cubic-bezier(0.23, 1, 0.32, 1)` (fast response, calm settle).
  - `--ease-drawer`: `cubic-bezier(0.32, 0.72, 0, 1)` (slide-over drawer / mobile sheet).
- **Zero-Latency Rule for Transactional Speed:** POS shortcuts (`F2`, `Alt+N`, `Alt+C`, `Ctrl+P`), table sorting, and virtualized grid rows never wait on animation delays.
- **Banned `transition-all`:** Transitions enumerate exact composited/color properties (`color`, `background-color`, `border-color`, `opacity`, `transform`, `width`).
- **Gentle Reduced Motion:** Under `@media (prefers-reduced-motion: reduce)`, disable translational/scale movement while allowing gentle `120ms` opacity fades instead of `0.01ms` snapping.
- **Mobile-Native Guarantees:**
  - `min-h-dvh` instead of `min-h-screen` on shell & Auth.
  - `@media (pointer: coarse)` enforces `font-size: 16px` on editable form inputs/selects/textareas in screen media (eliminating mobile browser auto-zoom without breaking accessibility zoom).
  - `overscroll-behavior: contain` on scrollable drawers, modals, and autocomplete popovers.
  - `@media (hover: hover) and (pointer: fine)` gates interactive hover elevation.
  - `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` on all interactive controls.
