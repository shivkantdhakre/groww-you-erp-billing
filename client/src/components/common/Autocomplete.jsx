import { useState, useEffect, useRef } from "react";

function Autocomplete({
  options = [],
  labelKey = "name",
  valueKey = "id",
  placeholder = "Search...",
  onSelect,
  selectedId = null,
  onClear = null,
  searchFields = ["name"],
  customRender = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt[valueKey] === selectedId);

  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption[labelKey]);
    } else {
      setSearchTerm("");
    }
  }, [selectedOption, labelKey]);

  // Reset active index when list opens or filters change
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
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

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
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

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-border text-foreground"
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
      )}
    </div>
  );
}

export default Autocomplete;
