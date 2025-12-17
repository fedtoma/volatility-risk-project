"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "../styles/StockDropdown.module.css";

interface Stock {
  symbol: string;
  shortname?: string;
  exchange?: string;
}

interface Props {
  selectedStocks: string[];
  setSelectedStocks: (stocks: string[]) => void;
}

export default function StockDropdown({ selectedStocks, setSelectedStocks }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Stock[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = async (query: string) => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/search?query=${query}`, {
        signal: controllerRef.current.signal,
      });
      const data = await res.json();
      setResults(data.results || data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setSearch(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.trim() === "") {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // DON'T clear results here

    timeoutRef.current = setTimeout(() => fetchResults(value), 300); // debounce
  };


  // Ensure unique results
  const uniqueResults = Array.from(new Map(results.map((s) => [s.symbol, s])).values());

  const handleSelect = (stock: Stock) => {
    if (!selectedStocks.includes(stock.symbol)) {
      setSelectedStocks([...selectedStocks, stock.symbol]);
    }
    setSearch(""); // clear input
    setResults([]); // clear dropdown
    setFocused(false); // close dropdown
  };

  return (
    <div className={styles.dropdownContainer} ref={wrapperRef}>
      <input
        type="text"
        placeholder="Search stock..."
        value={search}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        className={styles.searchInput}
      />

      {focused && search.length > 0 && (
        <div className={styles.dropdownList}>
          {loading ? (
            <div className={styles.dropdownMessage}>Loading...</div>
          ) : !loading && uniqueResults.length === 0 ? ( // ✅ only show after loading
            <div className={styles.dropdownMessage}>No results found</div>
          ) : (
            uniqueResults.slice(0, 5).map((stock) => (
              <div
                key={stock.symbol}
                className={styles.dropdownItem}
                onMouseDown={() => handleSelect(stock)}
              >
                {stock.symbol} - {stock.shortname || ""}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
