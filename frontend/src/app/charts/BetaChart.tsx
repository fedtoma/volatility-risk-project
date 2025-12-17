import React from "react";
import dynamic from "next/dynamic";
import styles from "../styles/Dashboard.module.css";
import Dropdown from "../components/Dropdown";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  betaData: Record<string, number>;
  range: string;
  setRange: (range: string) => void;
  benchmark: string;
  setBenchmark: (benchmark: string) => void;
}

const ranges = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "All"];
const benchmarkOptions = ["Domestic Index", "S&P 500", "NASDAQ", "FTSE 100"];

const EPS = 1e-9;
const isClose = (a: number, b: number) => Math.abs(a - b) <= EPS;

const GRE = [50, 180, 50];
const YEL = [255, 255, 0];
const RED = [255, 0, 0];

const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const mixColor = (c1: number[], c2: number[], t: number) => [
  lerp(c1[0], c2[0], t),
  lerp(c1[1], c2[1], t),
  lerp(c1[2], c2[2], t),
];

// Diverging gradient: <1 green → 1 yellow → >1 red
const getGradientColor = (beta: number, minBeta: number, maxBeta: number) => {
  // Treat values extremely close to 1 as exactly 1
  if (isClose(beta, 1)) return rgb(YEL);

  // Single-value guard (avoid divide-by-zero / ambiguous mapping)
  if (isClose(minBeta, maxBeta)) {
    if (isClose(minBeta, 1)) return rgb(YEL); // single value == 1
    return beta < 1 ? rgb(GRE) : rgb(RED); // fixed green or red
  }

  // Multiple values: map <1 to GRE->YEL, >1 to YEL->RED
  if (beta < 1) {
    const denom = 1 - minBeta;
    const ratio = denom <= EPS ? 1 : (beta - minBeta) / denom; // 0..1
    const t = Math.min(Math.max(ratio, 0), 1);
    return rgb(mixColor(GRE, YEL, t));
  } else {
    const denom = maxBeta - 1;
    const ratio = denom <= EPS ? 1 : (beta - 1) / denom; // 0..1
    const t = Math.min(Math.max(ratio, 0), 1);
    return rgb(mixColor(YEL, RED, t));
  }
};

export default function BetaChart({
  betaData,
  range,
  setRange,
  benchmark,
  setBenchmark,
}: Props) {
  const stocks = Object.keys(betaData);
  const betas = Object.values(betaData);

  if (stocks.length === 0) {
    return <div className={styles.chartWrapper}>No beta data</div>;
  }

  const minBeta = Math.min(...betas);
  const maxBeta = Math.max(...betas);
  const onlyOneValue = isClose(minBeta, maxBeta);
  const allBelowOne = maxBeta < 1 - EPS;
  const allAboveOne = minBeta > 1 + EPS;

  // Per-bar colors (Plotly accepts array of CSS color strings)
  const colors = betas.map((b) => getGradientColor(b, minBeta, maxBeta));

  const chartData = [
    {
      x: stocks,
      y: betas,
      type: "bar",
      marker: { color: colors },
      text: betas.map((b) => b.toFixed(2)),
      textposition: "auto",
      hovertemplate: `Beta: %{y:.2f}<extra>%{x}</extra>`,
    },
  ];

  // Legend gradient: handle single-value==1 as uniform yellow
  let legendBackgroundStyle: React.CSSProperties = {
    background: "linear-gradient(to right, rgb(50,180,50) 0%, rgb(255,255,0) 50%, rgb(255,0,0) 100%)",
  };

  if (onlyOneValue && isClose(minBeta, 1)) {
    legendBackgroundStyle = { background: rgb(YEL) }; // uniform yellow
  } else if (allBelowOne) {
    legendBackgroundStyle = { background: `linear-gradient(to right, ${rgb(GRE)} 0%, ${rgb(YEL)} 100%)` };
  } else if (allAboveOne) {
    legendBackgroundStyle = { background: `linear-gradient(to right, ${rgb(YEL)} 0%, ${rgb(RED)} 100%)` };
  }

  return (
    <div>
      <div className={styles.chartWrapper}>
        <Plot
          data={chartData}
          layout={{
            title: `Beta vs ${benchmark}`,
            autosize: true,
            margin: { t: 0, b: 80, l: 60, r: 0 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            showlegend: false,
            xaxis: {
              title: { font: { color: "#A0A0A0" } },
              tickfont: { color: "#A0A0A0" },
            },
            yaxis: {
              title: { text: "Beta", font: { color: "#A0A0A0" } },
              tickfont: { color: "#A0A0A0" },
              gridcolor: "rgba(128,128,128,0.5)",
              rangemode: "tozero",
              showline: true,
            },
            shapes: [
              {
                type: "line",
                x0: -0.5,
                x1: stocks.length - 0.5,
                y0: 1,
                y1: 1,
                line: { dash: "dash", color: "gray" },
              },
            ],
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Bottom row: range + benchmark + gradient legend */}
      <div className={styles.bottomrowRangeAndLegend}>
        <div className={styles.rangerollingrow}>
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`${styles.selectedRange} ${range === r ? styles.activeRange : ""}`}
            >
              {r}
            </button>
          ))}

          <div className={styles.separator}></div>

          <div className={styles.rollingSelector}>
            <Dropdown
              options={benchmarkOptions}
              selected={benchmark}
              onSelect={setBenchmark}
              label="Benchmark:"
              direction="up"
            />
          </div>
        </div>

        {/* Gradient legend */}
        <div className={styles.gradientLegend}>
          <div className={styles.gradientLegendBar} style={legendBackgroundStyle} />
          <div className={styles.gradientLegendLabels}>
            {onlyOneValue && isClose(minBeta, 1) ? (
              <>
                <span>&nbsp;</span>
                <span>1.00</span>
                <span>&nbsp;</span>
              </>
            ) : allBelowOne ? (
              <>
                <span>{minBeta.toFixed(2)}</span>
                <span>1.00</span>
                <span>&nbsp;</span>
              </>
            ) : allAboveOne ? (
              <>
                <span>&nbsp;</span>
                <span>1.00</span>
                <span>{maxBeta.toFixed(2)}</span>
              </>
            ) : (
              <>
                <span>{minBeta.toFixed(2)}</span>
                <span>1.00</span>
                <span>{maxBeta.toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
