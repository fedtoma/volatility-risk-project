// components/MultiSelectDropdown.tsx
import React, { useState, useRef, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onSelect: (selected: string[]) => void;
  label?: string;
  direction?: "up" | "down";
}

export default function MultiSelectDropdown({
  options,
  selected,
  onSelect,
  label,
  direction = "down",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) onSelect(selected.filter((s) => s !== opt));
    else onSelect([...selected, opt]);
  };

  // close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.selectWrapper} ref={menuRef}>
      {label && <span className={styles.selectLabel}>{label}</span>}
      <div className={styles.dropdown} onClick={() => setOpen(!open)}>
        <div className={styles.selected}>
          {selected.length > 0 ? selected.join(", ") : "Select..."}
          <span className={styles.arrow}>{open ? "▴" : "▾"}</span>
        </div>
        {open && (
          <div className={`${styles.options} ${direction === "up" ? styles.optionsUp : styles.optionsDown}`}>
            {options.map((opt) => (
              <label key={opt} className={styles.option}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
