from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class PredictRequest(BaseModel):
    """Supports both single and batch predictions in one endpoint."""

    features: dict[str, float] | None = Field(
        default=None,
        description="Single prediction payload: feature_name -> value",
        examples=[{"sqft": 1200.0, "bedrooms": 3.0, "bathrooms": 2.0}],
    )
    instances: list[dict[str, float]] | None = Field(
        default=None,
        description="Batch prediction payload: list of feature dictionaries",
        examples=[
            [
                {"sqft": 1200.0, "bedrooms": 3.0, "bathrooms": 2.0},
                {"sqft": 1700.0, "bedrooms": 4.0, "bathrooms": 3.0},
            ]
        ],
    )

    @model_validator(mode="after")
    def validate_one_of_features_or_instances(self) -> "PredictRequest":
        if self.features is None and self.instances is None:
            raise ValueError("Provide either 'features' or 'instances'.")
        if self.features is not None and self.instances is not None:
            raise ValueError("Provide only one of 'features' or 'instances', not both.")
        return self


class PredictResponse(BaseModel):
    predictions: list[float]


class ModelInfoResponse(BaseModel):
    model_type: str
    feature_names: list[str]
    coefficients: list[float]
    intercept: float
    metrics: dict[str, float]
    trained_at: str
    training_source: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    details: dict[str, Any]
