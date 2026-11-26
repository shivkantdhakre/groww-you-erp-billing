import { useState, useEffect } from "react";
import darkLogoIcon from "../../assets/groww_you_erp_logo_icon.png";
import lightLogoIcon from "../../assets/groww_you_erp_logo_light.png";

/**
 * Brand identity mark and wordmark adapting between warm limestone light mode
 * and deep obsidian dark mode.
 */
export default function BrandLogo({ size = 40, showText = true, className = "", ...props }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const currentLogo = isDark ? darkLogoIcon : lightLogoIcon;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} {...props}>
      <img
        key={isDark ? "dark-logo" : "light-logo"}
        src={currentLogo}
        alt="Groww You ERP"
        style={{ width: size, height: size }}
        className="shrink-0 object-contain rounded-lg border border-border/70 bg-card/60 transition-colors duration-200"
      />

      {showText && (
        <div className="flex flex-col justify-center leading-none min-w-0">
          <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
            Groww <span className="text-primary-text">You</span>
          </span>
          <span className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase mt-1 truncate">
            Enterprise ERP
          </span>
        </div>
      )}
    </div>
  );
}
