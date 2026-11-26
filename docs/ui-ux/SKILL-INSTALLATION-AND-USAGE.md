# Skill Installation, Compatibility & Application Log — Groww You ERP

> **Branch:** `uiux/skills-driven-refinement`  
> **Scope:** Frontend UI/UX refinement (`client/` and `.interface-design/system.md` only; zero backend mutations)  
> **Target Environment:** Google Antigravity (`agy`) with workspace skill root `.agents/skills/`

---

## 1. Installed Project-Level Skills Inventory

All active skills were installed directly into the project-local Antigravity root `.agents/skills/` (verified via `npx --yes skills list` showing `Agents: Antigravity`) and verified readable before any design edits began.

| Skill | Source Repository / Package | Local Path (`SKILL.md` + Support Files) | Status | Role in This Refinement |
| :--- | :--- | :--- | :--- | :--- |
| **frontend-design** | `anthropics/skills` | `.agents/skills/frontend-design/SKILL.md` | Installed & Read | Anti-AI-slop rules, optical hierarchy, typography clarity, eliminating middle-dot/arrow/uppercase clichés |
| **webapp-testing** | `anthropics/skills` | `.agents/skills/webapp-testing/SKILL.md` (+ `scripts/with_server.py`) | Installed & Executed | Orchestrated Express (`5000`) + Vite (`5173`) server lifecycle for baseline & after Chrome screenshot sweeps |
| **ui-ux-pro-max** | `nextlevelbuilder/ui-ux-pro-max-skill` (`uipro init --ai antigravity`) | `.agents/skills/ui-ux-pro-max/SKILL.md` (+ Python CSV search engine & bundled helpers `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`) | Installed & Executed | Quantitative design system & typography/color/chart/UX rule lookups (`--design-system --density 8`) |
| **interface-design** | `dammyjay93/interface-design` | `.agents/skills/interface-design/SKILL.md` | Installed & Read | Craft & Atelier Ledger continuation: inset control surfaces, canvas-matched sidebar ground, border-first depth |
| **web-design-guidelines** | `vercel-labs/agent-skills` | `.agents/skills/web-design-guidelines/SKILL.md` (+ `references/command.md`) | Installed & Read | Comprehensive keyboard `focus-visible`, ARIA live regions, skip links, typographic ellipsis, native select theme-color, form labeling & button semantics audit |
| **animate** | `emilkowalski/skills` | `.agents/skills/animate/SKILL.md` (+ `RECIPES.md`) | Installed & Read | Purposeful modal/drawer/popover transitions, custom `--ease-out` curves, zero motion on high-frequency billing shortcuts |
| **break-ui** | `emilkowalski/skills` | `.agents/skills/break-ui/SKILL.md` (+ `CATALOG.md`) | Installed & Read | Stress-testing long GSTINs/company names, singular vs plural count grammar, missing metadata, extreme INR totals, narrow/wide grids |
| **mobile-native** | `emilkowalski/skills` | `.agents/skills/mobile-native/SKILL.md` | Installed & Read | Coarse-pointer `16px` input zoom guard, `min-h-dvh`, `overscroll-behavior: contain`, `@media (hover: hover)` hover gating, `touch-action: manipulation` |
| **review-animations** | `emilkowalski/skills` | `.agents/skills/review-animations/SKILL.md` (+ `STANDARDS.md`) | Installed & Read | Replacing `transition-all` (`LeadDetailDrawer.jsx`, `App.css`), keeping `prefers-reduced-motion` opacity transitions gentle |

---

## 2. Evaluated & Excluded Skills (Transparency Record)

To avoid redundant rule engines or false claims of execution outside Antigravity's native skill runtime:

1. **`pbakaus/impeccable` — Inspected & Excluded**:
   - Checked `.claude-plugin/marketplace.json` and `plugin/skills/impeccable/SKILL.md`. The repository defines 24 Claude Code slash-command skills backed by `${CLAUDE_SKILL_DIR}/scripts/impeccable` CLI hooks built around Claude Code conventions rather than standalone Antigravity project skills. Excluded so zero unexecuted external tooling is claimed.
2. **`taste-skill` — Evaluated & Excluded**:
   - Excluded to prevent conflicting design-token engines against `ui-ux-pro-max` + `interface-design`.
3. **`shadcn/ui` — Evaluated & Excluded**:
   - `client/package.json` uses React 19, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, React Router, TanStack Virtual, and Lucide React without Radix UI, `class-variance-authority`, or shadcn primitives. Excluded cleanly to preserve the project's native architecture.

---

## 3. Concrete Skill Applications (Initial Discovery -> Implementation Plan)

