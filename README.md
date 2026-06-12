# Groww You ERP - Billing & Storefront Management System

A multi-tenant, branch-isolated ERP and Billing solution designed for retail storefronts, featuring hardware-accelerated barcode billing and server-side PDF generation.

---

## 📁 Repository Structure

- **`client/`**: React + Vite single page application (SPA) styled with Tailwind CSS, utilizing Zustand for client-side state caching.
- **`server/`**: Express API server built with Node.js and Prisma ORM, backed by a PostgreSQL database.

---

## 🚀 Key Features

### 1. Multi-Branch Data Routing (Sprint 6)
- **Strict Storefront Isolation**: The schema separates data at the `Branch` level (associated with a primary `Company`).
- **Phased Zero-Downtime Migration**: Database structure allows retrofitting existing tables without locking live customer transactions.
- **Context Filtering**: Users are assigned to specific branches. Admins can override context using the `x-branch-id` header to view multi-store ledgers.

### 2. Automated PDF Print Engine
- **Server-Side Generation**: Renders professional invoices off the client browser using headless Chrome.
- **Render RAM Optimizations**: Dynamically loads standard `puppeteer` in local development and `@sparticuz/chromium` + `puppeteer-core` in production to prevent Out-Of-Memory (OOM) failures.
- **A4 & Thermal Templates**: High-density layouts for standard A4 tax receipts and 80mm thermal roll receipts (with dynamic height computation).
- **Public Cloud Cache**: Uploads invoice PDFs to Supabase Storage (via S3 client compatibility) and caches URLs in the database.

### 3. Hardware-Accelerated Barcode Billing
- **Keyboard Interceptor**: Custom React hook `useBarcodeScanner` registers high-speed sequential keystrokes from USB HID barcode scanners.
- **Race Condition Prevention**: Employs atomic functional state updates (`setInvoiceItems(prev => ...)`) to prevent cart glitches during rapid sequential item scans (e.g. double-beeps).
- **Form Focus Bypassing**: Automatically ignores scanning interceptors when cursor focus resides within `INPUT`, `TEXTAREA`, or `SELECT` fields to avoid conflicts.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Local server or Neon cloud instance)

### Backend Configuration
1. Navigate to the `/server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `/server` with the following variables:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>?schema=public"
   JWT_SECRET="your_jwt_signature_key"
   PORT=5000
   
   # Supabase S3 Storage Credentials
   SUPABASE_S3_ENDPOINT="https://<project-ref>.supabase.co/storage/v1/s3"
   SUPABASE_S3_REGION="ap-southeast-1"
   SUPABASE_S3_ACCESS_KEY="your_access_key"
   SUPABASE_S3_SECRET_KEY="your_secret_key"
   SUPABASE_S3_BUCKET="invoices"
   ```
4. Push the schema to the database and generate client files:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Run the dev server:
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
4. Start the frontend Vite server:
   ```bash
   npm run dev
   ```

---

## 🧪 Running Verification Tests

Run the automated test runner in the server directory to verify DB schema isolation and the PDF generation pipeline:
```bash
cd server
node scratch/test-pdf-scanner-branch.js
```
