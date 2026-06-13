# Groww You ERP - Enterprise Billing & Storefront Management System

A production-ready, multi-tenant, and branch-isolated ERP and Billing solution engineered for high-performance retail storefronts. It features hardware-accelerated barcode billing, a virtualized high-density billing matrix, cryptographic key versioning, server-side Puppeteer PDF generation, and a fully tokenized HSL dark mode design system.

---

## 📁 Repository Structure

```
├── client/                     # Frontend React SPA
│   ├── src/
│   │   ├── components/         # Reusable layouts, Common Modal, Skeleton, BrandLogo, Sidebar, Navbar
│   │   ├── hooks/              # Custom hooks: useBarcodeScanner, useDebounce
│   │   ├── pages/              # Features: billing (Sales/Purchase Invoice), returns, masters, settings
│   │   ├── store/              # Zustand state store with query caching
│   │   └── App.jsx             # Main routing and global state initializer
│   ├── index.html              # Main HTML entry with SEO-optimized headers
│   └── vite.config.js          # Vite build config
│
└── server/                     # Backend Node.js Express API
    ├── controllers/            # mastersController, transactionsController, vouchersController
    ├── prisma/                 # Prisma Schema file with PostgreSQL schema and indexes
    ├── routes/                 # Express API routes
    ├── scripts/                # Utility CLI tools (e.g. database key rotation)
    └── utils/                  # pdfService, crypto, pagination, RLS middlewares
```

---

## 🚀 Key Features & Technical Architecture

### 1. Multi-Branch Isolation & Row-Level Security (RLS)
*   **Tenant Isolation**: Standardizes data separation at the `Branch` level, tied back to a primary `Company`.
*   **1-Query Write Protections**: RLS Prisma middle-tier protector verifies tenant ownership inline. Rather than running a pre-flight `findFirst` query followed by a write, authorization headers (like `x-branch-id`) are injected directly into the `where` clause of PostgreSQL `update`/`delete` statements, cutting API write latency in half.
*   **Database Indexes**: Custom compound indexes are configured on high-traffic tables (e.g. `[companyId, invoiceDate]` on `Invoice`, `[companyId, createdAt]` on `FinancialTransaction`, `[companyId, returnDate]` on `Return`) to accelerate analytics, financial books, and ledger lookups.

### 2. Modern HSL Theme System & Complete Dark Mode
*   **Theme Token Binding**: Hardcoded utility colors (`bg-white`, `text-gray-800`, `border-gray-200`) have been refactored to Tailwind utility classes mapped to CSS HSL variables (`bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`, `bg-secondary`).
*   **100% Contrast & Legibility**: Standardizes styling across high-density billing forms, search parameters, modal alerts (`CommonModal.jsx`), skeleton loading state pulses (`Skeleton.jsx`), and master records (Customers, Vendors, Inventory).
*   **Autocomplete Templates**: Dropdown custom item renderers avoid hardcoded color classes, ensuring search predictions are perfectly legible in dark mode.
*   **Unified Brand Identity**: `<BrandLogo />` is styled as a responsive inline SVG, automatically adapting to light and dark modes while maintaining orange accent highlights.

### 3. Server-Side Puppeteer PDF & Thermal Print Engine
*   **A4 & Thermal Receipt Routing**: Supports printing professional A4 invoices and 80mm thermal roll receipts. Handles dynamic receipt height computation.
*   **Concurrency Controls**: Puppeteer page rendering is pooled using a semaphore lock (concurrency limit = 3) to prevent server RAM exhaustion on high-volume print queues.
*   **Resource Lifecycles**: A strict 30-second timeout race condition guard and comprehensive `finally` disposal logic ensure Puppeteer instances and pages are closed cleanly.
*   **Public Cloud S3 Cache**: Uploads generated PDFs to Supabase Storage using S3-compliant endpoints, caching download URLs in the database to prevent duplicate render calls.

### 4. Hardware-Accelerated Barcode Billing
*   **useBarcodeScanner Key Interceptor**: Listens to high-speed sequential keystrokes emitted by USB HID barcode scanners.
*   **Focus Bypassing**: Rejects keystroke interception if the browser focus lies inside input text fields, select tags, or textareas, preventing user keyboard entry collisions.
*   **State Race Resolution**: Employs atomic functional state updates to prevent item overwrites or double-counting during rapid successive barcode scans.

### 5. Cryptographic Key Versioning & Zero-Downtime Rotation
*   **Header Versioning**: All encrypted columns (e.g., credentials, tokens) are prefixed with their key identifier version (`v1:...`, `v2:...`).
*   **Legacy Fallback**: Automatic decryption parser falls back to legacy unversioned keys if no version prefix is present.
*   **Batch Rotation Script**: CLI script in `server/scripts/rotate-keys.js` re-encrypts historical records using the active key in batches of 500 records to prevent memory pressure and database row locks.

### 6. TanStack Virtualization & Hotkey Lifecycle Safeguards
*   **TanStack Virtual Table Scroller**: Integrates `@tanstack/react-virtual` in billing sheets to render only the visible viewport row elements, supporting lists of 10,000+ items at 60 FPS.
*   **Global Hotkey Unmounting**: Keyboard listeners (F2 to save, Ctrl+P to print, Alt+N to add row) bind and clean up correctly via React's `useEffect` hooks. This prevents stray event captures when navigating to the dashboard or settings.
*   **Closure Protection**: Keydown callbacks reference stable functions and state refs, eliminating stale closure values.

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Zustand, TanStack Virtual, Lucide Icons.
*   **Backend**: Node.js, Express, Prisma ORM, express-rate-limit.
*   **Database**: PostgreSQL.
*   **Rendering**: Puppeteer (local) / Puppeteer-Core & Sparticuz Chromium (production).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL

### Backend Configuration
1. Navigate to the `/server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `/server`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>?schema=public"
   JWT_SECRET="your_jwt_signature_key"
   
   # Encryption Keys (Versioned Rotation)
   ENCRYPTION_KEY="legacy_encryption_key_here_32_chars"
   ENCRYPTION_KEY_V1="encryption_key_version_1_32_characters"
   ENCRYPTION_KEY_V2="encryption_key_version_2_32_characters"
   ACTIVE_KEY_VERSION="v2"

   # Supabase S3 Storage Credentials
   SUPABASE_S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3"
   SUPABASE_S3_REGION="ap-southeast-1"
   SUPABASE_S3_ACCESS_KEY="your_access_key"
   SUPABASE_S3_SECRET_KEY="your_secret_key"
   SUPABASE_S3_BUCKET="invoices"
   ```
4. Generate the Prisma client and apply database migrations/indexes:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Run the Express dev server:
   ```bash
   npm run dev
   ```

### Frontend Configuration
1. Navigate to the `/client` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `/client`:
   ```env
   VITE_API_URL="http://localhost:5000/api"
   ```
4. Start the Vite server:
   ```bash
   npm run dev
   ```

---

## 🧪 Verification & Development CLI Tools

### Key Rotation CLI
To rotate database encrypted values from legacy keys to the latest `v2` version:
```bash
cd server
node scripts/rotate-keys.js
```

### Performance & Routing Verification
To run backend functional isolation, PDF generation, and multi-tenant routing verification:
```bash
cd server
node scratch/test-pdf-scanner-branch.js
```

### Build & Code Style Audit
Run client audits to verify there are zero lint issues or bundle compilation errors:
```bash
cd client
npm run lint
npm run build
```
