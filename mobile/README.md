# 🏗️ Groww You ERP - Mobile App

This is the official mobile application for the **Groww You ERP** system, built with React Native and Expo. It provides a robust, offline-capable POS and inventory management interface for field agents and executives.

---

## 🚀 Key Features

*   **Offline-First Billing (POS):** Create invoices even without an internet connection. The app queues invoices locally and automatically syncs them when the network is restored.
*   **Live Inventory & Barcode Scanning:** Browse the complete item master, view branch-specific stock levels, and use the device camera to quickly scan and locate items.
*   **Executive Dashboard:** View high-level metrics, revenue charts, and recent activity summaries.
*   **Enterprise Security:** Proactive device security utilizing `jail-monkey` to detect rooted or jailbroken devices, instantly blocking access to protect sensitive ERP data.
*   **Dual-Storage Engine:** High-performance local state persistence using `react-native-mmkv` with graceful fallbacks for Expo Go.

---

## 🛠️ Tech Stack

*   **Framework:** React Native (v0.85.3) & Expo SDK 56
*   **Navigation:** `expo-router` (File-based routing)
*   **State Management:** `zustand` (with MMKV/AsyncStorage persistence)
*   **Styling:** `nativewind` (Tailwind CSS for React Native)
*   **Networking:** `axios` (v1.18) with robust interceptors for timeout/401 handling
*   **Observability:** `@sentry/react-native`

---

## 📂 Project Structure

```text
src/
├── app/                   # Expo Router file-based navigation
│   ├── (auth)/            # Unauthenticated routes (Login, Onboarding)
│   ├── (app)/             # Authenticated tabs (Dashboard, Billing, etc.)
│   └── _layout.tsx        # Root layout, Auth guards, Security checks
├── components/            # Reusable UI (Button, Card, Toast, OfflineBanner)
├── constants/             # Semantic tokens (colors.ts, animations.ts)
├── store/                 # Zustand global state (useStore.ts)
├── utils/                 # Core services (api.ts, secureStoreWrapper, security.ts)
└── global.css             # NativeWind entrypoint
```

---

## 🚦 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The app expects an `EXPO_PUBLIC_API_URL` to point to the backend. You can set this locally in a `.env` file or rely on the EAS profiles defined in `eas.json`.

```env
# .env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Start the Development Server

```bash
npx expo start -c
```

This will start the Metro bundler. You can open the app using:
*   **Expo Go** on a physical device
*   **Android Emulator** (press `a`)
*   **iOS Simulator** (press `i`)

---

## 📦 Build & Deployment (EAS)

This project is configured to use Expo Application Services (EAS) for builds. The profiles are managed in `eas.json`.

**Create a Development Build (APK/Simulator):**
```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

**Create a Production Build:**
```bash
eas build --profile production --platform all
```

---

## ⚠️ Known Constraints

*   **Master Data Management:** Currently, creating or editing new Customers, Vendors, or Items must be done via the Web Dashboard. The mobile app strictly consumes this data for sales and inventory lookups.
*   **Testing:** Unit tests (Jest) are not currently configured for this package.

## 🤝 Community & Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Directory](https://reactnative.directory/)
- [NativeWind Documentation](https://www.nativewind.dev/)
