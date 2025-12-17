"use client";

import React, { useState } from "react";
import styles from "../styles/OverallMetrics.module.css";

// Import your chart components
import VolatilityChart from "../charts/VolatilityChart";
import SharpeSortinoChart from "../charts/SharpeSortinoChart";
import ReturnsChart from "../charts/ReturnsChart";
import DrawdownChart from "../charts/DrawdownChart";
import CorrelationsHeatmap from "../charts/CorrelationsHeatmap";
import BetaChart from "../charts/BetaChart";

interface OverallMetricsProps {
  avgVol?: number;
  avgRet?: number;
  maxDrawdown?: number;
  sharpe?: number;
  sortino?: number;

  // ✅ match what you have in page.tsx
  selectedStocks: string[];
  weights: Record<string, number>;

  portfolioConfirmed: boolean;
}

const OverallMetrics: React.FC<OverallMetricsProps> = ({
  avgVol,
  avgRet,
  maxDrawdown,
  sharpe,
  sortino,
  selectedStocks,
  weights,
  portfolioConfirmed,
}) => {
  const [selectedChart, setSelectedChart] = useState<string>("Volatility");

  // Format metrics
  const annualizedVol = avgVol !== undefined ? avgVol.toFixed(2) + "%" : "N/A";
  const annualizedReturn = avgRet !== undefined ? avgRet.toFixed(2) + "%" : "N/A";
  const maxDrawdownPct = maxDrawdown !== undefined ? maxDrawdown.toFixed(2) + "%" : "N/A";
  const sharpeFormatted = sharpe !== undefined && sharpe !== null ? sharpe.toFixed(2) : "N/A";
  const sortinoFormatted = sortino !== undefined && sortino !== null ? sortino.toFixed(2) : "N/A";

  // Map chart names to components
  const chartMap: Record<string, React.ReactNode> = {
    Volatility: (
      <VolatilityChart selectedStocks={selectedStocks} weights={weights} portfolioConfirmed={portfolioConfirmed} />
    ),
    "Sharpe & Sortino": (
      <SharpeSortinoChart sharpe={sharpe} sortino={sortino} />
    ),
    Returns: (
      <ReturnsChart
        avgRet={avgRet}
        selectedStocks={selectedStocks}
        weights={weights}
      />
    ),
    Drawdown: (
      <DrawdownChart
        maxDrawdown={maxDrawdown}
        selectedStocks={selectedStocks}
        weights={weights}
      />
    ),
    Correlations: (
      <CorrelationsHeatmap selectedStocks={selectedStocks} weights={weights} />
    ),
    Beta: <BetaChart selectedStocks={selectedStocks} weights={weights} />,
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainText}>Metrics:</div>

      <div className={styles.metricContainer}>
        <div className={styles.metric}>
          <strong>Annualized Avg Volatility:</strong> {annualizedVol}
        </div>

        <div className={styles.metric}>
          <strong>Annualized Avg Return:</strong> {annualizedReturn}
        </div>

        <div className={styles.metric}>
          <strong>Max Drawdown:</strong> {maxDrawdownPct}
        </div>

        <div className={styles.metric}>
          <strong>Sharpe Ratio:</strong> {sharpeFormatted}
        </div>

        <div className={styles.metric}>
          <strong>Sortino Ratio:</strong> {sortinoFormatted}
        </div>
      </div>

      {/* Dropdown for chart selection */}
      <div className={styles.chartSelector}>
        <label htmlFor="chartSelect">Select Chart: </label>
        <select
          id="chartSelect"
          value={selectedChart}
          onChange={(e) => setSelectedChart(e.target.value)}
        >
          <option value="Volatility">Volatility</option>
          <option value="Sharpe & Sortino">Sharpe & Sortino</option>
          <option value="Returns">Returns</option>
          <option value="Drawdown">Drawdown</option>
          <option value="Correlations">Correlations</option>
          <option value="Beta">Beta</option>
        </select>
      </div>

      {/* Render selected chart */}
      <div className={styles.chartContainer}>{chartMap[selectedChart]}</div>
    </div>
  );
};

export default OverallMetrics;
