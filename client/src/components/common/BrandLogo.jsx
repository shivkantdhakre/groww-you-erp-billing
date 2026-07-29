import React, { useState, useEffect } from "react";
import darkLogoIcon from "../../assets/groww_you_erp_logo_icon.png";
import lightLogoIcon from "../../assets/groww_you_erp_logo_light.png";

export default function BrandLogo({ size = 48, showText = true, className = '', ...props }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    updateTheme();

    // Listen for dark class changes on <html> element
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const currentLogo = isDark ? darkLogoIcon : lightLogoIcon;

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`} {...props}>
      {/* Dynamic Brand Logo Icon reacting immediately to light/dark mode changes */}
      <img
        key={isDark ? "dark-logo" : "light-logo"}
        src={currentLogo}
        alt="Groww You ERP Logo"
        style={{ width: size, height: size }}
        className="shrink-0 object-contain rounded-lg drop-shadow-sm transition-all duration-300 hover:scale-105"
      />

      {/* Typography */}
      {showText && (
        <div className="flex flex-col justify-center leading-none text-[#1B3A5C] dark:text-foreground transition-colors duration-300">
          <span className="text-[20px] font-black tracking-wider font-sans">
            GROWW <span className="text-[#F7941D]">YOU</span>
          </span>
          <span className="text-[12px] font-extrabold tracking-[0.22em] font-sans opacity-90 text-muted-foreground mt-1">
            ENTERPRISE ERP
          </span>
        </div>
      )}
    </div>
  );
}
