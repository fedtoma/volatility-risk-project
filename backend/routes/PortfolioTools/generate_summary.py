from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llama_cpp import Llama
import asyncio
import logging
import time

router = APIRouter()
logger = logging.getLogger(__name__)

_model_instance = None
_model_lock = asyncio.Lock()

def get_model():
    global _model_instance
    if _model_instance is None:
        model_path = Path("models/llama-2-13b-ensemble-v5.Q4_K_M.gguf")
        logger.info(
            "Loading Llama model | path=%s | n_threads=%d | n_ctx=%d | temperature=%s",
            str(model_path), 4, 2048, 0
        )
        try:
            _model_instance = Llama(
                model_path=str(model_path),
                n_threads=4,
                temperature=0,
                n_ctx=2048,
                verbose=False
            )
            logger.info("Llama model loaded successfully | path=%s", str(model_path))
        except Exception:
            logger.exception("Failed to load Llama model | path=%s", str(model_path))
            raise
    return _model_instance

class PortfolioMetrics(BaseModel):
    avgVol: float
    avgRet: float
    max_drawdown: float
    sharpe: float
    sortino: float

@router.post("/generate_summary")
async def generate_summary(metrics: PortfolioMetrics, request: Request):
    logger.info(
        "POST /generate_summary received | avgVol=%s | avgRet=%s | max_drawdown=%s | sharpe=%s | sortino=%s",
        metrics.avgVol, metrics.avgRet, metrics.max_drawdown, metrics.sharpe, metrics.sortino
    )

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

    logger.debug("Prompt built | chars=%d", len(base_prompt))

    model = get_model()

    async def token_stream():
        started = time.perf_counter()
        bytes_sent = 0
        chunks_sent = 0

        logger.info("Starting streaming generation")

        try:
            async with _model_lock:
                logger.debug("Model lock acquired")
                for out in model(
                    prompt=base_prompt,
                    max_tokens=200,
                    stream=True,
                ):
                    if await request.is_disconnected():
                        logger.info(
                            "Client disconnected — stopping generation | chunks_sent=%d | bytes_sent=%d",
                            chunks_sent, bytes_sent
                        )
                        break

                    chunk = out["choices"][0]["text"]
                    if chunk:
                        encoded_len = len(chunk.encode("utf-8", errors="ignore"))
                        bytes_sent += encoded_len
                        chunks_sent += 1

                        if chunks_sent == 1:
                            logger.info("First chunk produced | first_chunk_bytes=%d", encoded_len)

                        yield chunk

        except Exception:
            logger.exception(
                "Streaming error | chunks_sent=%d | bytes_sent=%d",
                chunks_sent, bytes_sent
            )
            yield "AI failed to generate summary."
        finally:
            elapsed = time.perf_counter() - started
            logger.info(
                "Streaming generation finished | chunks_sent=%d | bytes_sent=%d | elapsed=%.3fs",
                chunks_sent, bytes_sent, elapsed
            )

    return StreamingResponse(token_stream(), media_type="text/plain")
