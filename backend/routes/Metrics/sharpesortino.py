from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np
from backend.utils.helpers import get_calendar_cutoff
from backend.services.stocks import fetch_stock_data

router = APIRouter()

# ----- Sharpe & Sortino Endpoint -----
@router.get("/sharpesortino")
def get_sharpe_sortino(
    stocks: list[str] = Query(...),
    range: str = Query("1Y"),
    risk_free: float = Query(0.0)  # annualized risk-free rate (default 0)
):
    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna()

    calendar_cutoff = get_calendar_cutoff(range, returns)
    returns_sliced = returns.loc[returns.index >= calendar_cutoff]

    sharpe_ratios = {}
    sortino_ratios = {}

    for col in returns_sliced.columns:
        rets = returns_sliced[col]

        excess = rets - (risk_free / len(returns_sliced))

        mean_ret = excess.mean()
        std_dev = excess.std()

        downside = excess[excess < 0]
        downside_std = downside.std() if not downside.empty else np.nan

        sharpe = mean_ret / std_dev if std_dev > 0 else None
        sortino = mean_ret / downside_std if downside_std > 0 else None

        sharpe_ratios[col] = sharpe
        sortino_ratios[col] = sortino

    return JSONResponse(
        content={
            "sharpe": sharpe_ratios,
            "sortino": sortino_ratios,
            "range_used": range,
            "risk_free": risk_free,
        }
    )
