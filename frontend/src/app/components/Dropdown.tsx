"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/Dashboard.module.css";

interface DropdownProps {
  options: string[];
  selected: string;
  onSelect: (opt: string) => void;
  label?: string;
  direction?: "up" | "down";
}

export default function Dropdown({ options, selected, onSelect, label, direction = "down" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // only close if click is outside the dropdown menu itself
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.selectWrapper}>
      {label && <span className={styles.selectLabel}>{label}</span>}
      <div className={styles.dropdown} ref={menuRef}>
        <div className={styles.selected} onClick={() => setOpen(!open)}>
          {selected}
          <span className={styles.arrow}>{open ? "▴" : "▾"}</span>
        </div>

        {open && (
          <div className={`${styles.options} ${direction === "up" ? styles.optionsUp : styles.optionsDown}`}>
            {options.map((opt) => (
              <div
                key={opt}
                className={styles.option}
                onClick={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
