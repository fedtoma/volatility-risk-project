from typing import Dict
import numpy as np

def flatten_volatility(volatility: dict) -> float:
    """
    Extract the latest volatility value from the single rolling window.
    Input shape:
        { "30d": {date: float, ...} }
    Output:
        float (latest value)
    """
    if not volatility:
        return 0.0  # or None, depending on your needs

    # Get the only window (e.g. "30d")
    (roll, ts_data), = volatility.items()

    if not ts_data:
        return 0.0

    # Latest date
    last_date = max(ts_data.keys())
    return ts_data[last_date]


def flatten_returns(returns: Dict) -> Dict[str, Dict[str, float]]:
    """
    Convert returns time series into snapshot { "AAPL": {"1M": 3.5}, ... }.
    Uses latest available date.
    """
    flat = {}
    if not returns:
        return flat
    last_date = max(returns.keys())
    for stock, value in returns[last_date].items():
        flat[stock] = {"return": value}
    return flat


def compute_overall(vol: Dict[str, Dict[str, float]],
                    returns: Dict[str, Dict[str, float]],
                    sharpe: Dict[str, float],
                    sortino: Dict[str, float],
                    max_drawdown: Dict[str, float]) -> Dict[str, float]:
    """
    Aggregate per-stock metrics into portfolio averages.
    """
    # Volatility: average across stocks for each rolling window
    overall_vol = {
        roll: np.mean([vals[roll] for vals in vol.values() if roll in vals])
        for roll in {r for vals in vol.values() for r in vals}
    }

    # Returns: average across stocks
    overall_returns = {
        k: np.mean([vals[k] for vals in returns.values() if k in vals])
        for k in {r for vals in returns.values() for r in vals}
    }

    overall_sharpe = float(np.mean(list(sharpe.values()))) if sharpe else 0.0
    overall_sortino = float(np.mean(list(sortino.values()))) if sortino else 0.0
    overall_max_dd = float(np.mean(list(max_drawdown.values()))) if max_drawdown else 0.0

    return {
        "vol": overall_vol,
        "returns": overall_returns,
        "sharpe": overall_sharpe,
        "sortino": overall_sortino,
        "max_drawdown": overall_max_dd,
    }
