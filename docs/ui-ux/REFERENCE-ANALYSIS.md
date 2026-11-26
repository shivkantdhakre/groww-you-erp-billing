# External Accounting & Financial UI Reference Analysis

> **Purpose:** Ground the **Atelier Ledger** UI/UX refinement pass (`uiux/skills-driven-refinement`) in real-world accounting software ergonomics and modern financial SaaS restraint — avoiding generic "AI dashboard" decoration.

---

## 1. Benchmark Sources Consulted

During Phase 4 discovery (`search_web` comparative analysis across accounting & fintech product literature):

1. **TallyPrime (`tallysolutions.com` gateway & voucher references)**
   - **Benchmark strength:** Keyboard-first voucher & ledger gateway ergonomics (`F8` Sales, `Ctrl+A` commit, `Alt+C` inline lookup/focus), instant visual distinction between narration, party ledger, stock item lines, and bottom tax ledger summary.
2. **Zoho Books (`zoho.com/books` invoice workflow references)**
   - **Benchmark strength:** Clean single-page document entry flow with clear visual grouping between party header, editable line-item table (Item, Qty, Rate, Tax, Amount), and right/bottom taxable-vs-GST calculation panel without crowding inputs.
3. **Xero & QuickBooks Online (SME accounting UI conventions)**
   - **Benchmark strength:** Ledger-grade scannability — left-aligned party/account narratives, strictly right-aligned tabular figures, understated status pills reserved only for exceptions/overdue/reconciled states, and persistent action bars on long forms.
4. **Stripe Dashboard (`stripe.com` UI literature via `designsystems.one` / `open-design.ai`)**
   - **Benchmark strength:** Calm trust-first financial hierarchy: muted warm/cool light surfaces, hairline borders instead of heavy shadows, crisp monospace/tabular figures aligned to the decimal point, honest validation banners above actionable fields, and predictable empty/error states.
5. **Linear (`linear.app` UI literature via `open-design.ai` / `lobehub.com`)**
   - **Benchmark strength:** Canvas-unified sidebar navigation separated by razor-thin dividers (rather than distinct heavy colored boxes), deliberate focus-visible rings (`2px`), keyboard shortcut badges (`kbd`) rendered cleanly inline, and optical negative tracking on primary headings.

---

## 2. Comparative Translation into Groww You ERP

