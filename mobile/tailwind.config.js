/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-bold': ['Inter_700Bold'],
        lexend: ['Lexend_700Bold'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      colors: {
        'brand-navy': {
          DEFAULT: "#1B3A5C",
          foreground: "#FFFFFF",
        },
        'action-orange': {
          DEFAULT: "#F7941D",
          foreground: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
