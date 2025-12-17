export async function searchStocks(query: string) {
  const res = await fetch(`http://localhost:8000/search?query=${query}`);
  if (!res.ok) throw new Error("Failed to search stocks");
  return res.json();
}

export async function fetchVolatility(
  stocks: string[],
  range: string = "1M",
  rolling: string[] = ["30d"]
) {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);
  rolling.forEach((r) => params.append("rolling", r));

  const res = await fetch(`http://localhost:8000/volatility?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch volatility");
  return res.json();
}

export async function fetchReturns(stocks: string[], range: string = "1M") {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  const res = await fetch(`http://localhost:8000/returns?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch returns");
  return res.json();
}

export async function fetchCorrelations(stocks: string[], range: string = "1M") {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  const res = await fetch(`http://localhost:8000/correlations?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch correlations");
  return res.json();
}

export async function fetchCovariances(stocks: string[], range: string = "1M") {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  const res = await fetch(`http://localhost:8000/covariances?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch covariances");
  return res.json();
}

export async function fetchBeta(
  stocks: string[],
  range: string = "1M",
  benchmark: string | null = null // null for local benchmark
) {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  if (benchmark) {
    params.append("benchmark", benchmark); // only send if custom
  }

  const res = await fetch(`http://localhost:8000/beta?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch beta");
  return res.json();
}

export async function fetchSharpeSortino(stocks: string[], range: string = "1M") {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  const res = await fetch(`http://localhost:8000/sharpesortino?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch Sharpe & Sortino");
  return res.json(); // expect { sharpe: {...}, sortino: {...} }
}

/* --- NEW --- */
export async function fetchMaxDrawdown(stocks: string[], range: string = "1M") {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  const res = await fetch(`http://localhost:8000/max_drawdown?${params.toString()}`)
  if (!res.ok) throw new Error("Failed to fetch max drawdown");
  return res.json(); // expect { max_drawdown: { TICKER: value, ... } }
}

export async function fetchRollingDrawdown(stocks: string[], range: string = "1M") {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  params.append("range", range);

  const res = await fetch(`http://localhost:8000/rolling_drawdown?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch rolling drawdown");
  return res.json(); // expect { rolling_drawdown: { TICKER: [{date, drawdown}, ...], ... } }
}

/* --- NEW: Fetch portfolio-level metrics --- */
export async function fetchPortfolioMetrics(
  stocks: string[],
  weights: number[],
  range: string = "1Y",
  rolling: string[] = ["30d"]
) {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  weights.forEach((w) => params.append("weights", w.toString()));
  params.append("range", range);
  rolling.forEach((r) => params.append("rolling", r));

  const res = await fetch(`http://localhost:8000/portfolio_metrics?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch portfolio metrics");
  return res.json(); // expect { portfolio_metrics: {...}, range_used: ..., rolling_used: ... }
}

/* --- NEW: Generate AI summary (streaming) --- */
export async function streamAISummary(
  metrics: {
    avgVol: number;
    avgRet: number;
    max_drawdown: number;
    sharpe: number;
    sortino: number;
  },
  signal: AbortSignal,
  onChunk: (text: string) => void
) {
  const res = await fetch("http://localhost:8000/generate_summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metrics),
    signal, // ✅ integrates with your AbortController
  });

  if (!res.ok) throw new Error("Failed to generate AI summary");

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}


/* --- NEW: Fetch portfolio volatility only --- */
export async function fetchPortfolioVolatility(
  stocks: string[],
  weights: number[],
  range: string = "1Y",
  rolling: string[] = ["30d"]
) {
  const params = new URLSearchParams();
  stocks.forEach((s) => params.append("stocks", s));
  weights.forEach((w) => params.append("weights", w.toString()));
  params.append("range", range);
  rolling.forEach((r) => params.append("rolling", r));

  const res = await fetch(`http://localhost:8000/portfolio_metrics?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch portfolio volatility");

  const data = await res.json();
  return data.portfolio_metrics.vol; // just return the volatility series
}

