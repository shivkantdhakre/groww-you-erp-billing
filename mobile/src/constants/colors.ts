/**
 * Global color constants for standardizing colors across the app.
 * Kept in sync with tailwind.config.js
 */
export const colors = {
  primary: {
    DEFAULT: "#1B3A5C",
    foreground: "#FFFFFF",
  },
  secondary: {
    DEFAULT: "#F7941D",
    foreground: "#FFFFFF",
  },
  background: "#0A0F1D",
  surface: {
    DEFAULT: "#1A1F2E",
    light: "#141824",
  },
  text: {
    DEFAULT: "#FFFFFF",
    muted: "#9CA3AF", // gray-400
    disabled: "#6B7280", // gray-500
  },
  border: {
    DEFAULT: "#1F2937", // gray-800
    light: "#374151", // gray-700
  },
  status: {
    success: "#10B981", // emerald-500
    error: "#EF4444", // red-500
    warning: "#F59E0B", // amber-500
  }
};
