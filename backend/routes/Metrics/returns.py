from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from backend.utils.helpers import convert_timestamps, get_calendar_cutoff
from backend.services.stocks import fetch_stock_data

router = APIRouter()

# ----- Returns Endpoint -----
@router.get("/returns")
def get_returns(
    stocks: list[str] = Query(...),
    range: str = Query("1Y")
):
    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna() * 100
    calendar_cutoff = get_calendar_cutoff(range, returns)

    returns_sliced = returns.loc[returns.index >= calendar_cutoff]

    return JSONResponse(content={"returns": convert_timestamps(returns_sliced).fillna(0).to_dict(), "range_used": range})