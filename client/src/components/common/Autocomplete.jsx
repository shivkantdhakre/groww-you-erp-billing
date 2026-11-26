import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Accessible portal-backed autocomplete combobox supporting keyboard navigation
 * and pre-populated display text (used by invoice & ledger selectors + OCR).
 */
function Autocomplete({
  options = [],
  labelKey = "name",
  valueKey = "id",
  placeholder = "Search\u2026",
  onSelect,
  selectedId = null,
  value = "",
  onClear = null,
  searchFields = ["name"],
  customRender = null,
  inputRef = null,
  className = "",
  inputClassName = "",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find((opt) => opt[valueKey] === selectedId);

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(240, Math.max(120, openUpward ? spaceAbove : spaceBelow));

    setDropdownPos({
      top: openUpward ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)),
      width: Math.max(rect.width, 200),
      maxHeight,
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedOption) {
        setSearchTerm(selectedOption[labelKey]);
      } else if (value) {
        setSearchTerm(value);
      } else {
        setSearchTerm("");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedOption, labelKey, value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveIndex(-1);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        listRef.current &&
        !listRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        if (selectedOption) {
          setSearchTerm(selectedOption[labelKey]);
        } else if (!value) {
          setSearchTerm("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedOption, labelKey, value]);

  const filteredOptions = options.filter((opt) => {
    const term = String(searchTerm || "").toLowerCase();
    return searchFields.some((field) => {
      const val = opt[field];
      return val && String(val).toLowerCase().includes(term);
    });
  });

  const handleSelect = (option) => {
    onSelect(option);
    setSearchTerm(option[labelKey]);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (e.target.value === "" && onClear) {
      onClear();
    }
  };

  const scrollActiveIntoView = (index) => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[index];
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
          scrollActiveIntoView(next);
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : prev;
          scrollActiveIntoView(next);
          return next;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        if (selectedOption) {
          setSearchTerm(selectedOption[labelKey]);
        } else if (!value) {
          setSearchTerm("");
        }
        break;
      default:
        break;
    }
  };

  const dropdownList = isOpen ? (
    <ul
      ref={listRef}
      role="listbox"
      style={{
        position: "fixed",
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        width: `${dropdownPos.width}px`,
        maxHeight: `${dropdownPos.maxHeight}px`,
      }}
      className="z-[9999] bg-popover border border-border rounded-lg popover-shadow overflow-y-auto overscroll-contain divide-y divide-border/60 text-popover-foreground scrollbar-thin"
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option, index) => (
          <li
            key={option[valueKey]}
            role="option"
            aria-selected={index === activeIndex || option[valueKey] === selectedId}
            onClick={() => handleSelect(option)}
            className={`px-3 py-2 cursor-pointer transition-colors duration-100 flex justify-between items-center text-xs sm:text-sm ${
              index === activeIndex
                ? "bg-primary/10 text-primary-text font-medium"
                : option[valueKey] === selectedId
                  ? "bg-secondary/70 text-foreground font-medium"
                  : "hover:bg-secondary/50 text-foreground"
            }`}
          >
            {customRender ? customRender(option) : <span>{option[labelKey]}</span>}
          </li>
        ))
      ) : (
        <li className="px-3 py-3 text-xs text-muted-foreground text-center">No matching records</li>
      )}
    </ul>
  ) : null;

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`erp-input pr-8 ${inputClassName}`}
        />
        {searchTerm && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => {
              setSearchTerm("");
              if (onClear) onClear();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/70 erp-focus-ring cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {createPortal(dropdownList, document.body)}
    </div>
  );
}

export default Autocomplete;