| Area | What Already Works Well | Current Defect / Friction Found in Codebase | Reference-Driven Refinement |
| :--- | :--- | :--- | :--- |
| **App Shell & Sidebar (`Sidebar.jsx`, `Navbar.jsx`)** | Route-synced expandable ERP groups, mobile drawer toggle, branch selector (`COMPANY_ADMIN`/`SUPER_ADMIN`), theme toggle | Sidebar uses heavier tinted `--sidebar` box contrasting abruptly against `--background`; bare `focus:outline-none` on brand logo, branch select, and search bar; search input uses `...` | Unify Sidebar onto canvas ground (`Linear`-inspired hairline `border-r`), add visible `focus-visible` rings, skip-to-main-content link, typographic `…`, and `overscroll-behavior: contain` on mobile drawer |
| **Typography & Controls (`index.css`, 21+ modules)** | `IBM Plex Sans` + `IBM Plex Mono` pairing and warm Atelier palette (`#F5F3EE` / `#FDFCF9` / `#2D5A47` / `#9F623B`) | 21+ files duplicate `INPUT_CLASS` using `bg-card` directly on `bg-card` cards (zero inset contrast between container and editable input); bare `focus:outline-none` when focus-visible is omitted | Define shared `.erp-input`, `.erp-select`, `.erp-readonly`, `.erp-label` utilities in `index.css` backed by inset `--input-bg` token (`#F7F5F0` light / `#161B18` dark) + crisp `focus-visible` ring + coarse-pointer `16px` mobile floor |
| **Dashboard (`Dashboard.jsx`, `AIPipelineInsightsCard.jsx`)** | Real DB aggregates, live Gemini pipeline narrative, clean light/dark theme | Middle-dot subtitle joins (`Groww You ERP · FY`), appended text arrows (`Day Book →`, `Stock Report →`, `Ledgers →`), 4 uniform KPI cards fighting `AI Pipeline Insights` for dominance | Replace middle dots with structured meta badges; remove literal `&rarr;` text arrows; elevate Executive Financial Overview vs AI Advisory card contrast; format every `₹` amount in `en-IN` |
| **Billing & POS (`SalesInvoice.jsx`, `PurchaseInvoice.jsx`, `PurchaseReturn.jsx`, `SalesReturn.jsx`)** | Fast keyboard shortcuts (`F2`, `Alt+N`, `Alt+C`, `Ctrl+P`), HID barcode listener, TanStack Virtual rows, live invoice preview | Totals panel (`Taxable Subtotal`, `Total GST`, `Grand Total`) and line rates render raw `.toFixed(2)` without Indian digit grouping (`1,23,456.78`); `"1 invoices"` / `"1 bills"` singular/plural bug; barcode shortcuts text uses `·` | Create shared `client/src/utils/formatters.js` (`formatINR`, `pluralize`), apply Indian comma formatting uniformly in live entry totals & ledgers without altering calculations or shortcuts (`F2`/`Alt+N` stay zero-latency) |
| **CRM Pipeline & Drawer (`Leads.jsx`, `LeadDetailDrawer.jsx`)** | Functional stage filter chips, risk score badges, real AI executive profiler drawer | `<tr onClick>` lacks keyboard button/Enter semantics; `LeadDetailDrawer.jsx:355` uses `transition-all duration-300`; contact metadata joins `·` leaving visual noise; mobile scroll bleeding behind drawer | Make company title/button primary keyboard trigger; replace `transition-all` with `transition-[width] duration-200` (`--ease-out`); add `overscroll-behavior: contain`; replace middle dots with clean icon/meta gaps |
| **Accounting Books & Reports (`CashBook`, `BankBook`, `DayBook`, `ProfitReport`, `OutstandingReport`, `StockReport`, `Payment/ReceiptVoucher`)** | Clean accounting Dr/Cr polarity badges and CSV/Print support | Consistent `toFixed(2)` currency inconsistency across `BankBook`, `CashBook`, `DayBook`, `OutstandingReport`, `ProfitReport`, `PurchaseReport`, `SalesReport`, `StockReport`, and vouchers; plural count strings | Standardize `formatINR` + `tabular-nums` + right-aligned debit/credit/balance figures (`Stripe`/`Xero` ledger standard), clarify opening vs closing balance hierarchy, fix singular/plural counts |
| **Motion & Mobile Native (`index.css`, Modals, Drawers)** | Fast modals (`CommonModal`, `ConfirmDialog`), responsive `TableWrapper` | `index.css` kills all CSS opacity transitions under `prefers-reduced-motion`; `min-h-screen` ignores mobile browser toolbars; inputs can trigger mobile Safari/Chrome zoom below `16px` | Use `min-h-dvh`, `@media (pointer: coarse)` `16px` floor on inputs/selects, `@media (hover: hover)` hover lift gating, gentle opacity transitions even in reduced-motion mode, zero bounce on ERP shortcuts |

---

## 3. Non-Negotiable Constraints Derived From Benchmarking

1. **Preserve Speed Over Decoration:** Like TallyPrime, an operator entering 40 invoices/hour cannot wait on entrance animations or bloated card padding. Billing tables remain tight, high-contrast, and immediately keyboard-navigable.
2. **Ledger Alignment Is Non-Negotiable:** Like Stripe & Xero, every monetary figure (`Subtotal`, `CGST/SGST`, `Grand Total`, `Debit`, `Credit`, `Closing Balance`) aligns to a strict right edge in `IBM Plex Mono` with Indian comma grouping (`₹ 1,24,500.00`).
3. **Never Mask Controls or Invent Chrome:** Preserve existing Express/Prisma API contracts, branch/tenant boundaries, `A4`/`80mm` print templates, and existing keyboard bindings cleanly.
