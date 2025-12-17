import React, { useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/Dashboard.module.css";
import Dropdown from "../components/Dropdown";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface RollingPoint {
  date: string;
  drawdown: number;
}

interface Props {
  maxDDData: Record<string, number>;
  rollingDDData: Record<string, RollingPoint[]>;
  selectedStocks: string[];
  range: string;
  setRange: (range: string) => void;
}

const ranges = [
  { label: "1M" },
  { label: "3M" },
  { label: "6M" },
  { label: "YTD" },
  { label: "1Y" },
  { label: "3Y" },
  { label: "All" },
];

const COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
const modeOptions = [{ label: "Max Drawdown" }, { label: "Rolling Drawdown" }];

export default function DrawdownChart({
  maxDDData,
  rollingDDData,
  selectedStocks,
  range,
  setRange,
}: Props) {
  const [viewMode, setViewMode] = useState<"max" | "rolling">("max");
  const [crosshairShapes, setCrosshairShapes] = useState<any[]>([]);
  const [crosshairAnnotations, setCrosshairAnnotations] = useState<any[]>([]);

  // --- Helper for x-axis date formatting ---
  const formatDateLabel = (dateStr: string, range: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    if (["1Y", "3Y", "All"].includes(range)) {
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return `${day}/${month}`;
  };

  const maxTraces = [
    {
      x: selectedStocks,
      y: selectedStocks.map((s) => maxDDData[s] ?? 0),
      type: "bar",
      marker: { color: "#ff4d4f" },
      name: "Max Drawdown",
    },
  ];

  const rollingTraces = selectedStocks.map((ticker, idx) => {
    const series = rollingDDData[ticker] || [];
    return {
      x: series.map((p) => p.date),
      y: series.map((p) => p.drawdown),
      type: "scatter",
      mode: "lines",
      name: ticker,
      line: { color: COLORS[idx % COLORS.length], width: 2 },
    };
  });

  const chartData = viewMode === "max" ? maxTraces : rollingTraces;

  // --- Prepare x-axis ticks ---
  const xValues = chartData[0]?.x || [];
  const tickStep = Math.max(1, Math.floor(xValues.length / 10));

  // --- Hover handler ---
  const handleHover = (event: any) => {
    if (!event.points || event.points.length === 0) return;
    const xVal = event.points[0].x;
    const pointIndex = event.points[0].pointIndex;

    const verticalLine = {
      type: "line",
      x0: xVal,
      x1: xVal,
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color: "#888", width: 1, dash: "dot" },
    };

    const newShapes: any[] = [verticalLine];
    const newAnnotations: any[] = [];

    if (viewMode === "rolling") {
      selectedStocks.forEach((stock, idx) => {
        const trace = rollingTraces[idx];
        if (!trace) return;
        const yVal = trace.y[pointIndex] as number;
        if (yVal === undefined || yVal === null) return;

        // horizontal line at the drawdown value
        newShapes.push({
          type: "line",
          x0: 0,
          x1: 1,
          y0: yVal,
          y1: yVal,
          xref: "paper",
          yref: "y",
          line: { color: COLORS[idx % COLORS.length], width: 1, dash: "dot" },
        });

        newAnnotations.push({
          x: 1,
          y: yVal,
          xref: "paper",
          yref: "y",
          text: `${(yVal * 100).toFixed(2)}%`,
          showarrow: false,
          xanchor: "left",
          font: { color: "white", size: 12 },
          bgcolor: COLORS[idx % COLORS.length],
        });
      });
    }

    setCrosshairShapes(newShapes);
    setCrosshairAnnotations(newAnnotations);
  };

  const handleUnhover = () => {
    setCrosshairShapes([]);
    setCrosshairAnnotations([]);
  };

  return (
    <div>
      <div className={styles.chartWrapper}>
        <Plot
          data={chartData}
          layout={{
            autosize: true,
            margin: { t: 0, b: 40, l: 0, r: 60 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            hovermode: "x",
            hoverdistance: 50,
            xaxis: {
              type: "category",
              tickvals: xValues.filter((_, i) => i % tickStep === 0),
              ticktext: xValues
                .filter((_, i) => i % tickStep === 0)
                .map((dateStr) => formatDateLabel(dateStr, range)),
              tickfont: { color: "#A0A0A0" },
              gridcolor: "rgba(128,128,128,0.5)",
            },
            yaxis: {
              tickformat: ",.2~f",
              ticksuffix: "%",
              tickfont: { color: "#A0A0A0" },
              gridcolor: "rgba(128,128,128,0.5)",
              side: "right",
              rangemode: "tozero",
              autorange: true,
              range: viewMode === "max" ? [0, 100] : undefined,
            },
            shapes: [...crosshairShapes],
            annotations: crosshairAnnotations,
            showlegend: false, // ⬅ disables Plotly's default legend
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: "100%", height: "100%" }}
          onHover={handleHover}
          onUnhover={handleUnhover}
        />
      </div>

      <div className={styles.bottomrowRangeAndLegend}>
        <div className={styles.rangerollingrow}>
          {ranges.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.label)}
              className={`${styles.selectedRange} ${range === r.label ? styles.activeRange : ""}`}
            >
              {r.label}
            </button>
          ))}

          <div className={styles.separator}></div>

          <div className={styles.rollingSelector}>
            <Dropdown
              options={modeOptions.map((o) => o.label)}
              selected={viewMode === "max" ? "Max Drawdown" : "Rolling Drawdown"}
              onSelect={(opt) => setViewMode(opt === "Max Drawdown" ? "max" : "rolling")}
              label="Drawdown Type:"
              direction="up"
            />
          </div>
        </div>

        {viewMode === "rolling" && (
          <div className={styles.customLegend}>
            {chartData.map((trace, i) => (
              <div key={i} className={styles.legendItem}>
                <span
                  className={styles.legendColorBox}
                  style={{
                    backgroundColor: "line" in trace ? trace.line.color : trace.marker.color,
                  }}
                />
                {trace.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
