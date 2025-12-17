import React from "react";
import dynamic from "next/dynamic";
import styles from "../styles/Dashboard.module.css";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
    retData: Record<string, Record<string, number>>;
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

const fixedColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
function getColor(idx: number) {
    if (idx < fixedColors.length) return fixedColors[idx];
    const hue = (idx * 137.5) % 360;
    return `hsl(${hue}, 65%, 50%)`;
}

function mean(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[], meanVal: number) {
    const variance = arr.reduce((sum, x) => sum + (x - meanVal) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
}

function skew(arr: number[], meanVal: number, stdVal: number) {
    const n = arr.length;
    return (
        (n / ((n - 1) * (n - 2))) *
        arr.reduce((sum, x) => sum + ((x - meanVal) / stdVal) ** 3, 0)
    );
}

function kurtosis(arr: number[], meanVal: number, stdVal: number) {
    const n = arr.length;
    return (
        (n * (n + 1)) /
        ((n - 1) * (n - 2) * (n - 3)) *
        arr.reduce((sum, x) => sum + ((x - meanVal) / stdVal) ** 4, 0) -
        (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
    );
}

function calcVaR(values: number[], alpha = 0.95) {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor((1 - alpha) * sorted.length);
    return sorted[idx];
}

function calcCVaR(values: number[], varVal: number) {
    const tail = values.filter(v => v <= varVal);
    return tail.reduce((a, b) => a + b, 0) / tail.length;
}

export default function ReturnsChart({ retData, selectedStocks, range, setRange }: Props) {
    const chartData: any[] = [];
    const histogramTraces: any[] = []; // For legend colors
    const stats: { stock: string; skew: number; kurt: number }[] = [];

    if (selectedStocks.length === 0) {
        chartData.push({
            x: [0],
            y: [0],
            type: "scatter",
            mode: "lines",
            name: "No data",
            line: { color: "#888", dash: "dot" },
            hoverinfo: "skip",
        });
    } else {
        selectedStocks.forEach((stock, idx) => {
            const series = retData[stock];
            if (!series) return;

            const values = Object.values(series);
            const color = getColor(idx);

            // Histogram trace
            const histTrace = {
                x: values,
                type: "histogram",
                histnorm: "probability density",
                opacity: 0.7,
                name: stock,
                marker: { color },
            };
            chartData.push(histTrace);
            histogramTraces.push(histTrace);

            // Normal curve
            const meanVal = mean(values);
            const stdVal = std(values, meanVal);
            const xMin = Math.min(...values);
            const xMax = Math.max(...values);
            const xVals = Array.from({ length: 100 }, (_, i) => xMin + (i * (xMax - xMin)) / 99);
            const yVals = xVals.map(
                (x) => (1 / (stdVal * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - meanVal) / stdVal) ** 2)
            );

            const skewVal = skew(values, meanVal, stdVal);
            const kurtVal = kurtosis(values, meanVal, stdVal);

            stats.push({ stock, skew: skewVal, kurt: kurtVal });

            const normalTrace = {
                x: xVals,
                y: yVals,
                type: "scatter",
                mode: "lines",
                name: `${stock} Normal`,
                line: { color, dash: "dash", width: 2 },
            };
            chartData.push(normalTrace);

            const var95 = calcVaR(values, 0.95);
            const cvar95 = calcCVaR(values, var95);

            const nPoints = 50; // number of points along the line
            const yLine = Array.from({ length: nPoints }, (_, i) => (i * Math.max(...yVals)) / (nPoints - 1));
            const xVarLine = yLine.map(() => var95);
            const xCVaRLine = yLine.map(() => cvar95);

            chartData.push({
                x: xVarLine,
                y: yLine,
                type: "scatter",
                mode: "lines",
                name: `${stock} VaR`,
                line: { color, dash: "dot", width: 2 },
                hovertemplate: `VaR (95%)<br>Value: ${var95.toFixed(4)}<extra>${stock}</extra>`
            });

            chartData.push({
                x: xCVaRLine,
                y: yLine,
                type: "scatter",
                mode: "lines",
                name: `${stock} CVaR`,
                line: { color, width: 2 },
                hovertemplate: `CVaR (95%)<br>Value: ${cvar95.toFixed(4)}<extra>${stock}</extra>`
            });

        });
    }

    return (
        <div>
            <div className={styles.chartWrapper}>
                <Plot
                    data={chartData}
                    layout={{
                        title: "Daily Returns Distribution",
                        autosize: true,
                        showlegend: false,
                        margin: { t: 0, b: 40, l: 60, r: 0 },
                        paper_bgcolor: "rgba(0,0,0,0)",
                        plot_bgcolor: "rgba(0,0,0,0)",
                        xaxis: {
                            title: { text: "Daily return", font: { color: "#A0A0A0" } },
                            tickfont: { color: "#A0A0A0" },
                            gridcolor: "rgba(128,128,128,0.5)",
                            zeroline: true,
                            tickformat: ",.4~f",
                            ticksuffix: "%",
                            range: selectedStocks.length === 0 ? [-5, 5] : undefined,
                        },
                        yaxis: {
                            title: { text: "Probability Density", font: { color: "#A0A0A0" } },
                            tickfont: { color: "#A0A0A0" },
                            gridcolor: "rgba(128,128,128,0.5)",
                            zerolinecolor: "rgba(128,128,128,0.5)",
                            rangemode: "tozero",
                            showline: true,
                            linecolor: "rgba(128,128,128,0.5)",
                            linewidth: 0.3,
                        },
                        barmode: "group",
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: "100%", height: "100%" }}
                />
            </div>

            <div className={styles.bottomrowRangeAndLegend}>
                <div className={styles.rangerollingrow}>
                    {/* Range buttons */}
                    {ranges.map((r) => (
                        <button
                            key={r.label}
                            onClick={() => setRange(r.label)}
                            className={`${styles.selectedRange} ${range === r.label ? styles.activeRange : ""}`}
                        >
                            {r.label}
                        </button>
                    ))}

                    {/* Separator */}
                    <div className={styles.separator}></div>

                    {/* Skew/Kurtosis stats */}
                    {stats.map((s, idx) => (
                        <React.Fragment key={s.stock}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>{s.stock}:</span>{" "}
                                <span className={styles.statValue}>Skew {s.skew.toFixed(2)}</span>{" "}
                                <span className={styles.statValue}>Kurtosis {s.kurt.toFixed(2)}</span>
                            </div>

                            {/* ✅ Separator after each stock */}
                            {idx < stats.length - 1 && <div className={styles.separator}></div>}
                        </React.Fragment>
                    ))}

                </div>

                <div className={styles.customLegend}>
                    {selectedStocks.map((stock, i) => (
                        <div key={stock} className={styles.legendItem}>
                            <span
                                className={styles.legendColorBox}
                                style={{ backgroundColor: histogramTraces[i]?.marker.color || "white" }}
                            />
                            {stock}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
