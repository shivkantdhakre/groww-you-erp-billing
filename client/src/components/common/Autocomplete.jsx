import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

function Autocomplete({
  options = [],
  labelKey = "name",
  valueKey = "id",
  placeholder = "Search...",
  onSelect,
  selectedId = null,
  value = "",
  onClear = null,
  searchFields = ["name"],
  customRender = null,
  inputRef = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt[valueKey] === selectedId);

  // Calculate dropdown position from the wrapper's bounding rect
  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
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

  // Reset active index when list opens or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveIndex(-1);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Reposition dropdown on scroll/resize while open
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
        wrapperRef.current && !wrapperRef.current.contains(event.target) &&
        listRef.current && !listRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        // Reset search term to selected option's name when closing
        if (selectedOption) {
          setSearchTerm(selectedOption[labelKey]);
        } else {
          setSearchTerm("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedOption, labelKey]);

  const filteredOptions = options.filter((opt) => {
    const term = searchTerm.toLowerCase();
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
        } else {
          setSearchTerm("");
        }
        break;
      default:
        break;
    }
  };

  const scrollActiveIntoView = (index) => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[index];
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  };

  const dropdownList = isOpen ? (
    <ul
      ref={listRef}
      style={{
        position: "fixed",
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        width: `${dropdownPos.width}px`,
      }}
      className="z-[9999] bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-border text-foreground"
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((option, index) => (
          <li
            key={option[valueKey]}
            onClick={() => handleSelect(option)}
            className={`p-3 cursor-pointer transition-colors duration-150 flex justify-between items-center text-foreground ${
              index === activeIndex
                ? "bg-secondary font-medium"
                : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {customRender ? (
              customRender(option)
            ) : (
              <span>{option[labelKey]}</span>
            )}
          </li>
        ))
      ) : (
        <li className="p-3 text-muted-foreground text-center">No results found</li>
      )}
    </ul>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="border border-border p-3 rounded-lg w-full bg-card text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition duration-200"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              if (onClear) onClear();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {createPortal(dropdownList, document.body)}
    </div>
  );
}

export default Autocomplete;
