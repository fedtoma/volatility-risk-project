from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from backend.utils.helpers import convert_timestamps, ROLLING_WINDOWS, get_calendar_cutoff
from backend.services.stocks import fetch_stock_data
import numpy as np

router = APIRouter()


# ----- Volatility Endpoint -----
@router.get("/volatility")
def get_volatility(
        stocks: list[str] = Query(...),
        range: str = Query("1Y"),
        rolling: list[str] = Query(["30d"])
):
    invalid = [r for r in rolling if r not in ROLLING_WINDOWS]
    if invalid:
        return JSONResponse(
            content={"error": f"Invalid rolling window(s): {invalid}"},
            status_code=400,
        )

    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna()
    calendar_cutoff = get_calendar_cutoff(range, returns)

    vol_results = {}
    for roll in rolling:
        N = ROLLING_WINDOWS[roll]
        vol = returns.rolling(window=N).std() * np.sqrt(252) * 100
        if calendar_cutoff is not None:
            vol = vol.loc[vol.index >= calendar_cutoff]  # slice by calendar days
        vol_results[roll] = convert_timestamps(vol.fillna(0)).to_dict()

    print(vol_results)

    return JSONResponse(content={"volatility": vol_results, "range_used": range, "rolling_used": rolling})
