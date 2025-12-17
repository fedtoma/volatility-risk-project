"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "../styles/Dashboard.module.css";
import Dropdown from "../components/Dropdown"; // You may need to update this to support multi-select
import MultiSelectDropdown from "../components/MultiSelectDropdown"
import { fetchVolatility } from "../services/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const rollingOptions = ["7d", "30d", "90d", "252d"];
const ranges = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "All"];

async function fetchPortfolioVolatility(
    stocks: string[],
    weights: Record<string, number>,
    range: string,
    rolling: string[]
) {
    const params = new URLSearchParams();
    stocks.forEach((s) => params.append("stocks", s));
    stocks.forEach((s) => params.append("weights", (weights[s] ?? 0).toString()));
    params.append("range", range);
    rolling.forEach((r) => params.append("rolling", r));

    const res = await fetch(`http://localhost:8000/portfolio_metrics?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch portfolio volatility");

    const data = await res.json();
    return data.portfolio_metrics.vol;
}

interface Props {
    selectedStocks: string[];
    weights: Record<string, number>;
    portfolioConfirmed: boolean;
}

const fixedColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"];
const getColor = (idx: number) =>
    idx < fixedColors.length ? fixedColors[idx] : `hsl(${(idx * 137.5) % 360}, 65%, 50%)`;

const getDtick = (range: string, nPoints: number) => Math.max(1, Math.floor(nPoints / 10));
const formatDateLabel = (dateStr: string, range: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    if (["1Y", "3Y", "All"].includes(range)) return `${day}/${month}/${d.getFullYear()}`;
    return `${day}/${month}`;
};

export default function VolatilityChart({ selectedStocks, weights, portfolioConfirmed }: Props) {
    const [range, setRange] = useState<string>("1Y");
    const [selectedRolling, setSelectedRolling] = useState<string[]>(["30d"]);
    const [crosshairShapes, setCrosshairShapes] = useState<any[]>([]);
    const [crosshairAnnotations, setCrosshairAnnotations] = useState<any[]>([]);
    const [vol, setVol] = useState<any>(null);

    // ✅ Update overlay to support multi-select
    const [overlayStocks, setOverlayStocks] = useState<string[]>([]); // selected stocks to overlay
    const [overlayVol, setOverlayVol] = useState<any>(null);

    // Load overlay vol
    useEffect(() => {
        if (!portfolioConfirmed || overlayStocks.length === 0) {
            setOverlayVol(null);
            return;
        }

        async function loadOverlayVol() {
            try {
                const data = await fetchVolatility(overlayStocks, range, selectedRolling);
                console.log("Overlay fetch result:", data);
                setOverlayVol(data);
            } catch (err) {
                console.error("Failed to load overlay volatility:", err);
                setOverlayVol(null);
            }
        }

        loadOverlayVol();
    }, [overlayStocks, range, selectedRolling, portfolioConfirmed]);

    // Load portfolio vol
    useEffect(() => {
        if (!portfolioConfirmed) {
            setVol(null);
            return;
        }

        async function loadVol() {
            try {
                const volData = await fetchPortfolioVolatility(selectedStocks, weights, range, selectedRolling);
                setVol(volData);
            } catch (err) {
                console.error("Failed to load volatility:", err);
                setVol(null);
            }
        }

        loadVol();
    }, [selectedStocks, weights, range, selectedRolling, portfolioConfirmed]);

    const handleHover = (event: any) => {
        if (!event.points || event.points.length === 0) return;
        const xVal = event.points[0].x;

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

        if (vol) {
            const yVal = vol[selectedRolling[0]]?.[xVal];
            if (yVal !== undefined) {
                newShapes.push({
                    type: "line",
                    x0: 0,
                    x1: 1,
                    y0: yVal,
                    y1: yVal,
                    xref: "paper",
                    yref: "y",
                    line: { color: getColor(0), width: 1, dash: "dot" },
                });

                newAnnotations.push({
                    x: 1,
                    y: yVal,
                    xref: "paper",
                    yref: "y",
                    text: `${yVal.toFixed(2)}%`,
                    showarrow: false,
                    xanchor: "left",
                    font: { color: "white", size: 12 },
                    bgcolor: getColor(0),
                });
            }
        }

        setCrosshairShapes(newShapes);
        setCrosshairAnnotations(newAnnotations);
    };

    const handleUnhover = () => {
        setCrosshairShapes([]);
        setCrosshairAnnotations([]);
    };

    // Build chart data
    const chartData: any[] = [];

    if (vol) {
        // Portfolio
        const portfolioSeries = vol[selectedRolling[0]] || {};
        chartData.push({
            x: Object.keys(portfolioSeries),
            y: Object.values(portfolioSeries).map((v) => (v === 0 ? null : v)),
            type: "scatter",
            mode: "lines",
            name: "Portfolio",
            line: { color: getColor(0), width: 2 },
        });

        // Overlay stocks
        if (overlayVol) {
            overlayStocks.forEach((stock, idx) => {
                const rollingKey = selectedRolling[0];
                const series = overlayVol?.volatility?.[rollingKey]?.[stock];

                if (!series) {
                    console.warn(`No volatility data yet for ${stock}, skipping`);
                    return; // ✅ don't crash while waiting for fetch
                }

                chartData.push({
                    x: Object.keys(series),
                    y: Object.values(series).map((v) => (v === 0 ? null : v)),
                    type: "scatter",
                    mode: "lines",
                    name: stock,
                    line: { color: getColor(idx + 1) },
                });
            });
        }
    }

    const xValues = chartData[0]?.x || [];
    const tickStep = getDtick(range, xValues.length);

    return (
        <div>
            <div className={styles.chartWrapper}>
                <Plot
                    data={chartData}
                    layout={{
                        autosize: true,
                        showlegend: false,
                        margin: { t: 0, b: 40, l: 0, r: 60 },
                        paper_bgcolor: "rgba(0,0,0,0)",
                        plot_bgcolor: "rgba(0,0,0,0)",
                        hovermode: "x",
                        hoverdistance: 50,
                        xaxis: {
                            type: "category",
                            tickvals: xValues.filter((_: string, i: number) => i % tickStep === 0),
                            ticktext: xValues
                                .filter((_: string, i: number) => i % tickStep === 0)
                                .map((dateStr: string) => formatDateLabel(dateStr, range)),
                            tickfont: { color: "#A0A0A0" },
                            gridcolor: "rgba(128,128,128,0.5)",
                        },
                        yaxis: {
                            title: { text: "Annualised Volatility", font: { color: "#A0A0A0" } },
                            tickfont: { color: "#A0A0A0" },
                            tickformat: ",.2~f",
                            ticksuffix: "%",
                            gridcolor: "rgba(128,128,128,0.5)",
                            side: "right",
                            rangemode: "tozero",
                            autorange: true,
                        },
                        shapes: crosshairShapes,
                        annotations: crosshairAnnotations,
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
                            key={r}
                            onClick={() => setRange(r)}
                            className={`${styles.selectedRange} ${range === r ? styles.activeRange : ""}`}
                        >
                            {r}
                        </button>
                    ))}

                    <div className={styles.separator}></div>

                    {selectedRolling.map((roll, idx) => (
                        <div key={idx} className={styles.rollingSelector}>
                            <Dropdown
                                options={rollingOptions}
                                selected={roll}
                                onSelect={(opt) => {
                                    const updated = [...selectedRolling];
                                    updated[idx] = opt;
                                    setSelectedRolling(updated);
                                }}
                                label={`Rolling period:`}
                                direction="up"
                            />

                            {/* Remove button (×) */}
                            {selectedRolling.length > 1 && (
                                <button
                                    className={styles.removeBtn}
                                    onClick={() =>
                                        setSelectedRolling(selectedRolling.filter((_, i) => i !== idx))
                                    }
                                >
                                    ×
                                </button>
                            )}

                            {/* Add button (+) at last item */}
                            {idx === selectedRolling.length - 1 && selectedRolling.length < 4 && (
                                <button
                                    className={styles.addBtn}
                                    onClick={() => setSelectedRolling([...selectedRolling, "30d"])}
                                >
                                    +
                                </button>
                            )}

                            {idx < selectedRolling.length - 1 && <div className={styles.separator}></div>}
                        </div>
                    ))}

                </div>

                {/* ✅ Multi-select overlay dropdown */}
                <MultiSelectDropdown
                    options={selectedStocks}
                    selected={overlayStocks}
                    onSelect={setOverlayStocks}
                    label="Overlay Stock:"
                    direction="up"
                />

                <div className={styles.customLegend}>
                    {chartData.map((trace, i) => (
                        <div key={i} className={styles.legendItem}>
                            <span
                                className={styles.legendColorBox}
                                style={{ backgroundColor: trace.line?.color || "#888" }}
                            />
                            {trace.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
