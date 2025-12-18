from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from utils.helpers import get_calendar_cutoff
from services.clustering import cluster_matrix
from services.stocks import fetch_stock_data

router = APIRouter()

# ----- Covariances Endpoint -----
@router.get("/covariances")
def get_covariances(
    stocks: list[str] = Query(...),
    range: str = Query("1Y")
):
    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna()
    calendar_cutoff = get_calendar_cutoff(range, returns)

    returns_sliced = returns.loc[returns.index >= calendar_cutoff]
    covariances, cov_labels = cluster_matrix(returns_sliced.cov())
    return JSONResponse(
        content={
            "covariances": covariances.fillna(0).to_dict(),
            "covariance_labels": cov_labels,
            "range_used": range,
        }
    )