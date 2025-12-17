import React from "react";
import dynamic from "next/dynamic";
import styles from "../styles/Dashboard.module.css";
import Dropdown from "../components/Dropdown";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  corrData: Record<string, Record<string, number>>;
  covData: Record<string, Record<string, number>>;
  corrLabels: string[];
  covLabels: string[];
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

const fixedColors = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
];
function getColor(idx: number) {
  if (idx < fixedColors.length) return fixedColors[idx];
  const hue = (idx * 137.5) % 360;
  return `hsl(${hue}, 65%, 50%)`;
}

const modeOptions = [{ label: "Correlation" }, { label: "Covariance" }];

export default function CorrelationHeatmap({
  corrData,
  covData,
  corrLabels,
  covLabels,
  selectedStocks,
  range,
  setRange,
}: Props) {
  const [viewMode, setViewMode] = React.useState<
    "correlation" | "covariance"
  >("correlation");

  const matrixData = viewMode === "correlation" ? corrData : covData;
  const labels = viewMode === "correlation" ? corrLabels : covLabels;

  const zValues = labels.map((row) =>
    labels.map((col) => matrixData[row]?.[col] ?? 0)
  );

  const zmin =
    viewMode === "correlation"
      ? -1
      : -Math.max(...zValues.flat().map(Math.abs));
  const zmax =
    viewMode === "correlation"
      ? 1
      : Math.max(...zValues.flat().map(Math.abs));

  // Build annotations for each square
  const annotations = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = 0; j < labels.length; j++) {
      annotations.push({
        x: labels[j],
        y: labels[i],
        text:
          viewMode === "covariance"
            ? (zValues[i][j] * 10000).toFixed(2)
            : zValues[i][j].toFixed(2),
        showarrow: false,
        font: { color: "white", size: 26 },
      });
    }
  }

  return (
    <div>
      <div className={styles.chartWrapper}>
        <Plot
          data={[
            {
              z: zValues,
              x: labels,
              y: labels,
              type: "heatmap",
              zmin,
              zmax,
              zmid: 1, // 👈 center around 1
              colorscale: [
                [0, "rgb(50,180,50)"],   // green
                [0.5, "rgb(255,255,0)"], // yellow
                [1, "rgb(255,0,0)"],     // red
              ],
              showscale: false, // hide Plotly’s bar
            }
          ]}
          layout={{
            title:
              viewMode === "correlation"
                ? "Stock Correlation Heatmap"
                : "Stock Covariance Heatmap",
            autosize: true,
            margin: { t: 0, b: 50, l: 60, r: 40 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            xaxis: {
              title: {
                text:
                  viewMode === "correlation"
                    ? "Correlation"
                    : "Covariance (* by 10000)",
                font: { color: "#A0A0A0" },
              },
              tickfont: { color: "#A0A0A0" },
              gridcolor: "rgba(128,128,128,0.5)",
              zerolinecolor: "rgba(128,128,128,0.5)",
            },
            yaxis: {
              title: { font: { color: "#A0A0A0" } },
              tickfont: { color: "#A0A0A0" },
              gridcolor: "rgba(128,128,128,0.5)",
              zerolinecolor: "rgba(128,128,128,0.5)",
            },
            shapes: [
              {
                type: "line",
                x0: 0,
                y0: 0,
                x1: 1,
                y1: 0,
                xref: "paper",
                yref: "paper",
                line: { color: "white", width: 0.3 },
              },
              {
                type: "line",
                x0: 0,
                y0: 0,
                x1: 0,
                y1: 1,
                xref: "paper",
                yref: "paper",
                line: { color: "white", width: 0.3 },
              },
              {
                type: "line",
                x0: 1,
                y0: 0,
                x1: 1,
                y1: 1,
                xref: "paper",
                yref: "paper",
                line: { color: "white", width: 0.3 },
              },
            ],
            showlegend: false,
            annotations, // ✅ overlay numbers
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>


      <div className={styles.bottomrowRangeAndLegend}>
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

          {/* Separator */}
          <div className={styles.separator}></div>

          {/* Mode dropdown */}
          <div className={styles.rollingSelector}>
            <Dropdown
              options={modeOptions.map((o) => o.label)}
              selected={
                viewMode === "correlation" ? "Correlation" : "Covariance"
              }
              onSelect={(opt) => {
                setViewMode(opt === "Correlation" ? "correlation" : "covariance");
              }}
              label="Mode:"
              direction="up"
            />
          </div>
        </div>

        {/* Custom gradient legend */}
        <div className={styles.gradientLegend}>
          <div
            className={styles.gradientLegendBar}
            style={{
              background:
                viewMode === "correlation"
                  ? "linear-gradient(to right, rgb(50,180,50), rgb(255,255,0), rgb(255,0,0))"
                  : "linear-gradient(to right, rgb(50,180,50), rgb(255,255,0), rgb(255,0,0))",
            }}
          />
          <div className={styles.gradientLegendLabels}>
            <span>{zmin.toFixed(2)}</span>
            <span>0</span>
            <span>{zmax.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
