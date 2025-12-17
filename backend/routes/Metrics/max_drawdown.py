from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from backend.utils.helpers import get_calendar_cutoff
from backend.services.stocks import fetch_stock_data

router = APIRouter()

# ----- Max Drawdown Endpoint -----
@router.get("/max_drawdown")
def get_max_drawdown(
    stocks: list[str] = Query(...),
    range: str = Query("1Y")
):
    prices = fetch_stock_data(stocks)
    calendar_cutoff = get_calendar_cutoff(range, prices)
    prices_sliced = prices.loc[prices.index >= calendar_cutoff]

    max_drawdown = {}
    for stock in stocks:
        series = prices_sliced[stock].dropna()
        peak = series.expanding(min_periods=1).max()
        drawdown = (series - peak) / peak
        max_drawdown[stock] = drawdown.min()  # most negative value = max drawdown

    return JSONResponse(content={"max_drawdown": max_drawdown, "range_used": range})


