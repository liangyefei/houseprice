from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.datasets import make_regression
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


@dataclass
class TrainedArtifacts:
    model: LinearRegression
    feature_names: list[str]
    metrics: dict[str, float]
    trained_at: str
    training_source: str


class HousingPriceModelService:
    def __init__(self) -> None:
        self.dataset_path = self._resolve_path_with_fallbacks(
            os.getenv("DATASET_PATH"),
            [
                "data/House Price Dataset.csv",
                "data/house price dataset.csv",
                "data/house price dateset.csv",
            ],
        )
        self.validation_path = self._resolve_path_with_fallbacks(
            os.getenv("VALIDATION_PATH"),
            [
                "data/Test Data For Prediction.csv",
                "data/test data for prediction.csv",
            ],
        )
        self.model_path = Path(os.getenv("MODEL_PATH", "models/model.joblib"))
        self.meta_path = Path(os.getenv("MODEL_META_PATH", "models/model_meta.json"))
        self.target_column = os.getenv("TARGET_COLUMN", "price")
        drop_columns_raw = os.getenv("DROP_COLUMNS", "id")
        self.drop_columns = [
            col.strip() for col in drop_columns_raw.split(",") if col.strip()
        ]

        self.model: LinearRegression | None = None
        self.feature_names: list[str] = []
        self.metrics: dict[str, float] = {}
        self.trained_at: str = ""
        self.training_source: str = ""

    def initialize(self) -> None:
        if self.model_path.exists() and self.meta_path.exists():
            self._load_artifacts()
            if self._is_loaded_model_compatible():
                return

        artifacts = self._train_model()
        self._save_artifacts(artifacts)
        self.model = artifacts.model
        self.feature_names = artifacts.feature_names
        self.metrics = artifacts.metrics
        self.trained_at = artifacts.trained_at
        self.training_source = artifacts.training_source

    def predict(self, records: list[dict[str, float]]) -> list[float]:
        if self.model is None:
            raise RuntimeError("Model is not initialized.")

        normalized = [self._normalize_record(record) for record in records]
        input_frame = pd.DataFrame(normalized, columns=self.feature_names)
        values = self.model.predict(input_frame)
        return [float(v) for v in values.tolist()]

    def is_ready(self) -> bool:
        return self.model is not None

    def model_info(self) -> dict[str, object]:
        if self.model is None:
            raise RuntimeError("Model is not initialized.")
        

        return {
            "model_type": type(self.model).__name__,
            "feature_names": self.feature_names,
            "coefficients": [float(v) for v in self.model.coef_.tolist()],
            "intercept": float(self.model.intercept_),
            "metrics": self.metrics,
            "trained_at": self.trained_at,
            "training_source": self.training_source,
        }

    def health_details(self) -> dict[str, object]:
        return {
            "dataset_path": str(self.dataset_path),
            "validation_path": str(self.validation_path),
            "model_path": str(self.model_path),
            "meta_path": str(self.meta_path),
            "target_column": self.target_column,
            "drop_columns": self.drop_columns,
            "feature_count": len(self.feature_names),
        }

    def validate_from_csv(self) -> dict[str, object]:
        if not self.validation_path.exists():
            raise ValueError(f"Validation file not found: {self.validation_path}")

        frame = pd.read_csv(self.validation_path)
        feature_frame = self._prepare_feature_frame(frame)
        records = feature_frame.to_dict(orient="records")
        predictions = self.predict(records)

        results: dict[str, object] = {
            "validation_source": str(self.validation_path),
            "row_count": len(predictions),
            "predictions": predictions,
        }

        if self.target_column in frame.columns:
            actual = frame[self.target_column].astype(float).tolist()
            results["actual"] = actual
            results["metrics"] = {
                "r2": float(r2_score(actual, predictions)),
                "rmse": float(np.sqrt(mean_squared_error(actual, predictions))),
                "mae": float(mean_absolute_error(actual, predictions)),
            }

        return results

    def _train_model(self) -> TrainedArtifacts:
        if self.dataset_path.exists():
            frame = pd.read_csv(self.dataset_path)
            if self.target_column not in frame.columns:
                raise ValueError(
                    f"Target column '{self.target_column}' not found in {self.dataset_path}."
                )

            training_frame = frame.drop(columns=self.drop_columns, errors="ignore")
            numeric_columns = training_frame.select_dtypes(include=[np.number]).columns.tolist()
            feature_names = [c for c in numeric_columns if c != self.target_column]
            if not feature_names:
                raise ValueError(
                    "No numeric feature columns found. The dataset must include numeric features."
                )

            clean = training_frame[feature_names + [self.target_column]].dropna().copy()
            x = clean[feature_names]
            y = clean[self.target_column]
            training_source = str(self.dataset_path)
        else:
            # Fallback synthetic data enables running demo environments immediately.
            x_values, y_values = make_regression(
                n_samples=600,
                n_features=8,
                noise=15.0,
                random_state=42,
            )
            feature_names = [f"feature_{index + 1}" for index in range(x_values.shape[1])]
            x = pd.DataFrame(x_values, columns=feature_names)
            y = pd.Series(y_values)
            training_source = "synthetic:sklearn.make_regression"

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.2,
            random_state=42,
        )

        model = LinearRegression()
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)

        metrics = {
            "r2": float(r2_score(y_test, predictions)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
            "mae": float(mean_absolute_error(y_test, predictions)),
        }

        return TrainedArtifacts(
            model=model,
            feature_names=feature_names,
            metrics=metrics,
            trained_at=datetime.now(UTC).isoformat(),
            training_source=training_source,
        )

    def _save_artifacts(self, artifacts: TrainedArtifacts) -> None:
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        self.meta_path.parent.mkdir(parents=True, exist_ok=True)

        joblib.dump(artifacts.model, self.model_path)

        metadata = {
            "feature_names": artifacts.feature_names,
            "metrics": artifacts.metrics,
            "trained_at": artifacts.trained_at,
            "training_source": artifacts.training_source,
        }

        self.meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    def _load_artifacts(self) -> None:
        self.model = joblib.load(self.model_path)

        metadata = json.loads(self.meta_path.read_text(encoding="utf-8"))
        self.feature_names = [str(name) for name in metadata.get("feature_names", [])]
        self.metrics = {str(k): float(v) for k, v in metadata.get("metrics", {}).items()}
        self.trained_at = str(metadata.get("trained_at", ""))
        self.training_source = str(metadata.get("training_source", ""))

    def _normalize_record(self, record: dict[str, float]) -> dict[str, float]:
        missing_features = [name for name in self.feature_names if name not in record]
        if missing_features:
            raise ValueError(
                "Missing required features: " + ", ".join(sorted(missing_features))
            )

        extra_features = [name for name in record if name not in self.feature_names]
        if extra_features:
            raise ValueError(
                "Unexpected features provided: " + ", ".join(sorted(extra_features))
            )

        return {name: float(record[name]) for name in self.feature_names}

    def _prepare_feature_frame(self, frame: pd.DataFrame) -> pd.DataFrame:
        adjusted = frame.drop(columns=self.drop_columns, errors="ignore").copy()
        if self.target_column in adjusted.columns:
            adjusted = adjusted.drop(columns=[self.target_column], errors="ignore")

        missing_features = [name for name in self.feature_names if name not in adjusted.columns]
        if missing_features:
            raise ValueError(
                "Validation file is missing required features: "
                + ", ".join(sorted(missing_features))
            )

        return adjusted[self.feature_names].dropna().copy()

    def _is_loaded_model_compatible(self) -> bool:
        if self.model is None:
            return False

        if not self.dataset_path.exists():
            return True

        expected_source = str(self.dataset_path)
        if self.training_source != expected_source:
            return False

        frame = pd.read_csv(self.dataset_path)
        if self.target_column not in frame.columns:
            return False

        training_frame = frame.drop(columns=self.drop_columns, errors="ignore")
        numeric_columns = training_frame.select_dtypes(include=[np.number]).columns.tolist()
        expected_features = [c for c in numeric_columns if c != self.target_column]
        return self.feature_names == expected_features

    def _resolve_path_with_fallbacks(
        self,
        env_path: str | None,
        fallbacks: list[str],
    ) -> Path:
        if env_path:
            return Path(env_path)

        for item in fallbacks:
            candidate = Path(item)
            if candidate.exists():
                return candidate

        return Path(fallbacks[0])
