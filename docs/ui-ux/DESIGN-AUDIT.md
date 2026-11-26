# Consolidated Frontend UI/UX Audit — Groww You ERP

> **Baseline Commit Audited:** `b1f0ff4` (on branch `uiux/skills-driven-refinement`)  
> **Baseline Screenshot Run:** `docs/ui-ux/screenshots/before/capture-summary.json` (47 screenshots across `1440px`, `1280px`, `1024px`, `768px`, `390px`; Light & Dark)  
> **Skills Applied for Audit Criteria:** `frontend-design`, `interface-design`, `ui-ux-pro-max`, `web-design-guidelines`, `animate`, `review-animations`, `mobile-native`, `break-ui`

---

## 1. Executive Summary

Groww You ERP already has a coherent warm neutral + Forest Trust + Copper Ledger baseline (`Atelier Ledger`) with zero horizontal scroll overflow (`overflowPx: 0` across all 47 baseline captures) and zero uncaught page exceptions (`pageErrors: []`).

However, systematic code inspection across all **73 frontend source files** and visual inspection of the **47 baseline screenshots** reveal recurring structural, typographic, accessibility, responsive-grid, formatting, and motion weaknesses that keep the UI from feeling genuinely benchmark-grade (TallyPrime speed + Zoho Books clarity + Stripe/Linear discipline).

---

## 2. Top Cross-Cutting Findings (Verified in Code & Screenshots)

### F1. Flat Input Elevation & 21x Duplicated Form Class Strings (`interface-design`)
- **Severity:** High (Design System Craft)
- **Evidence:**
  - `Login.jsx`, `Customers.jsx`, `Vendors.jsx`, `Inventory.jsx`, `Leads.jsx`, `PaymentVoucher.jsx`, `ReceiptVoucher.jsx`, `ContraVoucher.jsx`, `JournalVoucher.jsx`, `CashBook.jsx`, `BankBook.jsx`, `DayBook.jsx`, `CustomerLedger.jsx`, `VendorLedger.jsx`, `PurchaseReturn.jsx`, `SalesReturn.jsx`, `SalesReport.jsx`, `PurchaseReport.jsx`, `StockReport.jsx`, `ProfitReport.jsx`, `ComplianceDashboard.jsx`, `CompanySettings.jsx`, `UserManagement.jsx`, `ProfileSettings.jsx`, `RazorpayCheckoutTest.jsx` each copy-paste local `const INPUT_CLASS` and `const LABEL_CLASS`.
  - Editable inputs render `bg-card` directly on `bg-card` panels — zero luminance step distinguishing interactive controls from read-only card ground (`SalesInvoice` & `PurchaseInvoice` summary panels in baseline screenshots).
- **Correction:** Introduce `--input-bg` inset tokens (`#F7F5F0` light, `#161B18` dark) and shared CSS classes `.erp-input`, `.erp-readonly`, `.erp-label` in `client/src/index.css`.

### F2. Inconsistent INR Formatting & Decimal Alignment (`ui-ux-pro-max`, `break-ui`)
- **Severity:** High (Accounting Trust & Readability)
- **Evidence (Verified in `sales-invoice-1440-light.png`, `purchase-invoice-1440-light.png`, `customers-1440-light.png`, and source code):**
  - `SalesInvoice.jsx` (lines 199, 207, 321, 327, 333, 834) and `PurchaseInvoice.jsx` (lines 203, 215, 346, 352, 358, 1040) show ungrouped numbers like `₹ 21830.00`, `₹ 47200.00`.
  - `Customers.jsx` (`customers-1440-light.png`) shows `₹ 78000.00`, `₹ 1000000.00`, `₹ 200000.00` while `Inventory.jsx` formats `₹ 1,450.00`.
  - `Vendors.jsx`, `CashBook.jsx`, `BankBook.jsx`, `DayBook.jsx`, `PaymentVoucher.jsx`, `ReceiptVoucher.jsx`, `ContraVoucher.jsx`, `JournalVoucher.jsx`, `SalesReturn.jsx`, `PurchaseReturn.jsx`, `SalesReport.jsx`, `PurchaseReport.jsx`, `ProfitReport.jsx`, `StockReport.jsx`, `OutstandingReport.jsx` all mix raw `.toFixed(2)` with Indian comma formatting.
- **Correction:** Create `client/src/utils/formatters.js` (`formatINR`, `pluralize`, `formatEnumLabel`) and apply Indian comma grouping uniformly across all UI totals, cards, tables, and live invoice summaries (leaving tax/GST calculation logic untouched).

### F3. Asymmetric Orphan Slots in Multi-Card Grids (`reports-dashboard`, `pricing`)
- **Severity:** High (Layout Balance)
- **Evidence (Verified in `reports-dashboard-1440-light.png`, `pricing-1440-light.png`, `dashboard-1440-light.png`):**
  - `ReportsDashboard.jsx`: 5 KPI cards in a `lg:grid-cols-3` grid create a 2-card bottom row with an empty right gap.
  - `PricingPlans.jsx`: 5 SaaS tier cards in a 3-column grid leave an orphan blank slot next to `Professional Yearly`.
  - `Dashboard.jsx` (`TODAY'S LEDGER PULSE & MASTER RECORDS`): 6-item inner grid causes `"TODAY PURCHASE"` and `"TODAY INVOICES"` labels to wrap onto 2 lines while adjacent labels stay single-line, shifting vertical figure baselines.
