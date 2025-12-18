from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np
from utils.helpers import convert_timestamps, ROLLING_WINDOWS, get_calendar_cutoff
from services.stocks import fetch_stock_data

router = APIRouter()

# ----- Portfolio Metrics Endpoint -----
@router.get("/portfolio_metrics")
def get_portfolio_metrics(
    stocks: list[str] = Query(...),
    weights: list[float] = Query(...),
    range: str = Query("1Y"),
    rolling: list[str] = Query(["30d"])
):
    # Validate weights
    if len(stocks) != len(weights):
        return JSONResponse(
            content={"error": "Length of stocks and weights must match."},
            status_code=400,
        )

    weights = np.array(weights)
    weights = weights / weights.sum()  # normalize weights

    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna()

    # how many extra days needed for the largest rolling window
    max_roll_days = max(ROLLING_WINDOWS[r] for r in rolling)

    # determine cutoff and extend backwards
    calendar_cutoff = get_calendar_cutoff(range, returns)
    if calendar_cutoff is not None:
        cutoff_idx = returns.index.searchsorted(calendar_cutoff)
        extended_idx = max(0, cutoff_idx - max_roll_days)
        extended_cutoff = returns.index[extended_idx]
        returns = returns.loc[returns.index >= extended_cutoff]

    # ----- Portfolio-level returns (already multiplied by weights) -----
    portfolio_returns = (returns * weights).sum(axis=1)

    # ----- Build vol dictionary for *all* rolling windows -----
    portfolio_vol = {}
    for roll in rolling:
        roll_days = ROLLING_WINDOWS[roll]
        vol_series = portfolio_returns.rolling(window=roll_days).std() * np.sqrt(252) * 100
        if calendar_cutoff is not None:
            vol_series = vol_series.loc[vol_series.index >= calendar_cutoff]
        portfolio_vol[roll] = convert_timestamps(vol_series.fillna(0)).to_dict()

    # ----- Portfolio-level returns (multiply by 100, flat series) -----
    if calendar_cutoff is not None:
        portfolio_returns = portfolio_returns.loc[portfolio_returns.index >= calendar_cutoff]
    portfolio_returns_dict = (convert_timestamps(portfolio_returns).fillna(0) * 100).to_dict()

    # ----- Max Drawdown (multiply by 100) -----
    cumulative = (1 + portfolio_returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    portfolio_max_dd = float(drawdown.min()) * 100

    # ----- Sharpe -----
    mean_return = portfolio_returns.mean() * 252
    vol = portfolio_returns.std() * np.sqrt(252)
    portfolio_sharpe = float(mean_return / vol) if vol > 0 else None

    # ----- Sortino -----
    downside_returns = portfolio_returns[portfolio_returns < 0]
    downside_vol = downside_returns.std() * np.sqrt(252)
    portfolio_sortino = float(mean_return / downside_vol) if downside_vol > 0 else None

    # ----- Return JSON -----
    portfolio_metrics = {
        "vol": portfolio_vol,  # <-- now a dict of rollings
        "returns": portfolio_returns_dict,
        "max_drawdown": portfolio_max_dd,
        "sharpe": portfolio_sharpe,
        "sortino": portfolio_sortino,
    }

    return JSONResponse(
        content={
            "portfolio_metrics": portfolio_metrics,
            "range_used": range,
            "rolling_used": rolling,
        }
    )