### A. UI UX Pro Max Engine Queries (`search.py`)
Executed directly via Python against `.agents/skills/ui-ux-pro-max/scripts/search.py`:
- `search.py "indian gst accounting erp invoice ledger dashboard" --design-system --density 8 -p "Groww You ERP"` -> Confirmed **Data-Dense Fintech/ERP Dashboard** pattern with `#F8FAFC` / warm neutral light ground (`#F5F3EE` preserved from Atelier Ledger), `#2D5A47` Forest Trust accent, `IBM Plex Sans + IBM Plex Mono`, strict `tabular-nums`, and restrained contrast (`>= 4.5:1` AA).
- Domain lookups across `product`, `color`, `typography`, `style`, `chart`, `ux`, and stack lookups for `react` and `html-tailwind`:
  - Enforced **maximum 12px horizontal/vertical card clutter reduction** via single shared typography/input surface helpers instead of 21 duplicated `INPUT_CLASS` / `LABEL_CLASS` constants.
  - Enforced **Direct Value KPI hierarchy** (avoiding chart ornamentation on transactional dashboards unless interactive and purposeful) and standardized INR formatting (`en-IN`, two decimals, monospace right alignment).

### B. Interface Design (`dammyjay93/interface-design`)
- **Canvas-Unified Navigation (`--sidebar` aligned with `--background`)**: Updated sidebar philosophy so the navigation rail sits on the same warm neutral canvas ground with a razor-thin border divider instead of an extra flat beige/grey surface box.
- **Inset Control Elevation (`--input-bg`)**: In the existing codebase, form inputs across 21+ screens used `bg-card` directly on `bg-card` containers — zero tonal step separating editable inputs from static containers. Introducing a subtle inset `--input-bg` token makes editable fields immediately legible without thick borders.
- **Quiet Secondary Elevation**: Stripped uppercase-all-caps eyebrow overload (`AI INSIGHTS`, repetitive boxed KPI shells) where clean hierarchy and subtle borders accomplish clearer visual scan order.

### C. Frontend Design (`anthropics/skills`)
- **Eliminating AI-Generated Patterns Identified in Audit**:
  - Removed middle-dot (`·`) subtitle concatenations across `Dashboard.jsx`, `AIPipelineInsightsCard.jsx`, `Leads.jsx`, `LeadDetailDrawer.jsx`, `ComplianceDashboard.jsx`, `SalesInvoice.jsx`, `PurchaseInvoice.jsx`, `RazorpayCheckoutTest.jsx`, `PrintSelectorCard.jsx`.
  - Removed text-appended arrow tells (`Day Book →`, `Stock Report →`, `Ledgers →`, `Update Payment Details →`) in favor of semantic icons with clean label spacing.
  - Replaced uniform KPI card monotony on `Dashboard.jsx` and `ReportsDashboard.jsx` with purposeful visual hierarchy distinguishing primary net totals from secondary action links.

### D. Vercel Web Design Guidelines (`web-design-guidelines`)
- Systematic audit captured every occurrence of:
  - Bare `focus:outline-none` without `focus-visible:ring-2` (`Navbar`, `Sidebar`, `Autocomplete`, `Login`, `PrintSelectorCard`, `LeadDetailDrawer`, and all 21+ form modules).
  - Missing `<a href="#main-content">Skip to main content</a>` and `<meta name="theme-color">`.
  - ASCII ellipsis `...` in place of typographic `…`.
  - Non-semantic clickable `<tr onClick>` in `Leads.jsx` and missing explicit `aria-hidden="true"` on decorative icons.

### E. Emil Kowalski Suite (`animate`, `break-ui`, `mobile-native`, `review-animations`)
- **`review-animations`**: Targeted removal of `transition-all duration-300` in `LeadDetailDrawer.jsx:355` and `transition: all` in `App.css:275`; repaired `prefers-reduced-motion` in `index.css` so motion stops while smooth opacity remains intact.
- **`animate`**: Zero transition delay on `F2` Save, `Alt+N` Row insert, `Alt+C` Customer focus, or virtualized row edits; crisp `--ease-out` drawer/modal/popover entrance transitions only.
- **`mobile-native`**: Coarse-pointer `16px` input font-size rule preventing iOS/Android auto-zoom, `min-h-dvh`, `overscroll-behavior: contain` on slide-over drawers & modals, `touch-action: manipulation`, and `@media (hover: hover) and (pointer: fine)` hover isolation.
- **`break-ui`**: Targeted fixes for ungrouped INR currency (`.toFixed(2)` -> `formatINR`), singular/plural grammar (`1 invoice` vs `2 invoices`, `1 bill` vs `2 bills`, `1 voucher` vs `2 vouchers`, `1 customer` vs `2 customers`), long GSTIN/company name wrapping/truncation (`min-w-0`), and empty-state safety.

---

## 4. Concrete Post-Implementation Skill Evidence (Verified Code, DOM & Screenshots)