- **Correction:**
  - `ReportsDashboard.jsx`: Restructure into a balanced 2 primary financial cards (`Total Sales`, `Total Purchases`) + 3 operational count cards row (or 5-column responsive bar at `xl:grid-cols-5`).
  - `PricingPlans.jsx`: Split monthly (`Free Trial`, `Basic Monthly`, `Professional Monthly` — `md:grid-cols-3`) and annual (`Basic Yearly`, `Professional Yearly` — `md:grid-cols-2`) tiers into clearly titled sections with zero empty orphan holes.
  - `Dashboard.jsx`: Compact single-line KPI sub-labels (`whitespace-nowrap` / concise labels) so all 6 pulse figures share an exact horizontal baseline.

### F4. AI-Generated UI Clichés: Middle Dots (`·`), Text Arrows (`→`), and Enum Underscores (`frontend-design`, `interface-design`)
- **Severity:** Medium (Visual Taste & Identity)
- **Evidence:**
  - Text-appended HTML/Unicode arrows (`&rarr;` / `→`): `Dashboard.jsx:339/381/415/446`, `ReportsDashboard.jsx:225`, `App.jsx:128`.
  - Middle-dot (`·`) concatenations everywhere: `Dashboard.jsx:122`, `Leads.jsx:294`, `LeadDetailDrawer.jsx:237/530`, `AIPipelineInsightsCard.jsx:323/325/329`, `SalesInvoice.jsx:147/351`, `PurchaseInvoice.jsx:156/376`, `ComplianceDashboard.jsx:518/534/808/878`, `RazorpayCheckoutTest.jsx:165`, `PrintSelectorCard.jsx:46`, `A4InvoiceTemplate.jsx:331`, `A4VoucherTemplate.jsx:315`.
  - Raw database enum string rendered verbatim in CRM drawer header (`leads-drawer-1440-light.png`: `Stage: PROPOSAL_SENT`).
  - Distinct boxed `--sidebar` tint (`#EFECE4`) against `#F5F3EE` canvas creates an unnecessary two-tone seam instead of Linea/Atelier unified ground.
- **Correction:** Align `--sidebar` closer/unified with canvas ground + crisp border divider; replace `&rarr;` with styled `ArrowUpRight` / `ChevronRight` Lucide icons; replace middle-dot chains with clean structured inline spacing/dividers; format `PROPOSAL_SENT` cleanly as `Proposal Sent`.

### F5. Accessibility, Focus Management & Keyboard Semantics (`web-design-guidelines`)
- **Severity:** High (Enterprise Operability & WCAG 2.1)
- **Evidence:**
  - **Missing Skip Link:** `App.jsx` lacks `<a href="#main-content">Skip to main content</a>` and `id="main-content"`.
  - **Bare `focus:outline-none` without `focus-visible`:** Found across `Navbar.jsx`, `Sidebar.jsx`, `Autocomplete.jsx`, `Login.jsx`, `LeadDetailDrawer.jsx`, `ComplianceDashboard.jsx`, `CompanySettings.jsx`, `RoleManagement.jsx`, `PrintSelectorCard.jsx`, and readonly fields — AND standard inputs show rings on mouse click instead of `:focus-visible`.
  - **Clickable `<tr>` in `Leads.jsx:284`:** Clicking row opens drawer, but row itself has no keyboard focus/Enter/Space handler; relies solely on small trailing `Details >` button.
  - **Typography & Microcopy Polish:** Over 25 occurrences of ASCII `...` instead of typographic `…`; `ValidationMessage.jsx` uses `role="status"` without `aria-live="polite"`; missing `<meta name="theme-color">` for light/dark browser chrome; dark-mode BrandLogo (`login-1440-dark.png`) border/contrast too faint (`bg-card/60` merges into dark background).
- **Correction:** Add skip link, `theme-color` meta tag, global `:focus-visible` utility tokens, typographic `…`, `aria-live="polite"` on `ValidationMessage`, keyboard-friendly lead trigger, and dark-mode contrast backing on `BrandLogo`.

