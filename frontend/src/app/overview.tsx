"use client";

import React, { useState } from "react";
import StockDropdown from "./components/StockDropdown";
import styles from "./styles/overview.module.css";

interface Stock {
  ticker: string;
  name: string;
  value: number;       // current value
  initialValue: number; // initial value
}

interface HomeOverviewProps {
  availableStocks: Stock[]; // all stocks user can choose from
}

const HomeOverview: React.FC<HomeOverviewProps> = ({ availableStocks }) => {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  // Filter selected stocks
  const selectedData = availableStocks.filter(stock =>
    selectedStocks.includes(stock.ticker)
  );

  // Portfolio calculations
  const totalValue = selectedData.reduce((sum, s) => sum + s.value, 0);
  const initialValue = selectedData.reduce((sum, s) => sum + s.initialValue, 0);
  const totalReturn = initialValue ? ((totalValue - initialValue) / initialValue) * 100 : 0;

  const dailyChange = selectedData.reduce((sum, s) => sum + (s.value - s.initialValue) * 0.01, 0); // placeholder
  const weeklyChange = selectedData.reduce((sum, s) => sum + (s.value - s.initialValue) * 0.05, 0); // placeholder
  const monthlyChange = selectedData.reduce((sum, s) => sum + (s.value - s.initialValue) * 0.1, 0); // placeholder

  return (
    <div className={styles.container}>
      <h2>Portfolio Overview</h2>

      {/* Stock Dropdown */}
      <div className={styles.stockSelection}>
        <h3>Select Stocks in Portfolio:</h3>
        <StockDropdown
          selectedStocks={selectedStocks}
          setSelectedStocks={setSelectedStocks}
        />

        {/* Selected stocks list */}
        {selectedStocks.length > 0 && (
          <ul className={styles.selectedStockList}>
            {selectedData.map(stock => (
              <li key={stock.ticker} className={styles.selectedStockItem}>
                {stock.ticker} - {stock.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Portfolio summary */}
      {selectedStocks.length > 0 ? (
        <div className={styles.cardsContainer}>
          <div className={styles.card}>
            <h3>Total Value</h3>
            <p>${totalValue.toLocaleString()} (Init: ${initialValue.toLocaleString()})</p>
          </div>
          <div className={styles.card}>
            <h3>Total Return</h3>
            <p>{totalReturn.toFixed(2)}%</p>
          </div>
          <div className={styles.card}>
            <h3>Daily Change</h3>
            <p>{dailyChange.toFixed(2)}%</p>
          </div>
          <div className={styles.card}>
            <h3>Weekly Change</h3>
            <p>{weeklyChange.toFixed(2)}%</p>
          </div>
          <div className={styles.card}>
            <h3>Monthly Change</h3>
            <p>{monthlyChange.toFixed(2)}%</p>
          </div>
          <div className={styles.card}>
            <h3>Number of Holdings</h3>
            <p>{selectedStocks.length}</p>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: "center", marginTop: "2rem" }}>No stocks selected yet.</p>
      )}
    </div>
  );
};

export default HomeOverview;