| Skill | Real Issue Identified Before | Implemented Refinement & Verification Evidence |
| :--- | :--- | :--- |
| **frontend-design** | Middle-dot strings (`·`), literal `&rarr;` (`Day Book →`, `Open →`), raw database enum badge (`PROPOSAL_SENT`), identical card wrappers | Removed `&rarr;` links (`App.jsx`, `Dashboard.jsx`, `ReportsDashboard.jsx`) and replaced all middle-dot concatenations (`AIPipelineInsightsCard`, `Leads`, `LeadDetailDrawer`, `SalesInvoice`, `PurchaseInvoice`, `ComplianceDashboard`, `RazorpayCheckoutTest`, Print templates); formatted CRM stage via `formatStageLabel()` -> `"Proposal Sent"`. |
| **ui-ux-pro-max** | Unformatted `.toFixed(2)` INR currency (`₹ 21830.00`, `₹ 78000.00`), 5-card grid holes (`ReportsDashboard`, `PricingPlans`), inconsistent display metrics | Created `client/src/utils/formatters.js` (`formatINR`, `formatDashboardINR`, `formatCount`), enforced Indian comma grouping across Masters, Invoices, Vouchers, Books, and Reports; split `ReportsDashboard` (`2+3`) and `PricingPlans` (Monthly `3` + Yearly `2`) grids cleanly. |
| **interface-design** | Flat `bg-card` inputs on `bg-card` containers; 21+ duplicated local `INPUT_CLASS` constants; sidebar two-tone seam | Unified `--sidebar` with canvas `--background` via hairline `border-r`; introduced inset `--input-bg` (`#F5F2EA` light / `#121513` dark) and shared `.erp-input`, `.erp-readonly`, `.erp-label` primitives verified via computed RGB (`cardBg: rgb(253,253,251)` vs `inputBg: rgb(246,244,239)`). |
| **web-design-guidelines** | Bare `focus:outline-none` without `:focus-visible`; missing skip link & `theme-color`; ASCII `...` loading/placeholders; `<tr onClick>` lacking keyboard trigger; `role="status"` missing live attributes; favicon 404 | Added `<a href="#main-content">Skip to main content</a>`, dual `theme-color` meta tags + inline SVG favicon (eliminating 404 console error), global `.erp-focus-ring` / `:focus-visible`, `aria-live` on `ValidationMessage`, typographic ellipsis `…`, accessible company `<button>` inside `Leads.jsx`, `aria-current="page"` in `Pagination.jsx`, explicit `<BrandLogo />` image dimensions without remount flash. |
| **animate** & **review-animations** | `LeadDetailDrawer.jsx:355` used `transition-all duration-300`; `App.css` defined `.transition-all-300` (`transition: all`); `prefers-reduced-motion` zeroed opacity transitions; popover/modals lacked calm easing curves | Replaced banned `transition-all` with explicit `transition-[width] duration-200` (verified `getComputedStyle(...).transitionProperty === "width"`); added `--ease-out` and `--ease-drawer` CSS variables + gentle `120ms` opacity fade in `prefers-reduced-motion`; kept `Alt+N`/`Alt+C`/`F2` instant with zero delay. |
| **mobile-native** | `<input>` / `<select>` font sizes `< 16px` under touch; `min-h-screen` viewport cutoff; sticky hover states on touch; missing `overscroll-behavior: contain` on drawers/modals | Added `@media screen and (pointer: coarse)` 16px input floor, `min-h-dvh`, `overscroll-contain` on `Sidebar`, `LeadDetailDrawer`, `CommonModal`, `ConfirmDialog`, and `Autocomplete`; gated `.elevated-table-row:hover` inside `@media (hover: hover) and (pointer: fine)`; added `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent`. |
| **break-ui** | Clipped `GST Slab (%)` placeholder (`0, 5, 12, 18, 2`); `GY-0017` wrapping mid-token at `390px`; Dashboard Ledger Pulse `"TODAY PURCHASE"` label wrapping misaligning grid row; `"1 invoices"` / `"1 bills"` grammar bugs | Shortened `GST Slab (%)` placeholder (`e.g. 18 (0–28)`), enforced `whitespace-nowrap` on invoice/bill numbers + KPI figures, replaced Ledger Pulse mobile divider leak with `gap-px bg-border` + single-line labels, implemented `formatCount()`, and passed live `break-ui` stress injection (`1440px` & `390px`, `overflowPx: 0`). |
| **webapp-testing** | Needed repeatable multi-viewport visual proof without server leaks | Executed `.agents/skills/webapp-testing/scripts/with_server.py` to capture 47 BEFORE screenshots (`docs/ui-ux/screenshots/before/`) and 48 AFTER screenshots (`docs/ui-ux/screenshots/after/`) + live shortcut, DOM, drawer, mobile menu, and A4 selector verification (`0` overflow issues, `0` pageErrors). |

