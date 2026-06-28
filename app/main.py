from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.model_service import HousingPriceModelService
from app.logging_utils import configure_console_logger
from app.schemas import (
    HealthResponse,
    ModelInfoResponse,
    PredictRequest,
    PredictResponse,
    ValidateResponse,
)


service = HousingPriceModelService()
logger = configure_console_logger("houseprice.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting housing price model service")
    service.initialize()
    logger.info("Housing price model service ready")
    yield


app = FastAPI(
    title="Housing Price Prediction API",
    version="1.0.0",
    description="Simple regression API for housing price prediction.",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    logger.info("Health check requested")
    return HealthResponse(
        status="ok" if service.is_ready() else "initializing",
        model_loaded=service.is_ready(),
        details=service.health_details(),
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["model"])
def model_info() -> ModelInfoResponse:
    try:
        logger.info("Model info requested")
        return ModelInfoResponse(**service.model_info())
    except Exception as exc:  # pragma: no cover
        logger.exception("Model info request failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/predict", response_model=PredictResponse, tags=["model"])
def predict(payload: PredictRequest) -> PredictResponse:
    records = [payload.features] if payload.features is not None else payload.instances
    if records is None:
        raise HTTPException(status_code=422, detail="No prediction payload provided.")

    try:
        logger.info("Prediction requested for %s record(s)", len(records))
        predictions = service.predict(records)
    except ValueError as exc:
        logger.warning("Prediction rejected: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    logger.info("Prediction completed")
    return PredictResponse(predictions=predictions)


@app.get("/validate", response_model=ValidateResponse, tags=["model"])
def validate() -> ValidateResponse:
    try:
        logger.info("Validation requested")
        result = service.validate_from_csv()
        logger.info("Validation completed for %s rows", result.get("row_count", 0))
        return ValidateResponse(**result)
    except ValueError as exc:
        logger.warning("Validation rejected: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Validation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/retrain", response_model=ModelInfoResponse, tags=["model"])
def retrain() -> ModelInfoResponse:
    try:
        logger.info("Retrain requested")
        result = service.retrain()
        logger.info("Retrain completed")
        return ModelInfoResponse(**result)
    except ValueError as exc:
        logger.warning("Retrain rejected: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Retrain failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
