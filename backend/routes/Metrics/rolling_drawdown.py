from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from backend.utils.helpers import get_calendar_cutoff, ROLLING_WINDOWS
from backend.services.stocks import fetch_stock_data

router = APIRouter()

# ----- Rolling Drawdown Endpoint -----
@router.get("/rolling_drawdown")
def get_rolling_drawdown(
    stocks: list[str] = Query(...),
    range: str = Query("1Y"),
    window: str = Query("30d")  # rolling window, default 30 days
):
    if window not in ROLLING_WINDOWS:
        return JSONResponse(
            content={"error": f"Invalid rolling window: {window}"},
            status_code=400
        )

    N = ROLLING_WINDOWS[window]  # convert "30d" -> integer rows

    prices = fetch_stock_data(stocks)
    calendar_cutoff = get_calendar_cutoff(range, prices)
    prices_sliced = prices.loc[prices.index >= calendar_cutoff]

    rolling_drawdown = {}
    for stock in stocks:
        series = prices_sliced[stock]
        rolling_peak = series.rolling(window=N, min_periods=1).max()
        drawdown = (series - rolling_peak) / rolling_peak
        drawdown = drawdown.fillna(0)  # <- fill NaNs to avoid JSON issues

        rolling_drawdown[stock] = [
            {"date": str(idx), "drawdown": float(dd)}
            for idx, dd in drawdown.items()
        ]

    return JSONResponse(
        content={"rolling_drawdown": rolling_drawdown, "range_used": range, "window": window}
    )
