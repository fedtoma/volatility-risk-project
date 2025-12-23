from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import numpy as np
import logging

from utils.helpers import convert_timestamps, ROLLING_WINDOWS, get_calendar_cutoff
from services.stocks import fetch_stock_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/portfolio_metrics")
def get_portfolio_metrics(
    stocks: list[str] = Query(...),
    weights: list[float] = Query(...),
    range: str = Query("1Y"),
    rolling: list[str] = Query(["30d"])
):
    logger.info(
        "GET /portfolio_metrics | stocks=%s | weights=%s | range=%s | rolling=%s",
        stocks, weights, range, rolling
    )

    if len(stocks) != len(weights):
        logger.warning(
            "Validation failed: len(stocks) != len(weights) | len(stocks)=%d | len(weights)=%d",
            len(stocks), len(weights)
        )
        return JSONResponse(
            content={"error": "Length of stocks and weights must match."},
            status_code=400,
        )

    weights = np.array(weights)
    weights_sum = float(weights.sum())
    if weights_sum == 0:
        logger.warning("Validation failed: weights sum to 0 | weights=%s", weights.tolist())
        return JSONResponse(
            content={"error": "Weights must not all be zero."},
            status_code=400,
        )

    weights = weights / weights_sum
    logger.debug("Weights normalized | weights=%s", weights.tolist())

    try:
        prices = fetch_stock_data(stocks)
        logger.info("Fetched stock prices | rows=%d | cols=%d", prices.shape[0], prices.shape[1])
    except Exception:
        logger.exception("Failed to fetch stock data | stocks=%s", stocks)
        return JSONResponse(
            content={"error": "Failed to fetch stock data."},
            status_code=500,
        )

    returns = prices.pct_change().dropna()
    logger.info("Computed returns | rows=%d", len(returns))

    try:
        max_roll_days = max(ROLLING_WINDOWS[r] for r in rolling)
    except KeyError as e:
        logger.warning("Invalid rolling window key | rolling=%s | missing=%s", rolling, str(e))
        return JSONResponse(
            content={"error": f"Invalid rolling window: {str(e)}"},
            status_code=400,
        )

    logger.debug("Max rolling days | max_roll_days=%d", max_roll_days)

    calendar_cutoff = get_calendar_cutoff(range, returns)
    if calendar_cutoff is not None:
        cutoff_idx = returns.index.searchsorted(calendar_cutoff)
        extended_idx = max(0, cutoff_idx - max_roll_days)
        extended_cutoff = returns.index[extended_idx]
        returns = returns.loc[returns.index >= extended_cutoff]

        logger.info(
            "Applied calendar cutoff | range=%s | cutoff=%s | extended_cutoff=%s | kept_rows=%d",
            range, calendar_cutoff, extended_cutoff, len(returns)
        )
    else:
        logger.info("No calendar cutoff applied | range=%s | rows=%d", range, len(returns))

    portfolio_returns = (returns * weights).sum(axis=1)
    logger.info("Computed portfolio returns | rows=%d", len(portfolio_returns))

    portfolio_vol = {}
    for roll in rolling:
        roll_days = ROLLING_WINDOWS[roll]
        vol_series = portfolio_returns.rolling(window=roll_days).std() * np.sqrt(252) * 100
        if calendar_cutoff is not None:
            vol_series = vol_series.loc[vol_series.index >= calendar_cutoff]

        portfolio_vol[roll] = convert_timestamps(vol_series.fillna(0)).to_dict()
        logger.debug(
            "Vol computed | roll=%s | roll_days=%d | points=%d",
            roll, roll_days, len(vol_series)
        )

    if calendar_cutoff is not None:
        portfolio_returns = portfolio_returns.loc[portfolio_returns.index >= calendar_cutoff]

    portfolio_returns_dict = (convert_timestamps(portfolio_returns).fillna(0) * 100).to_dict()

    cumulative = (1 + portfolio_returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    portfolio_max_dd = float(drawdown.min()) * 100

    mean_return = portfolio_returns.mean() * 252
    vol = portfolio_returns.std() * np.sqrt(252)
    portfolio_sharpe = float(mean_return / vol) if vol > 0 else None

    downside_returns = portfolio_returns[portfolio_returns < 0]
    downside_vol = downside_returns.std() * np.sqrt(252)
    portfolio_sortino = float(mean_return / downside_vol) if downside_vol > 0 else None

    logger.info(
        "Risk metrics computed | max_dd=%.4f | sharpe=%s | sortino=%s",
        portfolio_max_dd, portfolio_sharpe, portfolio_sortino
    )

    return JSONResponse(
        content={
            "portfolio_metrics": {
                "vol": portfolio_vol,
                "returns": portfolio_returns_dict,
                "max_drawdown": portfolio_max_dd,
                "sharpe": portfolio_sharpe,
                "sortino": portfolio_sortino,
            },
            "range_used": range,
            "rolling_used": rolling,
        }
    )
