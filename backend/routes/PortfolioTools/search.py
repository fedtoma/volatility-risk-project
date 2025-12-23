from fastapi import APIRouter, HTTPException, Query
import requests
from requests.exceptions import RequestException
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5

@router.get("/search")
def search_ticker(query: str = Query(..., min_length=1, max_length=50)):
    logger.info("GET /search | query=%s", query)

    url = "https://query2.finance.yahoo.com/v1/finance/search"
    params = {"q": query, "quotesCount": 10, "newsCount": 0}
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        logger.info("Calling Yahoo Finance search API")
        response = requests.get(url, params=params, headers=headers, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
    except RequestException as e:
        logger.error("Yahoo Finance request failed", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Upstream request failed: {e}",
        )
    except ValueError:
        logger.error("Yahoo Finance returned invalid JSON", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Upstream returned invalid JSON",
        )

    results = data.get("quotes", [])
    logger.info("Search completed", len(results))
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
