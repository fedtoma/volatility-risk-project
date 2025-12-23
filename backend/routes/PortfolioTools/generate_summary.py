from pathlib import Path
from typing import Dict
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llama_cpp import Llama
import asyncio

router = APIRouter()

# ----------------------------
# Lazy-load Llama model
# ----------------------------
_model_instance = None
_model_lock = asyncio.Lock()  # global lock

def get_model():
    global _model_instance
    if _model_instance is None:
        model_path = Path("models/llama-2-13b-ensemble-v5.Q4_K_M.gguf")
        _model_instance = Llama(
            model_path=str(model_path),
            n_threads=4,
            temperature=0,
            n_ctx=2048
        )
    return _model_instance

# ----------------------------
# Pydantic model for input
# ----------------------------
class PortfolioMetrics(BaseModel):
    avgVol: float       # already averaged
    avgRet: float   # already averaged
    max_drawdown: float
    sharpe: float
    sortino: float

# ----------------------------
# FastAPI endpoint
# ----------------------------
@router.post("/generate_summary")
async def generate_summary(metrics: PortfolioMetrics, request: Request):
    print(metrics)

    base_prompt = f"""
    Write a short paragraph describing the overall risk and performance of this portfolio in simple, easy-to-understand language. 
    Do not use any technical terms or metrics like Sharpe Ratio or Sortino Ratio. 
    Do not add notes, explanations, or extra commentary under any circumstances. 
    Focus only on whether the portfolio is stable, risky, high-performing, or low-performing.

    Volatility: {metrics.avgVol}
    Returns: {metrics.avgRet}
    Max Drawdown: {metrics.max_drawdown}
    Sharpe Ratio: {metrics.sharpe}
    Sortino Ratio: {metrics.sortino}
    """

    model = get_model()

    async def token_stream():
        try:
            async with _model_lock:
                for out in model(
                        prompt=base_prompt,
                        max_tokens=200,
                        stream=True,
                ):
                    if await request.is_disconnected():
                        print("Client disconnected — stopping generation")
                        break
                    chunk = out["choices"][0]["text"]
                    if chunk:
                        yield chunk
        except Exception as e:
            print("Streaming error:", e)
            yield "AI failed to generate summary."

    return StreamingResponse(token_stream(), media_type="text/plain")
