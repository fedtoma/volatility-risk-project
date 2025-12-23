import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import requests

from routes.PortfolioTools import search


@pytest.fixture()
def client():
    # Create a minimal FastAPI app and register the search router
    app = FastAPI()
    app.include_router(search.router)
    return TestClient(app)


class DummyResponse:
    # Lightweight fake Response object to mimic requests.Response
    def __init__(self, json_data=None, status_code=200, raise_for_status_exc=None, json_exc=None):
        self._json_data = json_data
        self.status_code = status_code
        self._raise_for_status_exc = raise_for_status_exc
        self._json_exc = json_exc

    def raise_for_status(self):
        # Simulate HTTP error responses
        if self._raise_for_status_exc:
            raise self._raise_for_status_exc

    def json(self):
        # Simulate invalid JSON responses
        if self._json_exc:
            raise self._json_exc
        return self._json_data


def test_search_success_maps_fields(client, monkeypatch):
    # Tests the happy path:
    # - Yahoo returns valid data
    # - Fields are mapped correctly into the API response

    def fake_get(url, params=None, headers=None, timeout=None):
        assert url == "https://query2.finance.yahoo.com/v1/finance/search"
        assert params["q"] == "msft"
        assert params["quotesCount"] == 10
        assert params["newsCount"] == 0
        assert timeout == search.TIMEOUT_SECONDS

        return DummyResponse(
            json_data={
                "quotes": [
                    {
                        "symbol": "MSFT",
                        "shortname": "Microsoft Corporation",
                        "exchange": "NMS",
                        "quoteType": "EQUITY",
                    }
                ]
            }
        )

    monkeypatch.setattr(search.requests, "get", fake_get)

    r = client.get("/search", params={"query": "msft"})
    assert r.status_code == 200

    body = r.json()
    assert body == {
        "results": [
            {
                "symbol": "MSFT",
                "shortname": "Microsoft Corporation",
                "exchange": "NMS",
                "type": "EQUITY",
            }
        ]
    }


def test_search_returns_empty_results_when_no_quotes(client, monkeypatch):
    # Tests that an empty Yahoo response still returns a valid API shape

    def fake_get(url, params=None, headers=None, timeout=None):
        return DummyResponse(json_data={})

    monkeypatch.setattr(search.requests, "get", fake_get)

    r = client.get("/search", params={"query": "nothing"})
    assert r.status_code == 200
    assert r.json() == {"results": []}


def test_search_upstream_http_error_returns_502(client, monkeypatch):
    # Tests handling of non-2xx HTTP responses from Yahoo

    http_err = requests.HTTPError("503 Service Unavailable")

    def fake_get(url, params=None, headers=None, timeout=None):
        return DummyResponse(raise_for_status_exc=http_err)

    monkeypatch.setattr(search.requests, "get", fake_get)

    r = client.get("/search", params={"query": "msft"})
    assert r.status_code == 502
    assert "Upstream request failed" in r.json()["detail"]


def test_search_request_exception_returns_502(client, monkeypatch):
    # Tests network-level failures (timeouts, connection errors)

    def fake_get(url, params=None, headers=None, timeout=None):
        raise requests.Timeout("request timed out")

    monkeypatch.setattr(search.requests, "get", fake_get)

    r = client.get("/search", params={"query": "msft"})
    assert r.status_code == 502
    assert "Upstream request failed" in r.json()["detail"]


def test_search_invalid_json_returns_502(client, monkeypatch):
    # Tests when Yahoo returns malformed / non-JSON responses

    def fake_get(url, params=None, headers=None, timeout=None):
        return DummyResponse(json_exc=ValueError("invalid json"))

    monkeypatch.setattr(search.requests, "get", fake_get)

    r = client.get("/search", params={"query": "msft"})
    assert r.status_code == 502
    assert r.json()["detail"] == "Upstream returned invalid JSON"


def test_search_validation_missing_query_returns_422(client):
    # Tests FastAPI validation: missing required query parameter

    r = client.get("/search")
    assert r.status_code == 422


def test_search_validation_empty_query_returns_422(client):
    # Tests FastAPI validation: empty string not allowed

    r = client.get("/search", params={"query": ""})
    assert r.status_code == 422


def test_search_validation_too_long_query_returns_422(client):
    # Tests FastAPI validation: query length > max_length

    r = client.get("/search", params={"query": "a" * 51})
    assert r.status_code == 422
