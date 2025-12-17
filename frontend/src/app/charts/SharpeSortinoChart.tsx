import React, { useState } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/Dashboard.module.css";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
    sharpeData: Record<string, number>;
    sortinoData: Record<string, number>;
    selectedStocks: string[];
    range: string;
    setRange: (range: string) => void;
}

const ranges = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "All"];

export default function SharpeSortinoChart({
    sharpeData,
    sortinoData,
    selectedStocks,
    range,
    setRange,
}: Props) {
    const stocks = selectedStocks;

    // new: track which metric(s) to show
    const [selectedMetric, setSelectedMetric] = useState<"Sharpe" | "Sortino" | "Both">("Both");

    // build chart data depending on selection
    const chartData: any[] = [];

    if (selectedMetric === "Sharpe" || selectedMetric === "Both") {
        chartData.push({
            x: stocks,
            y: stocks.map((s) => sharpeData[s] ?? 0),
            type: "bar",
            name: "Sharpe",
            marker: { color: "rgb(31,119,180)" },
        });
    }

    if (selectedMetric === "Sortino" || selectedMetric === "Both") {
        chartData.push({
            x: stocks,
            y: stocks.map((s) => sortinoData[s] ?? 0),
            type: "bar",
            name: "Sortino",
            marker: { color: "rgb(255,127,14)" },
        });
    }

    return (
        <div>
            <div className={styles.chartWrapper}>
                <Plot
                    data={chartData}
                    layout={{
                        title: "Sharpe & Sortino Ratios",
                        barmode: "group",
                        autosize: true,
                        margin: { t: 0, b: 40, l: 60, r: 0 },
                        paper_bgcolor: "rgba(0,0,0,0)",
                        plot_bgcolor: "rgba(0,0,0,0)",
                        xaxis: { tickfont: { color: "#A0A0A0" } },
                        yaxis: {
                            title: { text: "Ratio", font: { color: "#A0A0A0" } },
                            tickfont: { color: "#A0A0A0" },
                            gridcolor: "rgba(128,128,128,0.5)",
                        },
                        showlegend: false,  // 🚀 hide legend completely
                    }}
                    config={{
                        responsive: true,
                        displayModeBar: false,
                    }}
                    style={{ width: "100%", height: "100%" }}
                />


            </div>

            <div className={styles.bottomrowRangeAndLegend}>
                <div className={styles.rangerollingrow}>
                    {/* Range buttons */}
                    {ranges.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`${styles.selectedRange} ${range === r ? styles.activeRange : ""}`}
                        >
                            {r}
                        </button>
                    ))}

                    {/* Separator */}
                    <div className={styles.separator}></div>

                    {/* Metric selector */}
                    {["Sharpe", "Sortino", "Both"].map((m) => (
                        <button
                            key={m}
                            onClick={() => setSelectedMetric(m as "Sharpe" | "Sortino" | "Both")}
                            className={`${styles.selectedRange} ${selectedMetric === m ? styles.activeRange : ""}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
