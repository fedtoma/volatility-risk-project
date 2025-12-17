import pandas as pd

def convert_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    df_copy = df.copy()
    if not isinstance(df_copy.index, pd.DatetimeIndex):
        df_copy.index = pd.to_datetime(df_copy.index, errors="coerce")
    df_copy.index = df_copy.index.map(lambda x: x.strftime("%Y-%m-%d"))
    return df_copy

ROLLING_WINDOWS = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "252d": 252,
}

def get_calendar_cutoff(range: str, returns: pd.DataFrame) -> pd.Timestamp:
    today = pd.Timestamp.today().normalize()

    if range == "All":
        calendar_cutoff = returns.index[0]
    elif range == "YTD":
        calendar_cutoff = pd.Timestamp(today.year, 1, 1)
    elif range == "1M":
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
        calendar_cutoff = returns.index[0]

    return calendar_cutoff

LOCAL_BENCHMARKS = {
    # United States
    "NYSE": "^GSPC",
    "NYQ": "^GSPC",  # alias for NYSE
    "NASDAQ": "^GSPC",
    "NMS": "^GSPC",  # alias for NASDAQ
    "AMEX": "^GSPC",
    "ASQ": "^GSPC",  # alias for AMEX

    # United Kingdom
    "LSE": "^FTSE",         # FTSE 100

    # Japan
    "TSE": "^N225",         # Nikkei 225

    # Hong Kong
    "HKEX": "^HSI",         # Hang Seng Index

    # Germany
    "FWB": "^GDAXI",        # DAX

    # France
    "EPA": "^FCHI",         # CAC 40

    # Canada
    "TSX": "^GSPTSE",       # S&P/TSX Composite

    # Australia
    "ASX": "^AXJO",         # ASX 200

    # China
    "SSE": "000001.SS",     # SSE Composite
    "SZSE": "399001.SZ",   # Shenzhen Composite

    # India
    "BSE": "^BSESN",        # BSE Sensex
    "NSE": "^NSEI",         # NSE Nifty 50

    # Brazil
    "B3": "^BVSP",          # Bovespa

    # South Korea
    "KRX": "^KS11",         # KOSPI

    # Singapore
    "SGX": "^STI",          # Straits Times Index

    # Switzerland
    "SIX": "^SSMI",         # Swiss Market Index

    # Russia
    "MOEX": "IMOEX.ME",     # MOEX Russia Index

    # South Africa
    "JSE": "^J203.JO",      # FTSE/JSE Top 40

    # Add more exchanges as needed
}

ALLOWED_BENCHMARKS = {
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "FTSE 100": "^FTSE",
    "DAX": "^GDAXI",
    "Nikkei 225": "^N225"
}