### F6. Mobile-Native Ergonomics & Animation Hygiene (`mobile-native`, `animate`, `review-animations`, `break-ui`)
- **Severity:** Medium–High
- **Evidence:**
  - **Zoom-Prone Inputs on Mobile:** `client/src/index.css` sets `text-sm`/`text-xs` (`14px`/`12px`) on `<input>`/`<select>`, triggering viewport auto-zoom on mobile Safari/Chrome under coarse pointer (`@media (pointer: coarse)` should enforce `font-size: 16px`).
  - **Viewport Height & Overscroll:** `App.jsx` & `Login.jsx` use `min-h-screen` instead of `min-h-dvh`; drawers/modals (`Sidebar`, `LeadDetailDrawer`, `CommonModal`, `ConfirmDialog`) lack `overscroll-behavior: contain` and `touch-action: manipulation`.
  - **Banned `transition-all`:** `LeadDetailDrawer.jsx:355` (`transition-all duration-300`) and `App.css:275` (`transition: all`) animate unintended CSS properties (`review-animations` automatic block).
  - **`prefers-reduced-motion` Over-Suppression:** `index.css:194-203` forces `0.01ms !important` on ALL transitions instead of disabling transforms while preserving gentle opacity feedback.
  - **Clipped Placeholder & Table Wrapping (`break-ui`):**
    - `Inventory.jsx:304`: `GST Slab (%)` placeholder `"0, 5, 12, 18, 28"` clips visually to `"0, 5, 12, 18, 2"` in `inventory-1440-light.png`.
    - `sales-invoice-390-light.png`: `GY-0017` invoice numbers wrap mid-hyphen (`GY-\n0017`) at `390px` (needs `whitespace-nowrap`).
    - **Pluralization bugs:** `"1 invoices"`, `"1 bills"`, `"1 vouchers"`, `"1 customers"`, `"1 vendors"`, `"1 archives"`, `"1 statements"`, `"1 entries"`, `"1 products"`.

---

## 3. Screen-by-Screen Action Plan

1. **Global Shell (`index.html`, `index.css`, `App.jsx`, `Sidebar.jsx`, `Navbar.jsx`, `BrandLogo.jsx`)**: Tokens, typography optical scale, inset `--input-bg`, canvas sidebar ground, skip link, mobile-native coarse-pointer `16px` rule, dark-mode logo legibility badge, typo `…`, `focus-visible` everywhere.
2. **Common Primitives (`CommonCard`, `CommonPageHeader`, `CommonButton`, `CommonModal`, `ConfirmDialog`, `ValidationMessage`, `Pagination`, `Autocomplete`, `EmptyState`, `Skeleton`)**: Inset control parity, modal backdrop fade + `overscroll-contain`, `aria-live`, unified ellipsis `…`, `touch-action: manipulation`.
3. **Dashboard & Executive AI (`Dashboard.jsx`, `AIPipelineInsightsCard.jsx`)**: Clean header meta without `·`, align 6-column Ledger Pulse labels on single baselines, replace `→` with crisp icons, refine hierarchy between Hero Net/Revenue totals and secondary operational feeds.
4. **CRM & Leads (`Leads.jsx`, `LeadDetailDrawer.jsx`)**: Accessible keyboard row opening, readable enum labels (`Proposal Sent`), remove `transition-all` on risk bar, remove `·` joins, add `overscroll-contain` on drawer.
5. **Sales, Purchase & OCR (`SalesInvoice.jsx`, `PurchaseInvoice.jsx`, `SalesReturn.jsx`, `PurchaseReturn.jsx`, `InvoiceOcrUpload.jsx`, print views)**: Format all totals & rates with `formatINR`, fix `whitespace-nowrap` on invoice numbers on `390px`, unify inset inputs, fix pluralization cleanly, preserve all `F2`/`Alt+N`/`Alt+C`/`Ctrl+P` shortcuts & HID scanner with **zero** entrance animation latency.
6. **Masters (`Customers.jsx`, `Vendors.jsx`, `Inventory.jsx`)**: Fix clipped `GST Slab (%)` placeholder, format opening/credit balances via `formatINR`, fix `"1 customer"` / `"1 vendor"` / `"1 product"` grammar, unify `.erp-input`/`.erp-label`.
7. **Accounts & Books (`PaymentVoucher.jsx`, `ReceiptVoucher.jsx`, `ContraVoucher.jsx`, `JournalVoucher.jsx`, `CashBook.jsx`, `BankBook.jsx`, `DayBook.jsx`, `CustomerLedger.jsx`, `VendorLedger.jsx`)**: Standardize Dr/Cr numeric alignment + `formatINR`, fix pluralization, unify controls via `.erp-input`.
8. **Reports & Compliance (`ReportsDashboard.jsx`, `SalesReport.jsx`, `PurchaseReport.jsx`, `StockReport.jsx`, `ProfitReport.jsx`, `OutstandingReport.jsx`, `ComplianceDashboard.jsx`)**: Fix balanced KPI layout (`ReportsDashboard`), `formatINR` everywhere, clean button labels (`Open` + Chevron icon instead of `→`), ellipsis `…`.
9. **Settings & Auth (`Login.jsx`, `CompanySettings.jsx`, `UserManagement.jsx`, `RoleManagement.jsx`, `ProfileSettings.jsx`, `BackupRestore.jsx`, `PricingPlans.jsx`, `RazorpayCheckoutTest.jsx`)**: Group `PricingPlans` cleanly into Monthly vs Yearly grids with zero empty slot, fix `Login` dark-mode logo & `focus-visible` rings, fix grammar & ellipses.
