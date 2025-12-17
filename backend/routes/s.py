from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import yfinance as yf
import requests
from fastapi.responses import JSONResponse
import os
import pickle
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_FILE = "stock_cache.pkl"
CACHE_EXPIRY_DAYS = 1

# Load cache from disk if exists
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "rb") as f:
        STOCK_CACHE = pickle.load(f)
else:
    STOCK_CACHE = {}


@app.get("/search")
def search_ticker(query: str):
    """
    Search Yahoo Finance for tickers matching the query.
    Example: /search?query=Vodafone
    """
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    params = {"q": query, "quotesCount": 10, "newsCount": 0}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/114.0 Safari/537.36"
    }

    response = requests.get(url, params=params, headers=headers)
    if response.status_code != 200:
        return {"error": f"Failed to fetch from Yahoo Finance ({response.status_code})"}

    results = response.json().get("quotes", [])
    tickers = [
        {
            "symbol": r.get("symbol"),
            "shortname": r.get("shortname"),
            "exchange": r.get("exchange"),
            "type": r.get("quoteType"),
        }
        for r in results
    ]
    return {"results": tickers}


# Convert DataFrame index to ISO strings
def convert_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    df_copy = df.copy()
    if not isinstance(df_copy.index, pd.DatetimeIndex):
        df_copy.index = pd.to_datetime(df_copy.index, errors="coerce")
    df_copy.index = df_copy.index.map(lambda x: x.strftime("%Y-%m-%d"))
    return df_copy


# Allowed rolling windows (trading days)
ROLLING_WINDOWS = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "252d": 252,
}

# Fetch data with caching
def fetch_stock_data(tickers: list[str]) -> pd.DataFrame:
    today = pd.Timestamp.today()
    tickers_to_fetch = []

    for t in tickers:
        if t not in STOCK_CACHE:
            tickers_to_fetch.append(t)
        else:
            last_updated = STOCK_CACHE[t]["last_updated"]
            if today - last_updated > pd.Timedelta(days=CACHE_EXPIRY_DAYS):
                tickers_to_fetch.append(t)

    if tickers_to_fetch:
        fetched = yf.download(
            tickers_to_fetch, period="max", interval="1d",
            auto_adjust=True, progress=False, threads=True
        )

        for t in tickers_to_fetch:
            STOCK_CACHE[t] = {
                "data": fetched["Close"][t].dropna(),  # <-- key change
                "last_updated": today
            }

        with open(CACHE_FILE, "wb") as f:
            pickle.dump(STOCK_CACHE, f)

    combined = pd.concat([STOCK_CACHE[t]["data"] for t in tickers], axis=1)
    combined.columns = tickers
    return combined

def cluster_matrix(matrix: pd.DataFrame) -> (pd.DataFrame, list):
    """
    Perform hierarchical clustering on the matrix and reorder rows/columns.
    Returns the reordered matrix and list of labels in order.
    """
    if matrix.shape[0] <= 2:
        # Not enough stocks to cluster → return as-is
        return matrix, list(matrix.columns)

    # Convert correlation/covariance to distance
    if (matrix.values >= -1).all() and (matrix.values <= 1).all():
        # Looks like correlation
        dist = 1 - matrix
    else:
        # For covariance, larger = closer
        dist = matrix.max().max() - matrix

    # Convert to condensed form (upper triangle)
    dist_condensed = squareform(dist.values, checks=False)

    # Run clustering
    linkage_matrix = linkage(dist_condensed, method="average")
    leaf_order = leaves_list(linkage_matrix)

    # Reorder matrix
    reordered = matrix.iloc[leaf_order, leaf_order]
    labels_ordered = list(reordered.columns)
    return reordered, labels_ordered




@app.get("/risk_data")
def get_risk_data(
        stocks: list[str] = Query(...),
        range: str = Query("1Y"),
        rolling: list[str] = Query(["30d"])
):
    # Validate rolling windows
    invalid = [r for r in rolling if r not in ROLLING_WINDOWS]
    if invalid:
        return JSONResponse(
            content={"error": f"Invalid rolling window(s): {invalid}. Must be one of {list(ROLLING_WINDOWS.keys())}"},
            status_code=400,
        )

    prices = fetch_stock_data(stocks)
    returns = prices.pct_change().dropna()

    today = pd.Timestamp.today().normalize()

    # Calculate calendar-based cutoff
    if range == "All":
        calendar_cutoff = returns.index[0]  # take all available data
    elif range == "YTD":
        calendar_cutoff = pd.Timestamp(today.year, 1, 1)
    else:
        # Use DateOffset for calendar-accurate subtraction
        if range == "1M":
            calendar_cutoff = today - pd.DateOffset(months=1)
        elif range == "3M":
            calendar_cutoff = today - pd.DateOffset(months=3)
        elif range == "6M":
            calendar_cutoff = today - pd.DateOffset(months=6)
        elif range == "1Y":
            calendar_cutoff = today - pd.DateOffset(years=1)
        elif range == "3Y":
            calendar_cutoff = today - pd.DateOffset(years=3)
        else:
            calendar_cutoff = returns.index[0]  # fallback

    # Volatility
    vol_results = {}
    for roll in rolling:
        N = ROLLING_WINDOWS[roll]
        vol = returns.rolling(window=N).std() * np.sqrt(252) * 100
        if calendar_cutoff is not None:
            vol = vol.loc[vol.index >= calendar_cutoff]  # slice by calendar days
        vol_results[roll] = convert_timestamps(vol.fillna(0)).to_dict()

    if calendar_cutoff is not None:
        returns_sliced = returns.loc[returns.index >= calendar_cutoff]
    else:
        returns_sliced = returns

    correlations = returns_sliced.corr()
    covariances = returns_sliced.cov()

    correlations_reordered, corr_labels = cluster_matrix(correlations)
    covariances_reordered, cov_labels = cluster_matrix(covariances)

    return JSONResponse(
        content={
            "volatility": vol_results,
            "returns": convert_timestamps(returns_sliced.fillna(0)).to_dict(),
            "correlations": correlations_reordered.fillna(0).to_dict(),
            "correlation_labels": corr_labels,
            "covariances": covariances_reordered.fillna(0).to_dict(),
            "covariance_labels": cov_labels,
            "range_used": range,
            "rolling_used": rolling,
        }
    )