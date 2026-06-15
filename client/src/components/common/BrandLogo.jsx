
export default function BrandLogo({ size = 36, showText = true, className = '', ...props }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} {...props}>
      {/* SVG Icon Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-[#1B3A5C] dark:text-foreground transition-colors duration-300"
        aria-hidden="true"
      >
        {/* Stylized Figure (Head in orange, body in currentColor) */}
        <circle cx="28" cy="22" r="10" fill="#E8872A" />
        <path
          d="M 28 38 C 22 38 14 31 8 18 C 7 15 5 10 4 7 C 6 17 12 28 22 33 L 22 80 L 34 80 L 34 33 C 44 28 50 17 52 7 C 51 10 49 15 48 18 C 42 31 34 38 28 38 Z"
          fill="currentColor"
        />

        {/* Curving Arrow swooping up-right */}
        <path
          d="M 28 70 C 45 68 65 52 82 28 L 76 25 L 90 20 L 92 34 L 86 31 C 71 52 52 68 28 74 Z"
          fill="currentColor"
        />

        {/* 4 rising vertical bars under the arrow */}
        <rect x="39" y="68" width="6" height="12" rx="1" fill="currentColor" />
        <rect x="50" y="56" width="6" height="24" rx="1" fill="currentColor" />
        <rect x="61" y="42" width="6" height="38" rx="1" fill="currentColor" />
        <rect x="72" y="26" width="6" height="54" rx="1" fill="currentColor" />
      </svg>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none text-[#1B3A5C] dark:text-foreground transition-colors duration-300">
          <span className="text-[17px] font-black tracking-wider font-sans">GROWW</span>
          <span className="text-[15px] font-bold tracking-[0.125em] font-sans opacity-90">YOU ERP</span>
        </div>
      )}
    </div>
  );
}
