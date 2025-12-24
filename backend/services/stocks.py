import yfinance as yf
import pandas as pd
import pickle, os

CACHE_FILE = "stock_cache.pkl"
CACHE_EXPIRY_DAYS = 1

# Load cache from disk if it exists, otherwise start fresh
if os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "rb") as f:
        STOCK_CACHE = pickle.load(f)
else:
    STOCK_CACHE = {}

def fetch_stock_data(tickers: list[str]) -> pd.DataFrame:
    today = pd.Timestamp.today()
    tickers_to_fetch = []  # Track which tickers need fresh data

    # Decide whether each ticker should be fetched
    for t in tickers:
        # Fetch if:
        # - ticker not cached, OR
        # - cached data is older than CACHE_EXPIRY_DAYS
        if t not in STOCK_CACHE or today - STOCK_CACHE[t]["last_updated"] > pd.Timedelta(days=CACHE_EXPIRY_DAYS):
            tickers_to_fetch.append(t)

    # Fetch missing / expired tickers in one yfinance call
    if tickers_to_fetch:
        fetched = yf.download(
            tickers_to_fetch, period="max", interval="1d",
            auto_adjust=True, progress=False, threads=True
        )

        # Store Close price series for each fetched ticker in cache
        for t in tickers_to_fetch:
            STOCK_CACHE[t] = {
                # Assumes fetched has a MultiIndex and contains Close data
                "data": fetched["Close"][t].dropna(),
                "last_updated": today
            }

        # Persist updated cache to disk
        with open(CACHE_FILE, "wb") as f:
            pickle.dump(STOCK_CACHE, f)

    combined = pd.concat([STOCK_CACHE[t]["data"] for t in tickers], axis=1)
    combined.columns = tickers  # Ensure column names match input tickers
    return combined

def get_stock_exchange(ticker: str) -> str:
    info = yf.Ticker(ticker).info  # Retrieve metadata for the ticker from yfinance

    # Validate that exchange information exists
    if "exchange" not in info or info["exchange"] is None:
        raise ValueError(f"Exchange not found for stock {ticker}")
    return info["exchange"]
