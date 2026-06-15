/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B3A5C", // Deep Navy brand color
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F7941D", // Orange accent brand color
          foreground: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
