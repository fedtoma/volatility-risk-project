from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.PortfolioTools import portfolio_metrics, generate_summary, search
from routes.Metrics import volatility, correlations, rolling_drawdown, sharpesortino, covariances, max_drawdown, beta, \
    returns
from core.logging import setup_logging

setup_logging()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search.router, tags=["search"])
app.include_router(volatility.router, tags=["risk"])
app.include_router(returns.router, tags=["risk"])
app.include_router(correlations.router, tags=["risk"])
app.include_router(covariances.router, tags=["risk"])
app.include_router(beta.router, tags=["risk"])
app.include_router(sharpesortino.router, tags=["risk"])
app.include_router(max_drawdown.router, tags=["risk"])
app.include_router(rolling_drawdown.router, tags=["risk"])
app.include_router(generate_summary.router, tags=["risk"])
app.include_router(portfolio_metrics.router, tags=["risk"])
