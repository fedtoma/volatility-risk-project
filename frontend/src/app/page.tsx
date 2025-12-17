"use client";

import React, { useState, useEffect, useRef } from "react";
import Portfolio from "./sections/Portfolio";
import OverallStats from "./sections/OverallStats";
import OverallMetrics from "./sections/OverallMetrics";
import styles from "./styles/Dashboard.module.css";
import { fetchPortfolioMetrics, streamAISummary } from "./services/api";

interface PortfolioMetrics {
  vol: Record<string, Record<string, number>>; // now keyed by rolling window
  returns: Record<string, number>;
  max_drawdown: number;
  sharpe: number | null;
  sortino: number | null;
  avgRet?: number;
  avgVol?: number;
}

export default function Dashboard({ mode = "portfolioanalysis" }: { mode: string }) {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [portfolioConfirmed, setPortfolioConfirmed] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>("1Y");
  const [selectedRolling, setSelectedRolling] = useState<string>("30d");
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [badges, setBadges] = useState<{
    risk: "Low" | "Moderate" | "High";
    performance: "Underperform" | "Neutral" | "Outperform";
    signal: "Cautious Buy" | "Hold" | "Reduce Exposure";
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset when portfolio is cleared
  useEffect(() => {
    if (!portfolioConfirmed) {
      abortControllerRef.current?.abort();
      setAiSummary("");
      setAiLoading(false);
      setPortfolioMetrics(null);
    }
  }, [portfolioConfirmed]);

  // Reset confirmation when inputs change
  useEffect(() => {
    setPortfolioConfirmed(false);
  }, [selectedStocks, weights, selectedRange, selectedRolling]);

  // Fetch metrics and AI summary
  useEffect(() => {
    if (!portfolioConfirmed || mode !== "portfolioanalysis" || selectedStocks.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let isActive = true;

    (async () => {
      try {
        const stocks = selectedStocks;
        const w = stocks.map((s) => weights[s] ?? 0);

        const data = await fetchPortfolioMetrics(stocks, w, selectedRange, [selectedRolling]);
        if (!isActive) return;

        // Calculate avgRet
        const returnsSeries = data.portfolio_metrics.returns as Record<string, number>;
        const returnsArray = Object.values(returnsSeries);
        const avgRet =
          returnsArray.length > 0 ? returnsArray.reduce((a, b) => a + b, 0) / returnsArray.length : 0;

        // Calculate avgVol for the selected rolling period
        const selectedVolSeries = data.portfolio_metrics.vol[selectedRolling] as
          | Record<string, number>
          | undefined;

        const vols = selectedVolSeries ? Object.values(selectedVolSeries) : [];
        const avgVol = vols.length > 0 ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;

        // Store metrics
        setPortfolioMetrics({
          ...data.portfolio_metrics,
          avgRet,
          avgVol,
        });

        // Compute badges
        const maxDD = data.portfolio_metrics.max_drawdown;
        const riskScore = avgVol + Math.abs(maxDD);
        let risk: "Low" | "Moderate" | "High";
        if (riskScore < 15) risk = "Low";
        else if (riskScore < 30) risk = "Moderate";
        else risk = "High";

        const rangeThresholds: Record<string, { underperform: number; outperform: number }> = {
          "1M": { underperform: 0, outperform: 5 },
          "3M": { underperform: 1, outperform: 6 },
          "6M": { underperform: 2, outperform: 8 },
          YTD: { underperform: 3, outperform: 10 },
          "1Y": { underperform: 5, outperform: 15 },
          "3Y": { underperform: 7, outperform: 18 },
          All: { underperform: 5, outperform: 15 },
        };
        const thresholds = rangeThresholds[selectedRange] || rangeThresholds["1Y"];

        let performance: "Underperform" | "Neutral" | "Outperform" = "Neutral";
        if (avgRet > thresholds.outperform) performance = "Outperform";
        else if (avgRet < thresholds.underperform) performance = "Underperform";

        let signal: "Cautious Buy" | "Hold" | "Reduce Exposure" = "Hold";
        if (risk === "High" && performance === "Underperform") signal = "Reduce Exposure";
        else if ((risk === "Low" || risk === "Moderate") && performance === "Outperform")
          signal = "Cautious Buy";

        if (!isActive) return;
        setBadges({ risk, performance, signal });

        // AI summary (streaming)
        setAiLoading(true);
        setAiSummary(""); // reset before streaming
        const aiMetrics = {
          avgVol,
          avgRet,
          max_drawdown: data.portfolio_metrics.max_drawdown,
          sharpe: data.portfolio_metrics.sharpe,
          sortino: data.portfolio_metrics.sortino,
        };

        await streamAISummary(aiMetrics, controller.signal, (chunk) => {
          if (!isActive) return;
          setAiSummary((prev) => prev + chunk);
        });

        if (isActive) setAiLoading(false);
      } catch (err) {
        if ((err as any).name === "AbortError") {
          console.log("AI summary generation aborted");
        } else {
          console.error("Error fetching portfolio metrics or AI summary:", err);
        }
        if (isActive) setAiLoading(false);
      }
    })();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [portfolioConfirmed, selectedStocks, weights, selectedRange, selectedRolling, mode]);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.headerContainer}>
          <h1 className={styles.header}>Stock Risk & Performance Dashboard</h1>
        </div>
      </div>

      <div className={`${styles.pageLayout} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <Portfolio
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          selectedStocks={selectedStocks}
          setSelectedStocks={setSelectedStocks}
          weights={weights}
          setWeights={setWeights}
          range={selectedRange}
          setRange={setSelectedRange}
          rolling={selectedRolling}
          setRolling={setSelectedRolling}
          portfolioConfirmed={portfolioConfirmed}
          setPortfolioConfirmed={setPortfolioConfirmed}
        />

        <div className={styles.rightColumn}>
          <OverallStats
            summary={aiSummary
              .split(/\n\s*\n/)
              .map((p) => p.replace(/\s+/g, " ").trim())
              .join("\n\n")
              .trim()}
            risk={badges?.risk}
            performance={badges?.performance}
            signal={badges?.signal}
            loading={aiLoading}
          />

          <OverallMetrics
            avgVol={portfolioMetrics?.avgVol}
            avgRet={portfolioMetrics?.avgRet}
            maxDrawdown={portfolioMetrics?.max_drawdown}
            sharpe={portfolioMetrics?.sharpe ?? undefined}
            sortino={portfolioMetrics?.sortino ?? undefined}
            selectedStocks={selectedStocks}
            weights={weights}
            portfolioConfirmed={portfolioConfirmed}
          />
        </div>
      </div>
    </div>
  );
}
