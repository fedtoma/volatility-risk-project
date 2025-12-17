import React, { useEffect } from "react";
import StockDropdown from "../components/StockDropdown";
import styles from "../styles/overview.module.css";
import styles2 from "../styles/Dashboard.module.css";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PortfolioProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStocks: string[];
  setSelectedStocks: React.Dispatch<React.SetStateAction<string[]>>;
  weights: Record<string, number>;
  setWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  range: string;
  setRange: React.Dispatch<React.SetStateAction<string>>;
  rolling: string;
  setRolling: (val: string) => void;
  portfolioConfirmed: boolean;
  setPortfolioConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
}

const ranges = [
  { label: "1M" }, { label: "3M" }, { label: "6M" }, { label: "YTD" },
  { label: "1Y" }, { label: "3Y" }, { label: "All" },
];

const rollingOptions = ["7d", "30d", "90d", "252d"];

const Portfolio: React.FC<PortfolioProps> = ({
  sidebarOpen,
  setSidebarOpen,
  selectedStocks,
  setSelectedStocks,
  weights,
  setWeights,
  range,
  setRange,
  rolling,
  setRolling,
  portfolioConfirmed,
  setPortfolioConfirmed,
}) => {

  useEffect(() => {
    setWeights((prev) => {
      const newWeights = { ...prev };
      let changed = false;

      selectedStocks.forEach((s) => {
        if (!(s in newWeights)) {
          newWeights[s] = 0;
          changed = true;
        }
      });

      return changed ? newWeights : prev;
    });
  }, [selectedStocks]);

  const totalWeight = Object.values(weights).reduce((acc, w) => acc + w, 0);

  const handleWeightChange = (symbol: string, value: number) => {
    setWeights((prev) => ({ ...prev, [symbol]: value }));
  };

  const removeStock = (symbol: string) => {
    setSelectedStocks((prev) => prev.filter((s) => s !== symbol));
    setWeights((prev) => {
      const copy = { ...prev };
      delete copy[symbol];
      return copy;
    });
  };

  const pieValues = [...selectedStocks.map((s) => weights[s])];
  const pieLabels = [...selectedStocks];

  if (totalWeight < 100) {
    pieValues.push(100 - totalWeight);
    pieLabels.push("Remaining");
  }

  return (
    <div className={`${styles2.sidebar} ${sidebarOpen ? styles2.open : ""}`}>
      <button
        className={styles2.sidebarToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? "«" : "»"}
      </button>

      <div className={styles2.sidebarContent}>
        {/* Portfolio Section */}
        <div className={styles.col}>
          <div className={styles.mainText}>Your Portfolio</div>
          <div className={styles.stockSelection}>
            <div className={styles.subText}>Add Stock:</div>
            <StockDropdown
              selectedStocks={selectedStocks}
              setSelectedStocks={setSelectedStocks}
            />
          </div>
        </div>

        {/* Pie Chart + Stock List */}
        <div className={styles.colPieContainer}>
          <div className={styles.colPie}>
            <Plot
              data={[{
                values: pieValues,
                labels: pieLabels,
                type: "pie",
                textinfo: "label+percent",
                hole: 0.3,
                marker: {
                  colors: pieLabels.map(label =>
                    label === "Remaining" ? "#ffffff" : undefined),
                },
                hoverinfo: "skip",
              }]}
              layout={{
                autosize: true,
                margin: { t: 10, b: 10, l: 10, r: 10 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                showlegend: false,
              }}
              config={{ displayModeBar: false, displaylogo: false }}
              style={{ width: "100%", height: "100%" }}
              {...({ useResizeHandler: true } as any)}
            />
          </div>

          <div className={styles.selectedStockContainer}>
            {selectedStocks.length > 0 ? (
              <ul className={styles.selectedStockList}>
                {selectedStocks.map(symbol => (
                  <li key={symbol} className={styles.selectedStockItem}>
                    {symbol}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights[symbol] ?? 0}
                      onChange={(e) =>
                        handleWeightChange(symbol, Number(e.target.value))}
                      className={styles.numberInput}
                    />
                    <span>%</span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeStock(symbol)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyText}>No stocks selected</p>
            )}
          </div>
        </div>

        {/* Range + Rolling Periods */}
        <div className={styles.stockSelection}>
          <div className={styles.controlSection}>
            <div className={styles.subText}>Range:</div>
            <div className={styles.rangerollingrow}>
              {ranges.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRange(r.label)}
                  className={`${styles.selectedRange} ${range === r.label ? styles.activeRange : ""
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <hr className={styles.separatorLine} />

          <div className={styles.controlSection}>
            <div className={styles.subText}>Rolling Periods:</div>
            <div className={styles.rangerollingrow}>
              {rollingOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRolling(opt)}
                  className={`${styles.selectedRange} ${rolling === opt ? styles.activeRange : ""
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer (Confirm Button) */}
        <div className={styles2.sidebarFooter}>
          <button
            className={`${styles.confirmBtn} ${portfolioConfirmed ? styles.confirmed : ""
              }`}
            onClick={() => setPortfolioConfirmed(true)}
            disabled={selectedStocks.length === 0 || totalWeight !== 100}
          >
            Confirm Portfolio
          </button>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
