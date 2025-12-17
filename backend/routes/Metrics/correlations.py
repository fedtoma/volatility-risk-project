from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from backend.utils.helpers import get_calendar_cutoff
from backend.services.clustering import cluster_matrix
from backend.services.stocks import fetch_stock_data

router = APIRouter()

# ----- Correlations Endpoint -----
@router.get("/correlations")
def get_correlations(
    stocks: list[str] = Query(...),
    range: str = Query("1Y")
):
    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna()
    calendar_cutoff = get_calendar_cutoff(range, returns)

    returns_sliced = returns.loc[returns.index >= calendar_cutoff]
    correlations, corr_labels = cluster_matrix(returns_sliced.corr())
    return JSONResponse(
        content={
            "correlations": correlations.fillna(0).to_dict(),
            "correlation_labels": corr_labels,
            "range_used": range,
        }
    )