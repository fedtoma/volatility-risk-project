from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from utils.helpers import get_calendar_cutoff, LOCAL_BENCHMARKS, ALLOWED_BENCHMARKS
from services.stocks import fetch_stock_data, get_stock_exchange
import numpy as np

router = APIRouter()

@router.get("/beta")
def get_beta(
    stocks: list[str] = Query(...),
    range: str = Query("1Y"),
    benchmark: str | None = Query(None)  # optional custom benchmark
):

    if not stocks:
        return JSONResponse(content={"error": "No stocks provided"}, status_code=400)

    # Determine the benchmark for each stock
    benchmarks = {}
    for stock in stocks:
        if not benchmark:
            # Use local benchmark per exchange
            exchange = get_stock_exchange(stock)
            benchmarks[stock] = LOCAL_BENCHMARKS[exchange]
        else:
            # Validate custom benchmark
            if benchmark not in ALLOWED_BENCHMARKS:
                return JSONResponse(
                    content={"error": f"Invalid benchmark '{benchmark}'"},
                    status_code=400
                )
            # Use the same custom benchmark for all stocks
            benchmarks[stock] = ALLOWED_BENCHMARKS[benchmark]

    # Create unique tickers list (stocks + benchmarks)
    all_tickers = list(set(stocks + list(benchmarks.values())))

    # Fetch stock prices
    prices = fetch_stock_data(all_tickers)

    # Calculate daily returns
    returns = prices.pct_change().dropna()

    # Apply calendar cutoff
    calendar_cutoff = get_calendar_cutoff(range, returns)
    if calendar_cutoff is not None:
        returns = returns.loc[returns.index >= calendar_cutoff]

    # Compute beta per stock vs its benchmark
    beta_results = {}
    for stock in stocks:
        stock_returns = returns[stock]
        benchmark_returns = returns[benchmarks[stock]]
        cov = np.cov(stock_returns, benchmark_returns)[0, 1]
        var_benchmark = np.var(benchmark_returns)
        beta_results[stock] = cov / var_benchmark

    return JSONResponse(content={
        "beta": beta_results,
        "range_used": range,
        "benchmarks": benchmarks
    })
