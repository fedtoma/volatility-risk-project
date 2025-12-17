from fastapi import APIRouter
import requests

router = APIRouter()

@router.get("/search")
def search_ticker(query: str):
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    params = {"q": query, "quotesCount": 10, "newsCount": 0}
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, params=params, headers=headers)
    if response.status_code != 200:
        return {"error": f"Failed to fetch from Yahoo Finance ({response.status_code})"}

    results = response.json().get("quotes", [])
    return {
        "results": [
            {
                "symbol": r.get("symbol"),
                "shortname": r.get("shortname"),
                "exchange": r.get("exchange"),
                "type": r.get("quoteType"),
            }
            for r in results
        ]
    }