from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.model_service import HousingPriceModelService
from app.schemas import HealthResponse, ModelInfoResponse, PredictRequest, PredictResponse


service = HousingPriceModelService()


@asynccontextmanager
async def lifespan(_: FastAPI):
    service.initialize()
    yield


app = FastAPI(
    title="Housing Price Prediction API",
    version="1.0.0",
    description="Simple regression API for housing price prediction.",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if service.is_ready() else "initializing",
        model_loaded=service.is_ready(),
        details=service.health_details(),
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["model"])
def model_info() -> ModelInfoResponse:
    try:
        return ModelInfoResponse(**service.model_info())
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/predict", response_model=PredictResponse, tags=["model"])
def predict(payload: PredictRequest) -> PredictResponse:
    records = [payload.features] if payload.features is not None else payload.instances
    if records is None:
        raise HTTPException(status_code=422, detail="No prediction payload provided.")

    try:
        predictions = service.predict(records)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return PredictResponse(predictions=predictions)
