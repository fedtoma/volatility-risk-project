from fastapi import APIRouter, HTTPException, Query
import requests
from requests.exceptions import RequestException
import logging

# Create a router so this endpoint can be included in the main FastAPI app
router = APIRouter()
# Module-level logger (best practice: one logger per module)
logger = logging.getLogger(__name__)

# Timeout for the upstream Yahoo Finance request (seconds)
TIMEOUT_SECONDS = 5

@router.get("/search")
def search_ticker(
        # Required query parameter with validation:
        # - must be present
        # - at least 1 character
        # - no more than 50 characters
        query: str = Query(..., min_length=1, max_length=50)
):
    query = query.strip()  # Removes whitespace at start and end
    # Don't trust frontend to validate empty inputs ("   "), enforce in backend
    if not query:
        raise HTTPException(status_code=422, detail="Query must not be blank")

    logger.info("GET /search | query=%s", query)

    # Yahoo Finance search endpoint
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    # Query parameters sent to Yahoo
    params = {"q": query, "quotesCount": 10, "newsCount": 0}
    # Basic User-Agent header to avoid being blocked by Yahoo
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        logger.debug("Calling Yahoo Finance search API")

        # Perform HTTP request to Yahoo Finance
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=TIMEOUT_SECONDS
        )

        # Raise an exception for non-2xx HTTP responses
        response.raise_for_status()
        data = response.json()
    except RequestException as e:
        # Catches:
        # - network errors
        # - timeouts
        # - non-2xx responses raised by raise_for_status()
        logger.error("Yahoo Finance request failed", exc_info=True)
        # Translate upstream failure into a 502 Bad Gateway
        raise HTTPException(
            status_code=502,
            detail="Upstream request failed"
        )
    except ValueError:
        # JSON decoding failed (invalid / malformed JSON)
        logger.error("Yahoo Finance returned invalid JSON", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Upstream returned invalid JSON",
        )

    # Extract quotes list from Yahoo response
    # If "quotes" is missing, default to an empty list
    quotes = data.get("quotes", [])

    # Prepare a cleaned and normalized list of search results
    cleaned = []
    for r in quotes:
        # Extract the stock symbol (required field for frontend)
        symbol = r.get("symbol")
        if not symbol:
            continue
        cleaned.append({
            "symbol": symbol,
            # Human-readable name of the stock
            # Fall back through possible fields to maximise coverage
            "shortname": r.get("shortname") or r.get("longname") or r.get("name") or "",
            # Exchange where the stock is traded
            # Use display-friendly value if available
            "exchange": r.get("exchange") or r.get("exchDisp"),
            # Yahoo quote type (e.g. EQUITY, ETF, INDEX)
            "type": r.get("quoteType"),
        })

    return {"results": cleaned}

